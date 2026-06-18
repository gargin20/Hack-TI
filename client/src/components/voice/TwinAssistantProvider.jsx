import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import {
  createGoalFromAssistant,
  deleteGoalFromAssistant,
  getDashboardForAssistant,
  getFinanceForAssistant,
  getFinanceIntegrationForAssistant,
  getGoalsForAssistant,
  getIntegrationStatusForAssistant,
  getSettings,
  processAssistantCommand,
} from '../../services/voiceAssistantService';
import { createDeepgramAssistantStream } from '../../services/deepgramService';
import TwinAssistantButton from './TwinAssistantButton';
import { TwinAssistantContext } from './twinAssistantContext';
import { logoutUser } from '../../features/auth/authThunks';
import { useDashboardSync } from '../../context/DashboardSyncContext';
import { useIntegrations } from '../../context/IntegrationContext';

const VOICE_TOAST_DURATION_MS = 2500;

function voiceToast(message, options = {}) {
  const id = options.id || `voice-${normalizeToastId(message)}`;
  return toast(message, { duration: VOICE_TOAST_DURATION_MS, ...options, id });
}

voiceToast.success = (message, options = {}) => {
  const id = options.id || `voice-${normalizeToastId(message)}`;
  return toast.success(message, { duration: VOICE_TOAST_DURATION_MS, ...options, id });
};

voiceToast.error = (message, options = {}) => {
  const id = options.id || `voice-${normalizeToastId(message)}`;
  return toast.error(message, { duration: VOICE_TOAST_DURATION_MS, ...options, id });
};

