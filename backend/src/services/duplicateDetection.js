/**
 * Geospatial and Duplicate Detection Service
 */

function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks if a new report is a duplicate of recent reports within spatial and temporal proximity.
 * Criteria:
 * 1. Media hash matches exactly OR
 * 2. Same hazard type, distance < 2.0 km, submitted within 3 hours.
 */
function findDuplicates(newReport, existingReports) {
  const DUPLICATE_DISTANCE_KM = 2.0;
  const DUPLICATE_TIME_WINDOW_HOURS = 3.0;

  const newTime = new Date(newReport.device_timestamp || newReport.created_at || Date.now()).getTime();

  for (const existing of existingReports) {
    if (existing.id === newReport.id) continue;

    // Media hash exact match check
    if (newReport.media_hash && existing.media_hash && newReport.media_hash === existing.media_hash) {
      return {
        isDuplicate: true,
        duplicateOf: existing.id,
        reason: 'Identical media hash match'
      };
    }

    // Spatial and temporal proximity check
    const dist = calculateHaversineDistance(
      newReport.latitude,
      newReport.longitude,
      existing.latitude,
      existing.longitude
    );

    const existTime = new Date(existing.created_at).getTime();
    const hoursDiff = Math.abs(newTime - existTime) / (1000 * 60 * 60);

    if (dist <= DUPLICATE_DISTANCE_KM && hoursDiff <= DUPLICATE_TIME_WINDOW_HOURS && existing.hazard_type === newReport.hazard_type) {
      return {
        isDuplicate: true,
        duplicateOf: existing.id,
        reason: `Proximity match (${dist.toFixed(2)} km, ${hoursDiff.toFixed(1)}h gap, same hazard: ${newReport.hazard_type})`
      };
    }
  }

  return { isDuplicate: false, duplicateOf: null, reason: null };
}

/**
 * Calculate corroboration: count of independent reports within radius (e.g. 5km) and time window (e.g. 6h)
 */
function calculateCorroboration(report, allReports, radiusKm = 5.0, timeWindowHours = 6.0) {
  const targetTime = new Date(report.device_timestamp || report.created_at || Date.now()).getTime();
  let corroboratingCount = 0;
  let matchingTypeCount = 0;

  for (const item of allReports) {
    if (item.id === report.id || item.reporter_id === report.reporter_id) continue;

    const dist = calculateHaversineDistance(
      report.latitude,
      report.longitude,
      item.latitude,
      item.longitude
    );

    const itemTime = new Date(item.created_at).getTime();
    const hoursDiff = Math.abs(targetTime - itemTime) / (1000 * 60 * 60);

    if (dist <= radiusKm && hoursDiff <= timeWindowHours) {
      corroboratingCount++;
      if (item.hazard_type === report.hazard_type) {
        matchingTypeCount++;
      }
    }
  }

  return {
    corroboratingCount,
    matchingTypeCount,
    corroborationRatio: corroboratingCount > 0 ? matchingTypeCount / corroboratingCount : 0
  };
}

module.exports = {
  calculateHaversineDistance,
  findDuplicates,
  calculateCorroboration
};
