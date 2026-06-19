import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import GamificationProfile from '../models/GamificationProfile.js';
import DailyTracking from '../models/DailyTracking.js';
import {
  buildTrajectory,
  getOrCreateDailyTracking,
  getOrCreateLifeProfile,
  scoreFromParts,
  todayKey,
} from '../services/domainDataService.js';

// ── Unchanged controllers ─────────────────────────────────────────────────────

export const getHealth = async (req, res) => {
  const [daily, lifeProfile] = await Promise.all([
    getOrCreateDailyTracking(req.user.userId),
    getOrCreateLifeProfile(req.user.userId),
  ]);
  const score = scoreFromParts([
    Math.min(100, (daily.health?.sleepHours || 0) * 12),
    Math.min(100, (daily.health?.waterLiters || 0) * 25),
    Math.min(100, (daily.health?.workouts?.length || 0) * 25),
  ]);
  res.status(200).json({
    success: true,
    data: {
      score,
      daily: daily.health,
      profile: lifeProfile.healthContext,
      reproductiveHealth: lifeProfile.reproductiveHealth,
      pregnancy: lifeProfile.pregnancy,
    },
  });
};

export const createHealth = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.health = { ...daily.health, ...req.body };
  await daily.save();
  res.status(201).json({ success: true, data: daily.health });
};

export const updateHealth = async (req, res) => {
  const daily = await getOrCreateDailyTracking(req.user.userId, req.body.dateString || todayKey());
  daily.health = { ...daily.health, ...req.body };
  await daily.save();
  res.status(200).json({ success: true, data: daily.health });
};

export const getHealthAnalytics = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: -1 }).limit(30).lean();
  const latest = logs[0]?.health || {};
  const score = scoreFromParts([
    Math.min(100, (latest.sleepHours || 0) * 12),
    Math.min(100, (latest.waterLiters || 0) * 25),
    Math.min(100, (latest.workouts?.length || 0) * 25),
  ]);
  res.status(200).json({
    success: true,
    data: {
      score,
      averages: {
        sleepHours: average(logs.map((l) => l.health?.sleepHours)),
        waterLiters: average(logs.map((l) => l.health?.waterLiters)),
      },
      totalWorkouts: logs.reduce((sum, l) => sum + (l.health?.workouts?.length || 0), 0),
    },
  });
};

export const getHealthTrajectory = async (req, res) => {
  const logs = await DailyTracking.find({ userId: req.user.userId }).sort({ dateString: 1 }).limit(60).lean();
  res.status(200).json({ success: true, data: buildTrajectory(logs) });
};

export const getPeriods = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  res.status(200).json({ success: true, data: profile.reproductiveHealth });
};

export const savePeriods = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  profile.reproductiveHealth = { ...profile.reproductiveHealth, ...req.body, isTracking: true };
  await profile.save();
  res.status(201).json({ success: true, data: profile.reproductiveHealth });
};

export const getPregnancy = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  res.status(200).json({ success: true, data: profile.pregnancy });
};

export const savePregnancy = async (req, res) => {
  const profile = await getOrCreateLifeProfile(req.user.userId);
  profile.pregnancy = { ...profile.pregnancy, ...req.body, isTracking: true };
  await profile.save();
  res.status(201).json({ success: true, data: profile.pregnancy });
};

