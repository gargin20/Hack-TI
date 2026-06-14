import axios from 'axios';
import User from '../models/User.js';
import GoogleFitService from '../services/GoogleFitService.js';

const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.location.read',
].join(' ');

// export const connect = async (req, res) => {
//   console.log('[GOOGLE FIT] Connect endpoint hit');
//   console.log('[GOOGLE FIT] User:', req.user?._id || req.user?.userId || null);
//   const userId = req.user.userId;
//   console.log('[GoogleFitController] OAuth start for user', userId);
//   const params = new URLSearchParams({
//     client_id: process.env.GOOGLE_CLIENT_ID,
//     redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT,
//     response_type: 'code',
//     scope: SCOPES,
//     access_type: 'offline',
//     include_granted_scopes: 'true',
//     prompt: 'consent',
//     state: String(userId),
//   });
//   const url = `${OAUTH_URL}?${params.toString()}`;
//   console.log('[GoogleFitController] redirecting to', url);
//   // If client expects JSON (AJAX call), return the URL so frontend can navigate the browser.
//   const acceptsJson = String(req.headers.accept || '').includes('application/json') || req.query.json === '1';
//   if (acceptsJson) return res.status(200).json({ success: true, url });
//   return res.redirect(url);
// };
export const connect = async (req, res) => {
  console.log('[GOOGLE FIT] Connect endpoint hit');
  console.log('[GOOGLE FIT] User:', req.user?._id || req.user?.userId || null);

  console.log('====================================');
  console.log('GOOGLE_CLIENT_ID =', process.env.GOOGLE_CLIENT_ID);
  console.log('GOOGLE_OAUTH_REDIRECT =', process.env.GOOGLE_OAUTH_REDIRECT);
  console.log('====================================');

  const userId = req.user.userId;

  // Dynamic redirect support: capture query origin or referrer origin
  const queryOrigin = req.query.origin || '';
  const referrer = req.headers.referer || req.headers.referrer || '';
  let referrerOrigin = '';
  try {
    if (referrer) {
      referrerOrigin = new URL(referrer).origin;
    }
  } catch (err) {
    console.error('[GoogleFitController] Failed to parse referer', err);
  }

  const origin = queryOrigin || referrerOrigin;
  console.log('[OAUTH] Origin received:', origin);

  const stateData = {
    userId,
    origin
  };
  const stateBase64 = Buffer.from(JSON.stringify(stateData)).toString('base64url');

  console.log('[GoogleFitController] OAuth start for user', userId, 'with origin', origin);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state: stateBase64,
  });

  const url = `${OAUTH_URL}?${params.toString()}`;

  console.log('====================================');
  console.log('Generated OAuth URL:');
  console.log(url);
  console.log('====================================');

  console.log('[GoogleFitController] redirecting to', url);

  const acceptsJson =
    String(req.headers.accept || '').includes('application/json') ||
    req.query.json === '1';

  if (acceptsJson) {
    return res.status(200).json({
      success: true,
      url,
    });
  }

  return res.redirect(url);
};
export const callback = async (req, res) => {
  const { code, state } = req.query;
  console.log('[GOOGLE FIT] Callback received');
  console.log('[GOOGLE FIT] Code exists:', !!req.query.code);
  console.log('[GoogleFitController] OAuth callback received, state=', state);
  if (!code) return res.status(400).send('Missing code');
  try {
    const params = new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT,
      grant_type: 'authorization_code',
    });
    const tokenRes = await axios.post(TOKEN_URL, params.toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const data = tokenRes.data || {};
    console.log('[GoogleFitController] Token exchange success for state=', state);

    // Decrypt/decode state from URL-safe Base64 JSON
    let userId = '';
    let decodedOrigin = '';
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      userId = decodedState.userId;
      decodedOrigin = decodedState.origin;
      console.log('[OAUTH] Origin decoded:', decodedOrigin);
    } catch (err) {
      console.warn('[GoogleFitController] State decoding failed, falling back to raw state parameter:', err.message);
      userId = state;
    }

    const user = await User.findById(userId).select('+healthIntegration.googleFit.accessToken +healthIntegration.googleFit.refreshToken +healthIntegration.googleFit.tokenExpiresAt');
    if (!user) {
      console.error('[GoogleFitController] user not found for id', userId);
      return res.status(404).send('User not found');
    }

    user.healthIntegration = user.healthIntegration || {};
    user.healthIntegration.connected = true;
    user.healthIntegration.provider = 'anjali_googlefit';
    user.healthIntegration.integrationLink = user.healthIntegration.integrationLink || `googlefit:${userId}`;
    user.healthIntegration.lastSync = new Date();
    user.healthIntegration.googleFit = user.healthIntegration.googleFit || {};
    user.healthIntegration.googleFit.accessToken = data.access_token;
    user.healthIntegration.googleFit.refreshToken = data.refresh_token || user.healthIntegration.googleFit.refreshToken;
    user.healthIntegration.googleFit.tokenExpiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
    user.healthIntegration.googleFit.scope = data.scope || '';
     console.log("BEFORE GOOGLE SAVE");