export default function TwinAssistantProvider({ children }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { dashboardData } = useDashboardSync();
  const { integrations } = useIntegrations();
  const [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState({
    backgroundListening: true,
    wakeWordDetection: false,
    voiceResponses: false,
  });
  const [assistantState, setAssistantState] = useState('disabled');
  const [assistantMessage, setAssistantMessage] = useState('Ready for commands...');
  const [displayTranscript, setDisplayTranscript] = useState('');
  const [messages, setMessages] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('offline');
  const streamRef = useRef(null);
  const startStreamRef = useRef(null);
  const webSpeechRef = useRef(null);
  const activeProviderRef = useRef('');
  const deepgramUnavailableRef = useRef(false);
  const webSpeechBlockedRef = useRef(false);
  const manuallyPausedRef = useRef(false);
  const providerStartTimeoutRef = useRef(null);
  const providerTranscriptTimeoutRef = useRef(null);
  const webSpeechRestartTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const speakingIgnoreUntilRef = useRef(0);
  const lastAssistantResponseRef = useRef('');
  const processingRef = useRef(false);
  const lastProcessedTranscript = useRef('');
  const lastProcessedAt = useRef(0);
  const transcriptSubmitTimerRef = useRef(null);
  const pendingTranscriptRef = useRef('');
  const handleTranscriptPayloadRef = useRef(null);
  const enabledRef = useRef(false);
  const preferencesRef = useRef(preferences);
  const commandCycleActiveRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const addMessage = useCallback((role, text) => {
    if (!text) return;
    setMessages((currentMessages) => [...currentMessages, { role, text }]);
  }, []);

  const transitionVoiceState = useCallback((nextState) => {
    setAssistantState((currentState) => {
      if (currentState !== nextState) {
        console.log(`[VOICE STATE] ${formatVoiceState(nextState)}`);
      }
      return nextState;
    });
  }, []);

  function clearProviderTimers() {
    window.clearTimeout(providerStartTimeoutRef.current);
    window.clearTimeout(providerTranscriptTimeoutRef.current);
    window.clearTimeout(webSpeechRestartTimerRef.current);
    providerStartTimeoutRef.current = null;
    providerTranscriptTimeoutRef.current = null;
    webSpeechRestartTimerRef.current = null;
  }

  function stopVoiceInput(options = {}) {
    window.clearTimeout(transcriptSubmitTimerRef.current);
    clearProviderTimers();

    try {
      streamRef.current?.stop();
    } catch (error) {
      console.warn('[VOICE ERROR] Deepgram stop failed:', error.message);
    }
    streamRef.current = null;

    try {
      if (webSpeechRef.current) {
        webSpeechRef.current.onend = null;
        webSpeechRef.current.onerror = null;
        webSpeechRef.current.onresult = null;
        webSpeechRef.current.stop?.();
        webSpeechRef.current.abort?.();
      }
    } catch (error) {
      console.warn('[VOICE ERROR] Web Speech stop failed:', error.message);
    }
    webSpeechRef.current = null;
    activeProviderRef.current = '';

    if (!options.keepStatus) {
      setVoiceStatus('offline');
      transitionVoiceState(enabledRef.current ? 'ready_for_next_command' : 'disabled');
    }
  }

  function pauseVoiceInput() {
    window.clearTimeout(transcriptSubmitTimerRef.current);
    clearProviderTimers();

    try {
      streamRef.current?.pauseMicrophone?.();
    } catch (error) {
      console.warn('[VOICE ERROR] Deepgram microphone pause failed:', error.message);
    }

    try {
      if (webSpeechRef.current) {
        webSpeechRef.current.onend = null;
        webSpeechRef.current.onerror = null;
        webSpeechRef.current.onresult = null;
        webSpeechRef.current.stop?.();
        webSpeechRef.current.abort?.();
      }
    } catch (error) {
      console.warn('[VOICE ERROR] Web Speech pause failed:', error.message);
    }
    webSpeechRef.current = null;
    setVoiceStatus('connecting');
  }

  const fallbackToWebSpeech = useCallback((reason = 'Deepgram unavailable') => {
    if (!enabledRef.current || manuallyPausedRef.current || isSpeakingRef.current) return;
    if (activeProviderRef.current === 'web-speech' || webSpeechRef.current) return;

    deepgramUnavailableRef.current = true;
    console.warn('[VOICE] Deepgram unavailable');
    console.warn(`[VOICE] Fallback reason: ${reason}`);
    console.warn('[VOICE] Switching to Web Speech API');
    voiceToast('Fallback Activated');
    setVoiceStatus('connecting');
    setAssistantMessage('Fallback activated. Starting Web Speech API...');

    try {
      streamRef.current?.stop();
    } catch (error) {
      console.warn('[VOICE ERROR] Deepgram fallback stop failed:', error.message);
    }
    streamRef.current = null;
    activeProviderRef.current = '';
    startWebSpeech();
  }, []);

  const restartVoiceInput = useCallback(() => {
    if (!enabledRef.current || !preferencesRef.current.backgroundListening || isSpeakingRef.current || processingRef.current) return;

    window.setTimeout(() => {
      if (!enabledRef.current || !preferencesRef.current.backgroundListening || isSpeakingRef.current || processingRef.current) return;
      console.log('[VOICE] Listening resumed');
      transitionVoiceState('listening');
      setAssistantMessage('Listening...');
      if (streamRef.current?.resumeMicrophone) {
        streamRef.current.resumeMicrophone();
      } else if (!streamRef.current && !webSpeechRef.current) {
        setVoiceStatus('connecting');
        startStreamRef.current?.();
      }
    }, 500);
  }, [transitionVoiceState]);

  const speakAssistantResponse = useCallback((text, options = {}) => {
    const shouldSpeak = options.force || preferences.voiceResponses;
    if (!shouldSpeak || !window.speechSynthesis || !text) {
      return Promise.resolve(false);
    }

    lastAssistantResponseRef.current = normalizeCommandText(text);
    isSpeakingRef.current = true;
    manuallyPausedRef.current = true;
    transitionVoiceState('speaking');
    setAssistantMessage(text);
    console.log('[VOICE] Speech synthesis start');
    pauseVoiceInput();

    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text).replace(/[*_#`]/g, ''));
      utterance.lang = 'en-IN';
      utterance.rate = 0.96;

      const finish = () => {
        isSpeakingRef.current = false;
        speakingIgnoreUntilRef.current = Date.now() + 1500;
        manuallyPausedRef.current = false;
        console.log('[VOICE] TTS finished');
        resolve(true);
      };

      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    });
  }, [preferences.voiceResponses, transitionVoiceState]);

  const getDashboardScoreSnapshot = useCallback(async () => {
    const [dashboardResult, financeResult, integrationResult] = await Promise.allSettled([
      getDashboardForAssistant(),
      getFinanceIntegrationForAssistant(),
      getIntegrationStatusForAssistant(),
    ]);

    return {
      dashboardData: dashboardData || (dashboardResult.status === 'fulfilled' ? dashboardResult.value?.data : null),
      financeData: financeResult.status === 'fulfilled' ? financeResult.value?.data : null,
      integrations: integrations || (integrationResult.status === 'fulfilled' ? integrationResult.value?.data : null),
    };
  }, [dashboardData, integrations]);

  const executeAction = useCallback(async (action) => {
    if (!action) return;

    const responseMessage = getActionProgressMessage(action);
    console.log(`[VOICE] Intent: ${getIntentLogLabel(action)}`);
    lastAssistantResponseRef.current = normalizeCommandText(responseMessage);
    transitionVoiceState('executing');
    console.log('[VOICE] Executing command');
    setAssistantMessage(responseMessage);
    addMessage('assistant', responseMessage);

    if (action.action === 'navigate' && action.target) {
      try {
        console.log('[VOICE] Navigation execution:', action.target);
        navigate(action.target, action.options || undefined);
        voiceToast('Navigation Complete');
        console.log('[VOICE] Navigation complete');
      } catch (error) {
        console.error('[VOICE ERROR] Navigation failed:', error.message);
      }
      await speakAssistantResponse(responseMessage, { force: true });
      return;
    }

    if (action.action === 'refresh_dashboard') {
      try {
        console.log('[VOICE] Refresh Dashboard');
        navigate('/dashboard/', { state: { assistantRefreshAt: Date.now() } });
        window.dispatchEvent(new Event('dashboard-refresh-requested'));
        voiceToast('Navigation Complete');
        console.log('[VOICE] Navigation complete');
      } catch (error) {
        console.error('[VOICE ERROR] Navigation failed:', error.message);
      }
      await speakAssistantResponse(responseMessage, { force: true });
      return;
    }

    if (action.action === 'create_goal') {
      try {
        const result = await createGoalFromAssistant(action);
        const createdGoal = result?.data || {};
        const createdTitle = createdGoal.title || action.title || 'your goal';
        const createdResponse = `Created goal: ${createdTitle}.`;
        setAssistantMessage(createdResponse);
        addMessage('assistant', createdResponse);
        lastAssistantResponseRef.current = normalizeCommandText(createdResponse);
        window.dispatchEvent(new Event('goals-updated'));
        window.dispatchEvent(new Event('gamification-updated'));
        navigate('/goals/');
        voiceToast.success('Goal Created');
        console.log('[VOICE] Navigation complete');
        await speakAssistantResponse(createdResponse, { force: true });
      } catch (error) {
        const errorResponse = error.response?.data?.message || 'I could not create that goal. Please try again with a title and target.';
        setAssistantMessage(errorResponse);
        addMessage('assistant', errorResponse);
        lastAssistantResponseRef.current = normalizeCommandText(errorResponse);
        voiceToast.error('Goal creation failed');
        await speakAssistantResponse(errorResponse, { force: true });
      }
      return;
    }

    if (action.action === 'run_simulation') {
      const simulationResponse = 'Opening Simulation and running your what-if scenario...';
      setAssistantMessage(simulationResponse);
      addMessage('assistant', simulationResponse);
      lastAssistantResponseRef.current = normalizeCommandText(simulationResponse);
      navigate('/simulation/', { state: { assistantSimulation: action.payload || {} } });
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse(simulationResponse, { force: true });
      return;
    }

    if (action.action === 'delete_goal') {
      const deleteResponse = await deleteMatchingGoal(action.query);
      setAssistantMessage(deleteResponse);
      addMessage('assistant', deleteResponse);
      lastAssistantResponseRef.current = normalizeCommandText(deleteResponse);
      if (deleteResponse.startsWith('Deleted goal')) navigate('/goals/');
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse(deleteResponse, { force: true });
      return;
    }

    if (action.action === 'answer_health_score') {
      const snapshot = await getDashboardScoreSnapshot();
      const healthResponse = formatDashboardHealthResponse(snapshot);
      setAssistantMessage(healthResponse);
      addMessage('assistant', healthResponse);
      lastAssistantResponseRef.current = normalizeCommandText(healthResponse);
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse(healthResponse, { force: true });
      return;
    }

    if (action.action === 'answer_dashboard_metric') {
      const snapshot = await getDashboardScoreSnapshot();
      const metricResponse = formatDashboardMetricResponse(snapshot, action.metric);
      setAssistantMessage(metricResponse);
      addMessage('assistant', metricResponse);
      lastAssistantResponseRef.current = normalizeCommandText(metricResponse);
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse(metricResponse, { force: true });
      return;
    }

    if (action.action === 'answer_savings') {
      const result = await getFinanceForAssistant();
      const savingsResponse = formatSavingsResponse(result);
      setAssistantMessage(savingsResponse);
      addMessage('assistant', savingsResponse);
      lastAssistantResponseRef.current = normalizeCommandText(savingsResponse);
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse(savingsResponse, { force: true });
      return;
    }

    if (action.action === 'logout') {
      await dispatch(logoutUser());
      navigate('/', { replace: true });
      console.log('[VOICE] Navigation complete');
      await speakAssistantResponse('Logging out. Please wait while I complete your request.', { force: true });
    }
  }, [addMessage, dispatch, getDashboardScoreSnapshot, navigate, speakAssistantResponse, transitionVoiceState]);

  const submitTranscript = useCallback(async (spokenText) => {
    const command = String(spokenText || '').trim();
    const commandKey = normalizeCommandText(command);
    const now = Date.now();

    if (isIncompleteVoiceCommand(commandKey)) {
      console.log('[Twin Assistant] Incomplete transcript ignored:', command);
      transitionVoiceState('listening');
      setAssistantMessage('Listening...');
      return;
    }

    pendingTranscriptRef.current = '';

    if (!command || processingRef.current || (commandKey === lastProcessedTranscript.current && now - lastProcessedAt.current < 3000)) {
      if (commandKey === lastProcessedTranscript.current) {
        console.log('[Twin Assistant] Duplicate transcript ignored:', command);
      }
      return;
    }

    pauseVoiceInput();
    console.log(`[VOICE] Transcript: ${command}`);
    console.log('[VOICE] Command received');
    console.log('[VOICE] Listening paused');
    voiceToast('Command Detected');
    processingRef.current = true;
    commandCycleActiveRef.current = true;
    console.log('[VOICE] Processing');
    lastProcessedTranscript.current = commandKey;
    lastProcessedAt.current = now;
    transitionVoiceState('processing');
    setAssistantMessage('Processing command...');
    setDisplayTranscript(command);
    addMessage('user', command);

    try {
      let action = parseLocalAssistantCommand(command);
      if (action) {
        console.log(`[VOICE] Intent: ${getIntentLogLabel(action)}`);
      } else {
        console.log('[VOICE] Sending command to backend parser');
        action = await processAssistantCommand(command);
      }
      console.log('[VOICE] Parsed action:', action);
      if (!action || action.action === 'unknown') {
        console.error('[VOICE ERROR] No intent detected');
      }
      await executeAction(action);
      transitionVoiceState('ready_for_next_command');
      setAssistantMessage('Request completed. You may give your next command.');
      await speakAssistantResponse('Request completed. You may give your next command.', { force: true });
    } catch (error) {
      const errorMessage = error.response?.data?.response || error.response?.data?.message || 'I could not process that command.';
      console.error('[VOICE ERROR] Intent execution error:', errorMessage);
      transitionVoiceState('speaking');
      setAssistantMessage(errorMessage);
      addMessage('assistant', errorMessage);
      await speakAssistantResponse(errorMessage, { force: true });
    } finally {
      processingRef.current = false;
      commandCycleActiveRef.current = false;
      if (enabled) {
        transitionVoiceState('ready_for_next_command');
        setAssistantMessage('Ready for commands...');
        setDisplayTranscript('');
        restartVoiceInput();
      }
    }
  }, [addMessage, enabled, executeAction, restartVoiceInput, speakAssistantResponse, transitionVoiceState]);

  const handleTranscriptPayload = useCallback(({ transcript, isFinal, speechFinal, source = 'voice' }) => {
    const liveText = transcript || '';
    const normalizedTranscript = normalizeCommandText(liveText);

    if (isSpeakingRef.current || Date.now() < speakingIgnoreUntilRef.current) {
      console.log('[VOICE] Ignored transcript while speaking');
      return;
    }

    if (isAssistantEcho(normalizedTranscript, lastAssistantResponseRef.current)) {
      console.log('[VOICE] Ignored assistant echo:', liveText);
      return;
    }

    if (!enabled || processingRef.current || commandCycleActiveRef.current) {
      return;
    }

    if (!liveText.trim()) return;
    const previousPending = pendingTranscriptRef.current;
    const nextPending = chooseBestTranscript(previousPending, liveText);
    pendingTranscriptRef.current = nextPending;

    window.clearTimeout(providerTranscriptTimeoutRef.current);
    console.log(`[VOICE] Provider: ${source === 'deepgram' ? 'Deepgram' : source === 'web-speech' ? 'Web Speech API' : source}`);
    console.log(`[VOICE] Transcript: ${liveText}`);
    setPanelOpen(true);
    setDisplayTranscript(liveText);
    transitionVoiceState('listening');
    setAssistantMessage('Listening...');

    window.clearTimeout(transcriptSubmitTimerRef.current);
    if (isFinal || speechFinal) {
      const commandToSubmit = isIncompleteVoiceCommand(normalizedTranscript)
        ? pendingTranscriptRef.current
        : liveText;
      if (isIncompleteVoiceCommand(normalizeCommandText(commandToSubmit))) {
        console.log('[Twin Assistant] Waiting for complete final command:', commandToSubmit);
        return;
      }
      pauseVoiceInput();
      submitTranscript(commandToSubmit);
    } else {
      transcriptSubmitTimerRef.current = window.setTimeout(() => {
        const commandToSubmit = pendingTranscriptRef.current || liveText;
        if (isIncompleteVoiceCommand(normalizeCommandText(commandToSubmit))) {
          console.log('[Twin Assistant] Waiting for complete command:', commandToSubmit);
          return;
        }
        pauseVoiceInput();
        submitTranscript(commandToSubmit);
      }, 900);
    }
  }, [enabled, submitTranscript]);

  useEffect(() => {
    handleTranscriptPayloadRef.current = handleTranscriptPayload;
  }, [handleTranscriptPayload]);

  function startWebSpeech() {
    if (!enabledRef.current || webSpeechRef.current || isSpeakingRef.current || manuallyPausedRef.current) return;
    if (webSpeechBlockedRef.current) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('[VOICE] Web Speech API unavailable');
      console.error('[VOICE ERROR] SpeechRecognition unavailable');
      voiceToast.error('Voice recognition unavailable');
      setVoiceStatus('error');
      transitionVoiceState('disabled');
      setAssistantMessage('Voice recognition unavailable');
      return;
    }

    try {
      console.log('[VOICE] Provider selection: Web Speech API');
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      activeProviderRef.current = 'web-speech';
      webSpeechRef.current = recognition;

      recognition.onstart = () => {
        if (!enabledRef.current) return;
        console.log('[VOICE] Listening...');
        console.log('[VOICE] Provider: Web Speech API');
        setVoiceStatus('listening');
        transitionVoiceState('listening');
        setAssistantMessage('Listening...');
        voiceToast('Listening Started');
      };

      recognition.onresult = (event) => {
        if (isSpeakingRef.current || processingRef.current) return;
        let transcript = '';
        let isFinal = false;

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          transcript += event.results[index][0]?.transcript || '';
          isFinal = isFinal || Boolean(event.results[index].isFinal);
        }

        if (transcript.trim()) {
          handleTranscriptPayloadRef.current?.({
            transcript: transcript.trim(),
            isFinal,
            speechFinal: isFinal,
            source: 'web-speech',
          });
        }
      };

      recognition.onerror = (event) => {
        const message = event?.error || 'SpeechRecognition error';
        console.error('[VOICE ERROR] Web Speech API failed:', message);
        if (message === 'not-allowed' || message === 'service-not-allowed') {
          console.error('[VOICE ERROR] Permission denied');
          webSpeechBlockedRef.current = true;
          voiceToast.error('Voice recognition unavailable');
        }
        setVoiceStatus('error');
        voiceToast.error('Speech Recognition Failed');
      };

      recognition.onend = () => {
        webSpeechRef.current = null;
        if (!enabledRef.current || webSpeechBlockedRef.current || manuallyPausedRef.current || isSpeakingRef.current || processingRef.current) return;
        console.log('[VOICE] Web Speech ended; restarting listener');
        webSpeechRestartTimerRef.current = window.setTimeout(() => startWebSpeech(), 500);
      };

      recognition.start();
    } catch (error) {
      console.error('[VOICE ERROR] Web Speech API unavailable:', error.message);
      voiceToast.error('Voice recognition unavailable');
      setVoiceStatus('error');
      transitionVoiceState('disabled');
      setAssistantMessage('Voice recognition unavailable');
    }
  }

  function startDeepgram() {
    if (!enabledRef.current || streamRef.current || isSpeakingRef.current || manuallyPausedRef.current) return;

    console.log('[VOICE] Provider selection: Deepgram');
    console.log('[VOICE] Starting Deepgram listener');
    activeProviderRef.current = 'deepgram';
    setVoiceStatus('connecting');

    providerStartTimeoutRef.current = window.setTimeout(() => {
      if (activeProviderRef.current === 'deepgram' && !manuallyPausedRef.current) {
        console.warn('[VOICE ERROR] Deepgram timeout');
        fallbackToWebSpeech('Deepgram timeout');
      }
    }, 8000);

    streamRef.current = createDeepgramAssistantStream({
      onStatus: (status) => {
        if (!enabledRef.current || isSpeakingRef.current || processingRef.current) return;
        console.log(`[VOICE] Deepgram status: ${status}`);
        setVoiceStatus(status);
      },
      onListening: (active) => {
        if (!enabledRef.current) return;
        window.clearTimeout(providerStartTimeoutRef.current);
        if (!active) return;
        console.log('[VOICE] Listening...');
        console.log('[VOICE] Provider: Deepgram');
        transitionVoiceState('listening');
        setAssistantMessage('Listening...');
        if (active) {
          voiceToast('Listening Started');
        }
      },
      onTranscript: ({ transcript, isFinal, speechFinal }) => {
        handleTranscriptPayloadRef.current?.({ transcript, isFinal, speechFinal, source: 'deepgram' });
      },
      onError: (message) => {
        console.error('[VOICE ERROR] Deepgram unavailable:', message || 'Deepgram assistant error');
        if (String(message || '').toLowerCase().includes('permission')) {
          console.error('[VOICE ERROR] Permission denied');
        }
        fallbackToWebSpeech(message || 'Deepgram assistant error');
      },
    });

    streamRef.current.start();
  }

  const stopStream = useCallback(() => {
    stopVoiceInput();
  }, []);

  const startStream = useCallback(() => {
    if (!enabledRef.current || streamRef.current || webSpeechRef.current) return;

    console.log('[VOICE] Starting listeners');
    setPanelOpen(true);
    transitionVoiceState('ready_for_next_command');
    setAssistantMessage('Ready for commands...');
    setVoiceStatus('connecting');

    if (deepgramUnavailableRef.current) {
      startWebSpeech();
      return;
    }

    startDeepgram();
  }, [fallbackToWebSpeech, handleTranscriptPayload, transitionVoiceState]);

  useEffect(() => {
    startStreamRef.current = startStream;
  }, [startStream]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await getSettings();
      const wasEnabled = enabledRef.current;
      const nextEnabled = Boolean(settings.twinAssistantEnabled);
      const nextPreferences = {
        backgroundListening: settings.twinAssistantPreferences?.backgroundListening ?? true,
        wakeWordDetection: settings.twinAssistantPreferences?.wakeWordDetection ?? false,
        voiceResponses: settings.twinAssistantPreferences?.voiceResponses ?? false,
      };
      enabledRef.current = nextEnabled;
      preferencesRef.current = nextPreferences;
      setEnabled(nextEnabled);
      setPreferences(nextPreferences);
      setPanelOpen(nextEnabled);
      setVoiceStatus(nextEnabled ? 'connecting' : 'offline');
      transitionVoiceState(nextEnabled ? 'ready_for_next_command' : 'disabled');
      setAssistantMessage(nextEnabled ? 'Voice Assistant activated. Waiting for your command.' : 'Twin Assistant is disabled. Enable it in Settings.');
      if (nextEnabled) {
        console.log('[VOICE] Assistant enabled');
        voiceToast.success('Voice Assistant Enabled');
        if (!wasEnabled && nextPreferences.backgroundListening) {
          await speakAssistantResponse('Voice Assistant activated. Waiting for your command.', { force: true });
          restartVoiceInput();
        }
      } else {
        console.log('[VOICE] Assistant disabled');
        stopStream();
      }
      if (!nextPreferences.backgroundListening) stopStream();
    } catch (error) {
      console.error('[VOICE ERROR] Settings load failed:', error.response?.data?.message || error.message);
      setEnabled(false);
      transitionVoiceState('disabled');
      setAssistantMessage('Twin Assistant is disabled. Enable it in Settings.');
      setVoiceStatus('offline');
      stopStream();
    }
  }, [restartVoiceInput, speakAssistantResponse, stopStream, transitionVoiceState]);

  useEffect(() => {
    Promise.resolve().then(loadSettings);
    window.addEventListener('twin-assistant-settings-updated', loadSettings);
    return () => window.removeEventListener('twin-assistant-settings-updated', loadSettings);
  }, [loadSettings]);

  useEffect(() => {
    if (enabled && preferences.backgroundListening) startStream();
    return undefined;
  }, [enabled, preferences.backgroundListening, startStream]);

  useEffect(() => {
    if (!enabled || !preferences.backgroundListening) return undefined;

    const monitor = window.setInterval(() => {
      const inputInactive = !streamRef.current && !webSpeechRef.current;
      if (inputInactive && !processingRef.current && !isSpeakingRef.current) {
        console.warn('[VOICE] Voice input inactive. Connecting listener.');
        setVoiceStatus('connecting');
        startStreamRef.current?.();
      }
    }, 2500);

    return () => window.clearInterval(monitor);
  }, [enabled, preferences.backgroundListening]);

  useEffect(() => () => stopStream(), [stopStream]);

  const toggleListening = useCallback(() => {
    setPanelOpen(true);
    if (!enabled) {
      setAssistantMessage('Twin Assistant is disabled. Enable it in Settings.');
      return;
    }
    if (!streamRef.current) startStream();
  }, [enabled, startStream]);

  const retryConnection = useCallback(() => {
    setPanelOpen(true);
    if (!enabled) return;
    stopStream();
    webSpeechBlockedRef.current = false;
    deepgramUnavailableRef.current = false;
    transitionVoiceState('ready_for_next_command');
    setAssistantMessage('Connecting voice...');
    setVoiceStatus('connecting');
    window.setTimeout(() => startStreamRef.current?.(), 200);
  }, [enabled, stopStream, transitionVoiceState]);

  const submitTextCommand = useCallback((command) => submitTranscript(command), [submitTranscript]);

  const value = useMemo(() => ({
    enabled,
    transcript: displayTranscript,
    speechActive: assistantState === 'listening' && Boolean(displayTranscript.trim()),
    messages,
    assistantState,
    assistantMessage,
    voiceStatus,
    panelOpen,
    setPanelOpen,
    toggleListening,
    retryConnection,
    submitTextCommand,
  }), [assistantMessage, assistantState, displayTranscript, enabled, messages, panelOpen, retryConnection, submitTextCommand, toggleListening, voiceStatus]);

  return (
    <TwinAssistantContext.Provider value={value}>
      {children}
      <Toaster position="top-right" />
      <TwinAssistantButton />
    </TwinAssistantContext.Provider>
  );
}

