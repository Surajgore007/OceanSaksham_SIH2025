const axios = require('axios');

// In-memory cache for Open-Meteo API requests (lat/lng rounded to 2 decimals, valid for 1 hour)
const marineCache = new Map();

/**
 * Fetch marine weather (wave height, wave direction, wind speed) from Open-Meteo Marine API
 * API docs: https://open-meteo.com/en/docs/marine-weather-api
 */
async function getMarineData(latitude, longitude) {
  const roundedLat = parseFloat(latitude).toFixed(2);
  const roundedLng = parseFloat(longitude).toFixed(2);
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = marineCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600 * 1000) {
    return cached.data;
  }

  try {
    const response = await axios.get('https://marine-api.open-meteo.com/v1/marine', {
      params: {
        latitude: roundedLat,
        longitude: roundedLng,
        current: 'wave_height,wave_direction,wave_period,wind_wave_height',
        timezone: 'auto'
      },
      timeout: 5000
    });

    const marineData = {
      waveHeight: response.data?.current?.wave_height ?? 1.2,
      waveDirection: response.data?.current?.wave_direction ?? 180,
      wavePeriod: response.data?.current?.wave_period ?? 7.0,
      windWaveHeight: response.data?.current?.wind_wave_height ?? 0.8,
      source: 'Open-Meteo Marine API',
      timestamp: new Date().toISOString()
    };

    marineCache.set(cacheKey, { timestamp: Date.now(), data: marineData });
    return marineData;
  } catch (error) {
    console.warn(`[Open-Meteo] Warning: Marine API unavailable for (${roundedLat}, ${roundedLng}): ${error.message}. Using synthetic fallback.`);
    // Realistic Indian coastal baseline fallback
    return {
      waveHeight: 1.5,
      waveDirection: 210,
      wavePeriod: 8.0,
      windWaveHeight: 1.0,
      source: 'Fallback Simulation',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  getMarineData
};