// ── FIXED: logWorkout — now writes to DailyTracking ──────────────────────────
// Previously only fired gamification. Now saves workout to DailyTracking
// so GoalSyncEngine can map durationMinutes → matching workout/exercise goals.
export const logWorkout = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, duration } = req.body;
    const today  = todayKey();

    // 1. Find or create today's log
    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    // 2. Snapshot BEFORE mutation so GoalSyncEngine gets the delta only
    daily._prevSnapshot = {
      health:  { ...snapshotHealth(daily.health) },
      finance: { ...snapshotFinance(daily.finance) },
    };

    // 3. Append workout entry
    daily.health.workouts.push({ type: type || 'General', durationMinutes: Number(duration) || 0 });

    console.log(`[HealthController] logWorkout: saving daily tracking document for userId=${userId}`);
    daily._skipGoalSync = true;
    await daily.save();

    console.log(`[HealthController] logWorkout: executing explicit GoalSyncEngine.syncGoalsFromDailyLog`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    const goalsUpdated = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      daily,
      daily._prevSnapshot || null
    );

    console.log(`[HealthController] logWorkout: calling GamificationService.evaluateRules`);
    const { default: GamificationService } = await import('../services/GamificationService.js');
    const gamificationResult = await GamificationService.evaluateRules(userId);

    const profile = await GamificationProfile.findOne({ userId });
    const totalXP = profile ? profile.totalXP : 0;
    res.status(201).json({ success: true, message: 'Workout logged!', gamification: gamificationResult, totalXP, goalProgress: goalsUpdated });
  } catch (error) {
    console.error('logWorkout Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── FIXED: logSleep — now writes to DailyTracking ────────────────────────────
// Previously only fired gamification. Now saves sleepHours to DailyTracking
// so GoalSyncEngine can map sleepHours → matching sleep goals.
export const logSleep = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { hours } = req.body;
    const today   = todayKey();

    // 1. Find or create today's log
    let daily = await DailyTracking.findOne({ userId, dateString: today });
    if (!daily) daily = new DailyTracking({ userId, dateString: today });

    // 2. Snapshot BEFORE mutation
    daily._prevSnapshot = {
      health:  { ...snapshotHealth(daily.health) },
      finance: { ...snapshotFinance(daily.finance) },
    };

    // 3. Set sleep hours (replace, not increment — you only sleep once per day)
    daily.health.sleepHours = Number(hours) || 0;

    console.log(`[HealthController] logSleep: saving daily tracking document for userId=${userId}`);
    daily._skipGoalSync = true;
    await daily.save();

    console.log(`[HealthController] logSleep: executing explicit GoalSyncEngine.syncGoalsFromDailyLog`);
    const { default: GoalSyncEngine } = await import('../services/GoalSyncEngine.js');
    const goalsUpdated = await GoalSyncEngine.syncGoalsFromDailyLog(
      userId,
      daily,
      daily._prevSnapshot || null
    );

    console.log(`[HealthController] logSleep: calling GamificationService.evaluateRules`);
    const { default: GamificationService } = await import('../services/GamificationService.js');
    const gamificationResult = await GamificationService.evaluateRules(userId);

    const profile = await GamificationProfile.findOne({ userId });
    const totalXP = profile ? profile.totalXP : 0;
    res.status(201).json({ success: true, message: 'Sleep logged!', gamification: gamificationResult, totalXP, goalProgress: goalsUpdated });
  } catch (error) {
    console.error('logSleep Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Safe snapshot that handles both Mongoose subdocs and plain objects
function snapshotHealth(health) {
  if (!health) return { caloriesConsumed: 0, proteinConsumed: 0, waterLiters: 0, sleepHours: 0, workouts: [] };
  return {
    caloriesConsumed: health.caloriesConsumed || 0,
    proteinConsumed:  health.proteinConsumed  || 0,
    waterLiters:      health.waterLiters      || 0,
    sleepHours:       health.sleepHours       || 0,
    workouts:         (health.workouts || []).map(w => ({ type: w.type, durationMinutes: w.durationMinutes })),
  };
}

function snapshotFinance(finance) {
  if (!finance) return { moneySpent: 0, moneyCredited: 0 };
  return {
    moneySpent:    finance.moneySpent    || 0,
    moneyCredited: finance.moneyCredited || 0,
  };
}

function average(values) {
  const numbers = values.map(Number).filter((v) => Number.isFinite(v) && v > 0);
  if (!numbers.length) return 0;
  return Number((numbers.reduce((s, v) => s + v, 0) / numbers.length).toFixed(1));
}

const getGenAI = () => {
  const key = (process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY_INTELLIGENCE || '').trim();
  return new GoogleGenerativeAI(key);
};
const weatherCache = new Map();

async function getCoordsAndCityFromIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) {
    return {
      latitude: 28.6139,
      longitude: 77.209,
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India'
    };
  }
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`, { timeout: 4000 });
    if (response.data && response.data.status === 'success') {
      return {
        latitude: response.data.lat,
        longitude: response.data.lon,
        city: response.data.city || 'Unknown',
        state: response.data.regionName || '',
        country: response.data.country || ''
      };
    }
  } catch (err) {
    console.error('[WEATHER] IP Geolocation lookup failed:', err.message);
  }
  return null;
}

async function getCityFromCoordinates(lat, lon) {
  // Try BigDataCloud first as it is extremely reliable and does not block cloud IPs
  try {
    const response = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client`, {
      params: {
        latitude: lat,
        longitude: lon,
        localityLanguage: 'en'
      },
      timeout: 5000
    });
    const city = response.data?.city || response.data?.locality || 'Unknown';
    const state = response.data?.principalSubdivision || '';
    const country = response.data?.countryName || '';
    if (city !== 'Unknown') {
      return { city, state, country };
    }
  } catch (err) {
    console.error('[WEATHER] BigDataCloud geocoding failed, falling back:', err.message);
  }

  // Fallback to Nominatim
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'jsonv2',
        lat,
        lon
      },
      headers: {
        'User-Agent': 'DigitalTwinHealthAdvisor/1.0 (anjal943122@gmail.com)'
      },
      timeout: 5000
    });
    const address = response.data?.address || {};
    const city = address.city || address.town || address.village || address.suburb || address.county || 'Unknown';
    const state = address.state || '';
    const country = address.country || '';
    return { city, state, country };
  } catch (err) {
    console.error('[WEATHER] Reverse geocoding failed:', err.message);
    return { city: 'Unknown', state: '', country: '' };
  }
}