console.log(JSON.stringify(user.healthIntegration, null, 2));
   await user.save();

const verifyUser = await User.findById(userId);

console.log("AFTER GOOGLE SAVE");
console.log(JSON.stringify(verifyUser.healthIntegration, null, 2));

    console.log('[GoogleFitController] tokens saved for user', userId);

    // Validate origin against allowlist before redirecting
    const ALLOWED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];
    let targetOrigin = '';
    if (decodedOrigin && ALLOWED_ORIGINS.includes(decodedOrigin)) {
      targetOrigin = decodedOrigin;
    } else {
      targetOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

    const redirectUrl = `${targetOrigin}/health?connected=googlefit`;
    console.log('[OAUTH] Redirecting to:', redirectUrl);
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('[GoogleFitController] token exchange failed', err.response?.data || err.message);
    console.error(err.stack || err);
    return res.status(500).json({ success: false, message: 'Token exchange failed' });
  }
};



// export const live = async (req, res) => {
//   try {
//     console.log('[GOOGLE FIT] Live metrics requested');
//     console.log('[GOOGLE FIT] User:', req.user?._id || req.user?.userId || null);
//     const user = await User.findById(req.user.userId);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });
//     if (user.healthIntegration?.provider !== 'anjali_googlefit') {
//       return res.status(400).json({ success: false, message: 'Google Fit not connected for this user' });
//     }
//     const metrics = await GoogleFitService.getLiveMetricsForUser(user);
//     return res.status(200).json({ success: true, data: metrics });
//   } catch (err) {
//     console.error('[GoogleFitController] live error', err.response?.data || err.message);
//     console.error(err.stack || err);
//     return res.status(500).json({ success: false, message: 'Could not fetch live Google Fit data' });
//   }
// };

export const live = async (req, res) => {
  try {
    console.log('================================');
    console.log('[GOOGLE FIT] Live metrics requested');
    console.log('[GOOGLE FIT] JWT User:', req.user);
    console.log('[GOOGLE FIT] User ID:', req.user?.userId);
    console.log('================================');

   const user = await User.findById(req.user.userId)
  .select('+healthIntegration.googleFit.accessToken +healthIntegration.googleFit.refreshToken');
    console.log(
  'ACCESS TOKEN EXISTS:',
  !!user?.healthIntegration?.googleFit?.accessToken
);

console.log(
  'REFRESH TOKEN EXISTS:',
  !!user?.healthIntegration?.googleFit?.refreshToken
);  

    console.log('================================');
    console.log('[GOOGLE FIT] DB User Found:', !!user);

    if (user) {
      console.log('[GOOGLE FIT] DB User ID:', user._id.toString());
      console.log('[GOOGLE FIT] Health Integration:', user.healthIntegration);
      console.log('[GOOGLE FIT] Provider:', user.healthIntegration?.provider);
      console.log('[GOOGLE FIT] Connected:', user.healthIntegration?.connected);
    }

    console.log('================================');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.healthIntegration?.provider !== 'anjali_googlefit') {
      console.log(
        '[GOOGLE FIT] Provider mismatch:',
        user.healthIntegration?.provider
      );

      return res.status(400).json({
        success: false,
        message: 'Google Fit not connected for this user',
      });
    }

    console.log('[GOOGLE FIT] Calling GoogleFitService');

    const metrics = await GoogleFitService.getLiveMetricsForUser(user);

    console.log('[GOOGLE FIT] Metrics received:', metrics);

    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (err) {
    console.error('[GoogleFitController] live error');
    console.error(err.response?.data || err.message);
    console.error(err.stack || err);

    return res.status(500).json({
      success: false,
      message: 'Could not fetch live Google Fit data',
    });
  }
};