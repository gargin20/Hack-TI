import axios from 'axios';
import User from '../models/User.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const AGGREGATE_URL = 'https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate';

function nowMillis() { return Date.now(); }

async function refreshAccessToken(user) {
  const refreshToken = user.healthIntegration?.googleFit?.refreshToken;
  if (!refreshToken) throw new Error('No refresh token available');
  console.log('[GoogleFitService] refreshing access token for user', user._id);
  const params = new URLSearchParams();
  params.append('client_id', process.env.GOOGLE_CLIENT_ID);
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  const res = await axios.post(TOKEN_URL, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const data = res.data || {};
  const expiresAt = data.expires_in ? new Date(nowMillis() + (data.expires_in * 1000)) : null;

  user.healthIntegration = user.healthIntegration || {};
  user.healthIntegration.googleFit = user.healthIntegration.googleFit || {};
  user.healthIntegration.googleFit.accessToken = data.access_token || user.healthIntegration.googleFit.accessToken;
  // refresh token may not be returned on refresh grants
  user.healthIntegration.googleFit.refreshToken = data.refresh_token || user.healthIntegration.googleFit.refreshToken;
  user.healthIntegration.googleFit.tokenExpiresAt = expiresAt || user.healthIntegration.googleFit.tokenExpiresAt;
  user.healthIntegration.googleFit.scope = data.scope || user.healthIntegration.googleFit.scope || '';

  await user.save();
  console.log('[GoogleFitService] refreshed token saved for user', user._id);
  return user.healthIntegration.googleFit.accessToken;
}

async function ensureAccessToken(user) {
  const gf = user.healthIntegration?.googleFit || {};
  if (!gf.accessToken) {
    // try refreshing
    return await refreshAccessToken(user);
  }
  if (gf.tokenExpiresAt && new Date(gf.tokenExpiresAt).getTime() < (nowMillis() - 60000)) {
    // expired or about to expire
    return await refreshAccessToken(user);
  }
  return gf.accessToken;
}

function buildAggregateRequest(dataTypeName, startMillis, endMillis) {
  return {
    aggregateBy: [{ dataTypeName }],
    bucketByTime: { durationMillis: endMillis - startMillis },
    startTimeMillis: String(startMillis),
    endTimeMillis: String(endMillis),
  };
}

async function aggregate(accessToken, body) {
  try {
    const res = await axios.post(AGGREGATE_URL, body, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    return res.data;
  } catch (err) {
    console.error('[GoogleFitService] aggregate error', err.response?.data || err.message);
    throw err;
  }
}

async function fetchSteps(accessToken, startMillis, endMillis) {
  const body = buildAggregateRequest('com.google.step_count.delta', startMillis, endMillis);
  const data = await aggregate(accessToken, body);
  console.log(
    'GOOGLE FIT STEP RESPONSE:',
    JSON.stringify(data, null, 2)
  );
  const buckets = data.bucket || [];
  let steps = 0;
  buckets.forEach(b => {
    (b.dataset || []).forEach(ds => {
      (ds.point || []).forEach(p => {
        (p.value || []).forEach(v => { steps += Number(v.intVal || 0); });
      });
    });
  });
  return steps;
}

async function fetchCalories(accessToken, startMillis, endMillis) {
  const body = buildAggregateRequest('com.google.calories.expended', startMillis, endMillis);
  const data = await aggregate(accessToken, body);
  console.log(
    'GOOGLE FIT CALORIES RESPONSE:',
    JSON.stringify(data, null, 2)
  );
  const buckets = data.bucket || [];
  let calories = 0;
  let hasPoints = false;
  buckets.forEach(b => {
    (b.dataset || []).forEach(ds => {
      (ds.point || []).forEach(p => {
        hasPoints = true;
        (p.value || []).forEach(v => { calories += Number(v.fpVal || v.intVal || 0); });
      });
    });
  });
  return hasPoints ? Math.round(calories) : null;
}

async function fetchDistance(accessToken, startMillis, endMillis) {
  const body = buildAggregateRequest('com.google.distance.delta', startMillis, endMillis);
  const data = await aggregate(accessToken, body);
  console.log("GOOGLE FIT DISTANCE RESPONSE", JSON.stringify(data, null, 2));
  const buckets = data.bucket || [];
  let meters = 0;
  buckets.forEach(b => {
    (b.dataset || []).forEach(ds => {
      (ds.point || []).forEach(p => {
        (p.value || []).forEach(v => { meters += Number(v.fpVal || v.intVal || 0); });
      });
    });
  });
  const km = +(meters / 1000).toFixed(2);
  return km;
}

async function fetchHeartRate(accessToken, startMillis, endMillis) {
  const body = buildAggregateRequest('com.google.heart_rate.bpm', startMillis, endMillis);
  const data = await aggregate(accessToken, body);
  console.log(
    'GOOGLE FIT HEART RATE RESPONSE:',
    JSON.stringify(data, null, 2)
  );
  const buckets = data.bucket || [];
  let sum = 0; let count = 0;
  buckets.forEach(b => {
    (b.dataset || []).forEach(ds => {
      (ds.point || []).forEach(p => {
        (p.value || []).forEach(v => {
          const val = Number(v.fpVal || v.intVal || 0);
          if (val > 0) { sum += val; count += 1; }
        });
      });
    });
  });
  const avg = count > 0 ? Math.round(sum / count) : null;
  return avg;
}

async function fetchSleep(accessToken, startMillis, endMillis) {
  // Sleep uses com.google.sleep.segment — we'll compute total sleep duration in milliseconds
  const body = buildAggregateRequest('com.google.sleep.segment', startMillis, endMillis);
  const data = await aggregate(accessToken, body);
  console.log(
    'GOOGLE FIT SLEEP RESPONSE:',
    JSON.stringify(data, null, 2)
  );
  const buckets = data.bucket || [];
  let sleepMs = 0;
  let hasPoints = false;
  buckets.forEach(b => {
    (b.dataset || []).forEach(ds => {
      (ds.point || []).forEach(p => {
        hasPoints = true;
        // Sleep segments use intVal to denote segment type, and start/end timestamps
        // p.startTimeNanos / p.endTimeNanos present on points
        const startNanos = Number(p.startTimeNanos || 0);
        const endNanos = Number(p.endTimeNanos || 0);
        if (endNanos > startNanos) sleepMs += Math.round((endNanos - startNanos) / 1e6);
      });
    });
  });
  const hours = +(sleepMs / (1000 * 60 * 60)).toFixed(1);
  return hasPoints ? hours : null;
}

async function getLiveMetricsForUser(user) {
  try {
    const accessToken = await ensureAccessToken(user);
    const end = Date.now();
    const start = end - (24 * 60 * 60 * 1000); // last 24 hours

    console.log('[GoogleFitService] fetching live metrics for user', user._id);
    const [steps, heartRate, sleepHours, calories, distanceKm] = await Promise.all([
      fetchSteps(accessToken, start, end),
      fetchHeartRate(accessToken, start, end),
      fetchSleep(accessToken, start, end),
      fetchCalories(accessToken, start, end),
      fetchDistance(accessToken, start, end),
    ]);

    return {
      source: 'googlefit',
      heartRate: heartRate ?? null,
      sleepHours: sleepHours ?? null,
      steps: steps ?? 0,
      calories: calories ?? null,
      distanceKm: distanceKm ?? 0,
    };
  } catch (err) {
    console.error('[GoogleFitService] getLiveMetricsForUser failed', err.message || err);
    throw err;
  }
}

export default {
  ensureAccessToken,
  refreshAccessToken,
  fetchSteps,
  fetchHeartRate,
  fetchSleep,
  fetchCalories,
  fetchDistance,
  getLiveMetricsForUser,
};