function getUvLabel(uvIndex) {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
}

export const getWeatherAdvice = async (req, res) => {
  let { latitude, longitude, city, state, country } = req.body;
  const userId = req.user.userId;

  console.log('[WEATHER] Location received:', { latitude, longitude, city, state, country });

  // 1. Fallback to Google Fit location if coords are missing and user has Google Fit
  if ((latitude === undefined || latitude === null || longitude === undefined || longitude === null) && userId) {
    try {
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(userId).select('+healthIntegration.googleFit.accessToken +healthIntegration.googleFit.refreshToken +healthIntegration.googleFit.tokenExpiresAt');
      if (user && user.healthIntegration?.provider?.includes('googlefit') && user.healthIntegration?.connected) {
        const { default: GoogleFitService } = await import('../services/GoogleFitService.js');
        const accessToken = await GoogleFitService.ensureAccessToken(user);
        const end = Date.now();
        const start = end - (24 * 60 * 60 * 1000); // last 24 hours
        const gfLoc = await GoogleFitService.fetchLastLocation(accessToken, start, end);
        if (gfLoc) {
          latitude = gfLoc.latitude;
          longitude = gfLoc.longitude;
        }
      }
    } catch (err) {
      console.error('[WEATHER] Error fetching Google Fit location fallback:', err.message);
    }
  }

  // 2. IP Geolocation Fallback if coords are still missing
  let ipGeo = null;
  if (latitude === undefined || latitude === null || longitude === undefined || longitude === null) {
    console.log('[WEATHER] Geolocation coordinates missing. Attempting IP Geolocation...');
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ip && ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    if (ip && ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }
    ipGeo = await getCoordsAndCityFromIP(ip);
    if (ipGeo) {
      latitude = ipGeo.latitude;
      longitude = ipGeo.longitude;
      if (!city) city = ipGeo.city;
      if (!state) state = ipGeo.state;
      if (!country) country = ipGeo.country;
      console.log('[WEATHER] IP Geolocation resolved to:', ipGeo);
    } else {
      // Hard fallback if IP geolocation failed and no coords available
      latitude = 28.6139;
      longitude = 77.209;
      if (!city) city = 'New Delhi';
      if (!state) state = 'Delhi';
      if (!country) country = 'India';
      console.log('[WEATHER] IP Geolocation failed. Using default fallback (New Delhi).');
    }
  }

  const cacheKey = `${Number(latitude).toFixed(2)},${Number(longitude).toFixed(2)}`;

  // 3. Cache Check
  if (weatherCache.has(cacheKey)) {
    const cached = weatherCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 30 * 60 * 1000) {
      console.log('[WEATHER] Cache hit');
      console.log('[WEATHER] Returning weather advice');
      return res.status(200).json({
        success: true,
        data: cached.data
      });
    }
  }

  console.log('[WEATHER] Cache miss');

  let geoData = { city: city || 'Unknown', state: state || '', country: country || '' };
  let weatherData = null;
  let adviceData = null;

  try {
    // 4. Reverse Geocode only if the city is not already resolved
    if (geoData.city === 'Unknown') {
      geoData = await getCityFromCoordinates(latitude, longitude);
    }

    // 5. Open-Meteo Fetch
    const weatherRes = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
        daily: 'uv_index_max',
        timezone: 'auto'
      },
      timeout: 5000
    });
    console.log('[WEATHER] OpenMeteo success');

    const current = weatherRes.data?.current || {};
    const daily = weatherRes.data?.daily || {};

    const temperature = Math.round(current.temperature_2m);
    const feelsLike = Math.round(current.apparent_temperature);
    const humidity = Math.round(current.relative_humidity_2m);
    const windSpeed = Math.round(current.wind_speed_10m);
    const uvIndex = daily.uv_index_max ? Math.round(daily.uv_index_max[0]) : 0;
    const uvLabel = getUvLabel(uvIndex);
    const weatherCode = current.weather_code;

    let condition = 'Clear Sky';
    if (weatherCode === 0) condition = 'Clear Sky';
    else if (weatherCode <= 3)  condition = 'Partly Cloudy';
    else if (weatherCode <= 48) condition = 'Foggy / Overcast';
    else if (weatherCode <= 55) condition = 'Light Drizzle';
    else if (weatherCode <= 67) condition = 'Rainy';
    else if (weatherCode <= 77) condition = 'Snowy';
    else if (weatherCode <= 82) condition = 'Heavy Rain';
    else condition = 'Thunderstorm';

    weatherData = {
      temperature,
      feelsLike,
      humidity,
      windSpeed,
      uvIndex,
      uvLabel,
      condition
    };
  } catch (err) {
    console.error('[WEATHER] Weather fetch failed, returning fallback:', err.message);
    return res.status(200).json({
      success: true,
      data: {
        city: geoData.city,
        state: geoData.state,
        country: geoData.country,
        temperature: null,
        feelsLike: null,
        humidity: null,
        windSpeed: null,
        uvIndex: null,
        uvLabel: 'Low',
        condition: 'Unknown',
        hydrationTarget: '2.5L',
        hydrationReason: 'Standard baseline fluid intake to maintain optimal hydration.',
        clothingAdvice: 'Comfortable clothing',
        clothingReason: 'Wear comfortable clothing suitable for your current environment.',
        activityWindow: 'Morning or Evening',
        activityReason: 'Avoid direct midday heat and peak UV hours.'
      }
    });
  }

  // 6. Gemini Generation
  try {
    const genAI = getGenAI();
    // Enable JSON format using responseMimeType and responseSchema for absolute reliability
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            hydrationTarget: { type: 'STRING' },
            hydrationReason: { type: 'STRING' },
            clothingAdvice: { type: 'STRING' },
            clothingReason: { type: 'STRING' },
            activityWindow: { type: 'STRING' },
            activityReason: { type: 'STRING' }
          },
          required: ['hydrationTarget', 'hydrationReason', 'clothingAdvice', 'clothingReason', 'activityWindow', 'activityReason']
        }
      }
    });

    const prompt = `You are a health and wellness advisor.

Based on:
Temperature: ${weatherData.temperature}°C
Feels Like: ${weatherData.feelsLike}°C
Humidity: ${weatherData.humidity}%
Wind Speed: ${weatherData.windSpeed} km/h
UV Index: ${weatherData.uvIndex}
Condition: ${weatherData.condition}

Provide personalized advice for hydration, clothing choice, and the safest activity window.
Return a valid JSON object matching the requested schema.`;

    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 25000)) // Increased timeout to 25s for slow production env
    ]);

    const responseText = result.response.text();
    adviceData = JSON.parse(responseText.trim());
    console.log('[WEATHER] Gemini success');
  } catch (err) {
    console.error('[WEATHER] Gemini failed, using fallback:', err);
    adviceData = {
      hydrationTarget: weatherData.temperature >= 35 ? '3.8L today' : weatherData.temperature >= 28 ? '3.2L today' : '2.5L today',
      hydrationReason: weatherData.temperature >= 30 ? 'Warm weather increases sweat rate and fluid requirements.' : 'Standard baseline fluid intake to maintain optimal hydration.',
      clothingAdvice: weatherData.temperature >= 28 ? 'Loose Linen / Cotton' : 'Comfortable Clothing',
      clothingReason: weatherData.temperature >= 28 ? 'Light, breathable fabrics help dissipate body heat.' : 'Layering allows easy adjustment to changing conditions.',
      activityWindow: weatherData.temperature >= 32 ? 'Before 8 AM · After 7 PM' : 'Any time with appropriate sun protection',
      activityReason: weatherData.temperature >= 32 ? 'Avoiding peak heat hours minimizes thermal strain.' : 'Clear conditions are favorable for outdoor activity.'
    };
    console.log('[WEATHER] Gemini fallback used');
  }

  const responsePayload = {
    city: geoData.city,
    state: geoData.state,
    country: geoData.country,
    ...weatherData,
    ...adviceData
  };

  // 7. Save to Cache
  weatherCache.set(cacheKey, {
    data: responsePayload,
    timestamp: Date.now()
  });

  console.log('[WEATHER] Returning weather advice');
  return res.status(200).json({
    success: true,
    data: responsePayload
  });
};