function formatVoiceState(state) {
  return String(state || '').toUpperCase();
}

function getActionProgressMessage(action = {}) {
  if (action.action === 'navigate' && action.target) {
    const page = action.label || getNavigationLogLabel(action.target).toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
    return `Opening ${page}. Please wait while I complete your request.`;
  }

  if (action.action === 'refresh_dashboard') {
    return 'Opening Dashboard. Please wait while I complete your request.';
  }

  return action.response || action.message || 'Working on it. Please wait while I complete your request.';
}

function getNavigationLogLabel(target) {
  const page = String(target || '').replace('/', '').replace(/-/g, ' ').trim() || 'PAGE';
  return page.toUpperCase();
}

function getIntentLogLabel(action = {}) {
  if (action.intent) return String(action.intent).toUpperCase();
  if (action.action === 'navigate') return `NAVIGATE_${getNavigationLogLabel(action.target).replace(/\s+/g, '_')}`;
  return String(action.action || 'UNKNOWN').toUpperCase();
}

function parseLocalAssistantCommand(rawCommand = '') {
  const command = normalizeCommandText(rawCommand);
  if (!command) return null;

  const navigationTargets = [
    { intent: 'NAVIGATE_DASHBOARD', label: 'Dashboard', target: '/dashboard/', patterns: ['dashboard', 'home'] },
    { intent: 'NAVIGATE_HEALTH', label: 'Health', target: '/health/', patterns: ['health'] },
    { intent: 'NAVIGATE_FINANCE', label: 'Finance', target: '/finance/', patterns: ['finance', 'financial', 'money'] },
    { intent: 'NAVIGATE_CAREER', label: 'Career', target: '/career/', patterns: ['career', 'job', 'work'] },
    { intent: 'NAVIGATE_GOALS', label: 'Goals', target: '/goals/', patterns: ['goals', 'goal'] },
    { intent: 'NAVIGATE_INTELLIGENCE', label: 'Intelligence', target: '/intelligence/', patterns: ['intelligence', 'ai intelligence', 'insights'] },
    { intent: 'NAVIGATE_TWIN_COPILOT', label: 'Twin Copilot', target: '/copilot/', patterns: ['copilot', 'co pilot', 'twin copilot', 'twin co pilot', 'twin assistant'] },
    { intent: 'NAVIGATE_SIMULATION', label: 'Simulation', target: '/simulation/', patterns: ['simulation', 'simulator'] },
    { intent: 'NAVIGATE_NOTIFICATIONS', label: 'Notifications', target: '/notifications/', patterns: ['notifications', 'notification', 'alerts'] },
    { intent: 'NAVIGATE_SETTINGS', label: 'Settings', target: '/settings/', patterns: ['settings', 'setting', 'preferences'] },
  ];

  if (/\b(log out|logout|sign out)\b/.test(command)) {
    return {
      action: 'logout',
      intent: 'LOGOUT',
      response: 'Logging out...',
    };
  }

  if (/\b(generate|create|open|start)\b.*\bdaily update\b|\bdaily update\b.*\b(generate|create|open|start)\b/.test(command)) {
    return {
      action: 'navigate',
      intent: 'GENERATE_DAILY_UPDATE',
      target: '/daily-update/',
      response: 'Opening Daily Update...',
    };
  }

  if (/\b(start|run|open)\b.*\bsimulation\b|\bsimulation\b.*\b(start|run|open)\b/.test(command)) {
    return {
      action: 'navigate',
      intent: 'START_SIMULATION',
      target: '/simulation/',
      response: 'Opening Simulation...',
    };
  }

  if (/\b(refresh|reload|sync)\b.*\bdashboard\b|\bdashboard\b.*\b(refresh|reload|sync)\b/.test(command)) {
    return {
      action: 'refresh_dashboard',
      intent: 'REFRESH_DASHBOARD',
      response: 'Refreshing Dashboard...',
    };
  }

  const goalAction = parseGoalCommand(command);
  if (goalAction) return goalAction;

  const navigationVerb = /\b(open|go to|show|navigate to|take me to|launch|switch to|visit)\b/.test(command);
  for (const item of navigationTargets) {
    const matched = item.patterns.some((pattern) => command === pattern || command.includes(pattern));
    if (matched && (navigationVerb || command.split(' ').length <= 3)) {
      return {
        action: 'navigate',
        intent: item.intent,
        target: item.target,
        response: `Opening ${item.label}...`,
      };
    }
  }

  return null;
}

