import WebSocket from 'ws';

const deepgramUrl = 'wss://api.deepgram.com/v1/listen?model=nova-2-general&language=multi&interim_results=true&smart_format=true&vad_events=true&endpointing=1200';

export function createDeepgramStream({ socket }) {
  let deepgramSocket = null;
  let isOpen = false;
  let manuallyStopped = false;
  let reconnectTimer = null;
  let keepAliveTimer = null;
  let droppedAudioWarningShown = false;
  let reconnecting = false;

  function start() {
    manuallyStopped = false;
    if (deepgramSocket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(deepgramSocket.readyState)) return;

    if (!process.env.DEEPGRAM_API_KEY) {
      emitVoiceError(socket, 'DEEPGRAM_API_KEY is missing in backend .env.');
      return;
    }

    deepgramSocket = new WebSocket(deepgramUrl, {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      },
    });

    deepgramSocket.on('open', () => {
      console.log(reconnecting ? '[VOICE] Deepgram Reconnected' : '[VOICE] Deepgram Connected');
      reconnecting = false;
      isOpen = true;
      droppedAudioWarningShown = false;
      startKeepAlive();
      emitVoiceConnected(socket);
    });

    deepgramSocket.on('message', (payload) => {
      handleDeepgramMessage(socket, payload);
    });

    deepgramSocket.on('close', () => {
      console.warn('[VOICE ERROR] Deepgram Disconnected');
      isOpen = false;
      stopKeepAlive();
      deepgramSocket = null;
      if (!manuallyStopped) {
        emitVoiceDisconnected(socket);
        scheduleReconnect();
      }
    });

    deepgramSocket.on('error', (error) => {
      console.warn('[VOICE ERROR] Deepgram stream error:', error.message);
      isOpen = false;
      stopKeepAlive();
      emitVoiceError(socket, error.message || 'Deepgram stream error.');
      if (!manuallyStopped && deepgramSocket?.readyState !== WebSocket.CLOSING && deepgramSocket?.readyState !== WebSocket.CLOSED) {
        deepgramSocket.close();
      }
    });
  }

  function sendAudio(chunk) {
    if (!isOpen || !deepgramSocket || deepgramSocket.readyState !== WebSocket.OPEN) {
      if (!droppedAudioWarningShown) {
        console.warn('[VOICE] Dropping audio chunk because Deepgram is not connected.');
        droppedAudioWarningShown = true;
      }
      return;
    }
    deepgramSocket.send(chunk);
  }

  function stop() {
    manuallyStopped = true;
    clearTimeout(reconnectTimer);
    stopKeepAlive();
    isOpen = false;
    if (!deepgramSocket) return;
    if (deepgramSocket.readyState === WebSocket.OPEN) {
      deepgramSocket.send(JSON.stringify({ type: 'CloseStream' }));
    }
    deepgramSocket.close();
    deepgramSocket = null;
  }

  return { start, sendAudio, stop };

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    reconnecting = true;
    console.log('[VOICE] Deepgram Reconnecting');
    reconnectTimer = setTimeout(() => {
      if (!manuallyStopped) start();
    }, 1000);
  }

  function startKeepAlive() {
    stopKeepAlive();
    keepAliveTimer = setInterval(() => {
      if (deepgramSocket?.readyState === WebSocket.OPEN) {
        deepgramSocket.send(JSON.stringify({ type: 'KeepAlive' }));
      }
    }, 8000);
  }

  function stopKeepAlive() {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function handleDeepgramMessage(socket, payload) {
  try {
    const data = JSON.parse(payload.toString());
    const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
    if (!transcript) return;

    console.log('[Twin Assistant] Deepgram transcript:', {
      transcript,
      isFinal: Boolean(data.is_final),
      speechFinal: Boolean(data.speech_final),
    });
    console.log(`TRANSCRIPT RECEIVED: ${transcript}`);

    emitVoiceTranscript(socket, {
      transcript,
      isFinal: Boolean(data.is_final),
      speechFinal: Boolean(data.speech_final),
    });
  } catch (error) {
    emitVoiceError(socket, error.message || 'Could not parse Deepgram transcript.');
  }
}

function emitVoiceConnected(socket) {
  socket.emit('voice:connected', { active: true });
  socket.emit('voice:listening', { active: true });
  socket.emit('assistant:listening', { active: true });
}

function emitVoiceDisconnected(socket) {
  socket.emit('voice:disconnected', { active: false });
  socket.emit('voice:listening', { active: false });
  socket.emit('assistant:listening', { active: false });
}

function emitVoiceTranscript(socket, payload) {
  socket.emit('voice:transcript', payload);
  socket.emit('assistant:transcript', payload);
}

function emitVoiceError(socket, message) {
  const payload = { message };
  socket.emit('voice:error', payload);
  socket.emit('assistant:error', payload);
}