async function deleteMatchingGoal(query) {
  const cleanQuery = normalizeText(query);
  if (!cleanQuery) return 'Please say the goal name you want me to delete.';

  const response = await getGoalsForAssistant();
  const goals = response?.data || [];
  if (!goals.length) return 'You do not have any goals to delete yet.';

  const rankedGoals = goals
    .map((goal) => ({ goal, score: scoreGoalMatch(cleanQuery, normalizeText(goal.title)) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!rankedGoals.length) {
    return `I could not find a goal matching "${query}".`;
  }

  const bestMatch = rankedGoals[0].goal;
  await deleteGoalFromAssistant(bestMatch._id);
  return `Deleted goal: ${bestMatch.title}.`;
}

function parseGoalCommand(command) {
  const match = command.match(/\b(?:create|add|set|make)\s+(?:me\s+|my\s+)?(?:a\s+|an\s+)?(?:new\s+)?goal(?:\s+(?:to|for|called|named|about))?\s+(.+)$/);
  if (!match?.[1]) return null;

  const rawTitle = cleanGoalTitle(match[1]);
  if (!rawTitle) return null;

  const amount = parseGoalAmount(command);
  const domain = inferGoalDomain(command);
  const unit = inferGoalUnit(command, domain, amount);
  const title = toTitleCase(rawTitle);

  return {
    action: 'create_goal',
    intent: 'CREATE_GOAL',
    title,
    domain,
    targetMetric: amount || 1,
    unit,
    priority: inferGoalPriority(command),
    deadline: getFutureDate(90),
    description: `Created by Twin Assistant from: "${command}"`,
    response: `Creating goal: ${title}...`,
  };
}

function cleanGoalTitle(value = '') {
  return String(value)
    .replace(/\b(please|now|today)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(value = '') {
  return String(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferGoalDomain(command) {
  if (/\b(save|saving|rupee|rupees|rs|inr|lakh|money|finance|invest|sip|budget|spend)\b/.test(command)) return 'finance';
  if (/\b(health|fitness|sleep|workout|exercise|weight|kg|water|run|walk)\b/.test(command)) return 'health';
  return 'career';
}

function inferGoalUnit(command, domain, amount) {
  if (/\bleetcode|problem|problems\b/.test(command)) return 'problems';
  if (/\bproject|projects\b/.test(command)) return 'projects';
  if (/\bbook|books\b/.test(command)) return 'books';
  if (/\bhour|hours\b/.test(command)) return 'hours';
  if (/\bkg|weight\b/.test(command)) return 'kg';
  if (/\bkm|kilometer|kilometers\b/.test(command)) return 'km';
  if (/\bliter|liters|litre|litres|water\b/.test(command)) return 'liters';
  if (domain === 'finance' && amount) return 'Rs';
  return 'milestone';
}

function inferGoalPriority(command) {
  if (/\b(urgent|important|high priority|critical)\b/.test(command)) return 'high';
  if (/\b(low priority|someday)\b/.test(command)) return 'low';
  return 'medium';
}

function parseGoalAmount(command) {
  const lakhMatch = command.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (lakhMatch) return Number(lakhMatch[1]) * 100000;

  const numberMatch = command.match(/(?:rs|rupees|inr)?\s*(\d+(?:\.\d+)?)/);
  return numberMatch ? Number(numberMatch[1]) : null;
}

function getFutureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function scoreGoalMatch(query, title) {
  if (!query || !title) return 0;
  if (query === title) return 100;
  if (title.includes(query) || query.includes(title)) return 80;

  const queryWords = query.split(' ').filter((word) => word.length > 2);
  const titleWords = title.split(' ').filter((word) => word.length > 2);
  if (!queryWords.length || !titleWords.length) return 0;

  return queryWords.reduce((score, queryWord) => {
    const matched = titleWords.some((titleWord) =>
      titleWord === queryWord || titleWord.includes(queryWord) || queryWord.includes(titleWord) || levenshteinDistance(queryWord, titleWord) <= 2,
    );
    return score + (matched ? 10 : 0);
  }, 0);
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeCommandText(value) {
  return normalizeText(value);
}

function chooseBestTranscript(previous = '', next = '') {
  const previousText = String(previous || '').trim();
  const nextText = String(next || '').trim();
  if (!previousText) return nextText;
  if (!nextText) return previousText;

  const previousCommand = normalizeCommandText(previousText);
  const nextCommand = normalizeCommandText(nextText);
  if (isIncompleteVoiceCommand(nextCommand) && !isIncompleteVoiceCommand(previousCommand)) {
    return previousText;
  }
  if (nextCommand.length >= previousCommand.length) return nextText;
  return previousText;
}

function normalizeToastId(value) {
  return String(value || 'message').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'message';
}

function isIncompleteVoiceCommand(command) {
  if (!command) return true;
  if (command.length < 3) return true;
  return /^(open|go|go to|show|delete|remove|create|add|run|start|simulate|what|what if|tell|tell me|check)$/.test(command);
}

function isAssistantEcho(transcript, assistantResponse) {
  if (!transcript || !assistantResponse) return false;
  if (transcript === assistantResponse) return true;
  if (assistantResponse.includes(transcript) && transcript.length >= 8) return true;
  if (transcript.includes(assistantResponse) && assistantResponse.length >= 8) return true;

  const transcriptWords = transcript.split(' ').filter((word) => word.length > 2);
  const responseWords = assistantResponse.split(' ').filter((word) => word.length > 2);
  if (!transcriptWords.length || !responseWords.length) return false;

  const matchedWords = transcriptWords.filter((word) =>
    responseWords.some((responseWord) =>
      responseWord === word || responseWord.includes(word) || word.includes(responseWord) || levenshteinDistance(word, responseWord) <= 1,
    ),
  );

  return matchedWords.length / transcriptWords.length >= 0.75;
}

function levenshteinDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }

  return rows[a.length][b.length];
}

function formatDashboardHealthResponse(result) {
  const metrics = getDashboardMetrics(result);
  return Number.isFinite(metrics.healthScore)
    ? `Your current health score is ${metrics.healthScore}%.`
    : 'I checked your dashboard data, but I could not find your current health score yet.';
}

function formatDashboardMetricResponse(result, metric) {
  const metrics = getDashboardMetrics(result);
  if (metric === 'healthScore' && Number.isFinite(metrics.healthScore)) return `Your current health score is ${metrics.healthScore}%.`;
  if (metric === 'financeScore' && Number.isFinite(metrics.financeScore)) return `Your current finance score is ${metrics.financeScore}%.`;
  if (metric === 'careerScore' && Number.isFinite(metrics.careerScore)) return `Your current career score is ${metrics.careerScore}%.`;
  if (metric === 'productivityScore' && Number.isFinite(metrics.productivityScore)) return `Your current productivity score is ${metrics.productivityScore}%.`;
  if (metric === 'savingsRate' && Number.isFinite(metrics.savingsRate)) return `Your current savings rate is ${metrics.savingsRate}%.`;
  return 'I checked your dashboard data, but I could not find that metric yet.';
}

function getDashboardMetrics(result) {
  const dashboard = result?.dashboardData || result?.data || {};
  const liveFinanceData = result?.financeData || null;
  const liveIntegrations = result?.integrations || null;
  const rawProfile = dashboard.profile || {};
  const profile = normalizeDashboardProfile(rawProfile);
  const analytics = dashboard.analytics || profile.aiScores || {};

  const sleepHours = pickNumber(profile.lifestyle.sleepHours, 7);
  const studyHours = pickNumber(profile.lifestyle.studyHours, 4);
  const exerciseFrequency = pickNumber(profile.lifestyle.exerciseFrequency, 2);
  const stressLevel = pickNumber(profile.financialPatterns.financialStressLevel, 4);
  const liveIncome = Number(liveFinanceData?.totalSalary);
  const liveExpenditure = Number(liveFinanceData?.monthlyExpenses);
  const income = Number.isFinite(liveIncome) && liveIncome > 0
    ? liveIncome
    : pickNumber(profile.financialPatterns.monthlyIncome, 0);
  const expenditure = Number.isFinite(liveExpenditure) && liveExpenditure >= 0
    ? liveExpenditure
    : pickNumber(profile.financialPatterns.monthlyExpenditure, 0);
  const rawSavingsRate = income > 0 ? Math.round(((income - expenditure) / income) * 100) : 0;
  const integrationSnapshot = liveIntegrations || profile.integrations || {};
  const connectedCount = Object.values(integrationSnapshot).filter((item) => item?.status === 'connected').length;
  const hasGithub = integrationSnapshot.github?.status === 'connected';
  const hasLeetcode = integrationSnapshot.leetcode?.status === 'connected';
  const smokingHabit = profile.lifestyle.smokingHabits || 'no';
  const gender = profile.lifestyle.gender || '';
  const genderThresholds = getGenderThresholds(gender);
  const periodLoad = gender === 'female' && profile.lifestyle.periodTracking === 'irregular' ? 5 : 0;
  const maleCredit = gender === 'male' && profile.lifestyle.genderSpecificHealthContext !== 'not_now' && exerciseFrequency >= 3 ? 3 : 0;

  const calcBurnout = clamp(Math.round(
    42
      + Math.max(0, genderThresholds.idealSleepHours - sleepHours) * 8
      + Math.max(0, studyHours - genderThresholds.heavyStudyHours) * 5
      + stressLevel * 2
      - exerciseFrequency * 3
      + (smokingHabit === 'yes' ? 8 : 0)
      + periodLoad
      - maleCredit,
  ), 18, 95);
  const calcProductivity = clamp(Math.round(
    58
      + studyHours * 5
      + connectedCount * 3
      + (hasGithub ? 4 : 0)
      + (hasLeetcode ? 3 : 0)
      - Math.max(0, genderThresholds.idealSleepHours - sleepHours) * 3
      - Math.max(0, stressLevel - 6) * 3,
  ), 30, 98);
  const calcRecovery = clamp(Math.round(
    54
      + sleepHours * 4
      + exerciseFrequency * genderThresholds.exerciseWeight
      - stressLevel * 3
      - (smokingHabit === 'yes' ? 10 : 0)
      - periodLoad,
  ), 18, 96);
  const calcFinance = clamp(Math.round(
    50 + rawSavingsRate * 0.8 - stressLevel * 2 - (expenditure > income && income > 0 ? 18 : 0),
  ), 8, 98);

  const burnoutRisk = clamp(pickNumber(analytics.burnoutRisk, profile.aiScores.burnoutRisk, calcBurnout), 0, 100);
  const wellnessBalance = clamp(pickNumber(analytics.wellnessBalance, profile.aiScores.wellnessBalance, calcRecovery), 0, 100);
  const productivityScore = clamp(pickNumber(analytics.productivityScore, profile.aiScores.productivityScore, calcProductivity), 0, 100);
  const financeScore = clamp(pickNumber(analytics.financialHealth, profile.aiScores.financialHealth, calcFinance), 0, 100);

  return {
    healthScore: Number.isFinite(burnoutRisk) && Number.isFinite(wellnessBalance)
      ? clamp(Math.round((100 - burnoutRisk) * 0.35 + wellnessBalance * 0.65), 35, 96)
      : NaN,
    financeScore: Number.isFinite(financeScore) ? clamp(Math.round(financeScore), 0, 100) : NaN,
    careerScore: Number.isFinite(productivityScore) ? clamp(Math.round(productivityScore), 0, 100) : NaN,
    productivityScore: Number.isFinite(productivityScore) ? clamp(Math.round(productivityScore), 0, 100) : NaN,
    savingsRate: income > 0 ? Math.max(0, Math.round(((income - expenditure) / income) * 100)) : NaN,
  };
}

function normalizeDashboardProfile(rawProfile = {}) {
  if (rawProfile.lifestyle && rawProfile.financialPatterns) {
    return {
      ...rawProfile,
      aiScores: rawProfile.aiScores || {},
    };
  }

  return {
    integrations: {
      github: { status: rawProfile.githubUsername ? 'connected' : 'skipped' },
      leetcode: { status: rawProfile.leetcodeUsername ? 'connected' : 'skipped' },
      fitbit: { status: rawProfile.fitbitProfile ? 'connected' : 'skipped' },
      linkedin: { status: rawProfile.linkedinProfile ? 'connected' : 'skipped' },
      banking: { status: rawProfile.bankingProfile ? 'connected' : 'skipped' },
    },
    lifestyle: {
      gender: rawProfile.gender || '',
      sleepHours: rawProfile.sleepHours ?? 7,
      studyHours: rawProfile.studyHours ?? 4,
      exerciseFrequency: rawProfile.exerciseFrequency ?? 2,
      smokingHabits: rawProfile.smokingHabit || 'no',
      periodTracking: rawProfile.periodTracking || 'not_now',
      genderSpecificHealthContext: rawProfile.genderSpecificHealthContext || 'not_now',
    },
    financialPatterns: {
      monthlyIncome: rawProfile.monthlyIncome ?? 0,
      monthlyExpenditure: rawProfile.monthlyExpenditure ?? 0,
      financialStressLevel: rawProfile.financialStressLevel ?? 5,
    },
    aiScores: {
      burnoutRisk: rawProfile.burnoutRisk,
      productivityScore: rawProfile.productivityScore,
      financialHealth: rawProfile.financialHealth,
      wellnessBalance: rawProfile.wellnessBalance,
    },
  };
}

function getGenderThresholds(gender) {
  if (gender === 'female') {
    return { idealSleepHours: 7.5, heavyStudyHours: 6, exerciseWeight: 5.5 };
  }
  return { idealSleepHours: 7, heavyStudyHours: 7, exerciseWeight: 6 };
}

function pickNumber(...values) {
  const value = values.find((item) => Number.isFinite(Number(item)));
  return value === undefined ? NaN : Number(value);
}

function formatSavingsResponse(result) {
  const data = result?.data || {};
  const daily = data.daily || {};
  const onboarding = data.onboarding || {};
  const credited = Number(daily.moneyCredited || 0);
  const spent = Number(daily.moneySpent || 0);
  const monthlyIncome = Number(onboarding.monthlyIncome || 0);
  const monthlyExpenditure = Number(onboarding.monthlyExpenditure || 0);
  const savings = credited > 0 || spent > 0 ? credited - spent : monthlyIncome - monthlyExpenditure;
  return Number.isFinite(savings)
    ? `You currently have Rs ${Math.max(0, Math.round(savings)).toLocaleString('en-IN')} in savings.`
    : 'I checked your finance data, but I could not find your current savings yet.';
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
