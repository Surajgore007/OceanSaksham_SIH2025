const { calculateCorroboration, calculateHaversineDistance } = require('./duplicateDetection');
const { getMarineData } = require('./marineService');

/**
 * Triage Scoring Engine with Explainable Reason Generation
 * Implements the 7 feature groups formulation.
 */
async function computeCredibilityScore(report, context = {}) {
  const { allReports = [], reporter = null, activeHotspots = [] } = context;
  const reasons = [];
  let score = 0.5; // Base neutral prior

  // --- Group 1: Location Features ---
  const accuracy = report.gps_accuracy || 20.0;
  if (accuracy <= 10.0) {
    score += 0.10;
    reasons.push(`High GPS precision (±${accuracy.toFixed(1)}m)`);
  } else if (accuracy > 100.0) {
    score -= 0.15;
    reasons.push(`Low GPS accuracy (±${accuracy.toFixed(1)}m)`);
  }

  // EXIF Location Consistency
  if (report.exif_valid && report.exif_lat && report.exif_lng) {
    const exifDist = calculateHaversineDistance(
      report.latitude,
      report.longitude,
      report.exif_lat,
      report.exif_lng
    );
    if (exifDist <= 0.5) {
      score += 0.15;
      reasons.push(`EXIF photo coordinates match GPS (Δ=${(exifDist * 1000).toFixed(0)}m)`);
    } else if (exifDist > 5.0) {
      score -= 0.25;
      reasons.push(`EXIF location mismatch with GPS (${exifDist.toFixed(1)}km divergence)`);
    }
  }

  // Hotspot Proximity
  for (const hotspot of activeHotspots) {
    const dist = calculateHaversineDistance(
      report.latitude,
      report.longitude,
      hotspot.latitude,
      hotspot.longitude
    );
    if (dist <= (hotspot.radius_km || 5.0)) {
      score += 0.10;
      reasons.push(`Located inside active hazard zone (${hotspot.name})`);
      break;
    }
  }

  // --- Group 2: Time Features ---
  if (report.device_timestamp && report.server_timestamp) {
    const devTime = new Date(report.device_timestamp).getTime();
    const srvTime = new Date(report.server_timestamp).getTime();
    const timeDeltaMinutes = Math.abs(srvTime - devTime) / (1000 * 60);

    if (timeDeltaMinutes < 15) {
      score += 0.05;
      reasons.push(`Immediate submission (<15 min gap)`);
    } else if (timeDeltaMinutes > 720) { // >12 hours
      score -= 0.10;
      reasons.push(`Delayed report (${(timeDeltaMinutes / 60).toFixed(1)} hours after occurrence)`);
    }
  }

  // --- Group 3: Text & Multilingual Features ---
  const text = (report.description || '').trim();
  if (text.length >= 20) {
    score += 0.05;
    // Check keyword match with hazard type
    const keywords = {
      flood: ['water', 'flood', 'submerged', 'inundation', 'overflow', 'पानी', 'पूर', 'வெள்ளம்', 'వరద', 'বন্যা', 'પાણી'],
      'high-waves': ['wave', 'swell', 'rough', 'sea', 'surge', 'लाट', 'तरंग', 'அலை', 'తరంగాలు', 'ঢেউ'],
      tsunami: ['tsunami', 'earthquake', 'withdrawal', 'tidal', 'सुनामी', 'சுனாமி'],
      'storm-surge': ['storm', 'cyclone', 'surge', 'gale', 'चक्रीवादळ', 'புயல்', 'తుఫాను', 'ঘূর্ণিঝড়'],
      'coastal-erosion': ['erosion', 'shoreline', 'collapsed', 'damage', 'धूप', 'அரிப்பு', 'కోత', 'ক্ষয়']
    };

    const targetKeywords = keywords[report.hazard_type] || [];
    const textLower = text.toLowerCase();
    const matched = targetKeywords.some(kw => textLower.includes(kw.toLowerCase()));

    if (matched) {
      score += 0.08;
      reasons.push(`Description matches ${report.hazard_type} terminology`);
    }
  } else if (text.length > 0 && text.length < 10) {
    score -= 0.05;
    reasons.push(`Very brief description (${text.length} chars)`);
  }

  // --- Group 4: Media Features ---
  if (report.media_url) {
    score += 0.10;
    reasons.push(`Visual media attached`);
  }
  if (report.is_duplicate) {
    score -= 0.30;
    reasons.push(`Duplicate report detected: ${report.duplicate_reason || 'Matching media/location'}`);
  }

  // --- Group 5: Corroboration Features ---
  const corroboration = calculateCorroboration(report, allReports, 5.0, 6.0);
  if (corroboration.corroboratingCount >= 3) {
    score += 0.20;
    reasons.push(`High spatial-temporal corroboration (${corroboration.corroboratingCount} nearby reports)`);
  } else if (corroboration.corroboratingCount >= 1) {
    score += 0.10;
    reasons.push(`Corroborated by ${corroboration.corroboratingCount} independent report`);
  }

  // --- Group 6: Reporter Reputation Features ---
  if (reporter) {
    const total = reporter.total_reports || 0;
    const verified = reporter.verified_reports || 0;
    if (total >= 3) {
      const repRate = verified / total;
      if (repRate >= 0.75) {
        score += 0.15;
        reasons.push(`Trusted reporter (${(repRate * 100).toFixed(0)}% historic verification rate)`);
      } else if (repRate < 0.25) {
        score -= 0.20;
        reasons.push(`Low reporter reliability (<25% past verification)`);
      }
    }
  }

  // --- Group 7: External Marine Weather Validation ---
  try {
    const marine = await getMarineData(report.latitude, report.longitude);
    if (marine && (report.hazard_type === 'high-waves' || report.hazard_type === 'storm-surge')) {
      if (marine.waveHeight >= 2.5 || (report.severity === 'Severe' && marine.waveHeight >= 2.0)) {
        score += 0.12;
        reasons.push(`Marine sensor confirms rough sea (Wave height: ${marine.waveHeight}m)`);
      } else if (marine.waveHeight < 0.8 && (report.severity === 'High' || report.severity === 'Severe')) {
        score -= 0.15;
        reasons.push(`Marine sensor reports calm waters (Wave height: ${marine.waveHeight}m)`);
      }
    }
  } catch (err) {
    // Graceful skip
  }

  // Clamp final score between 0.05 and 0.98
  const finalScore = Math.max(0.05, Math.min(0.98, score));

  return {
    score: parseFloat(finalScore.toFixed(3)),
    confidenceLevel: finalScore >= 0.75 ? 'HIGH' : finalScore >= 0.45 ? 'MODERATE' : 'LOW',
    reasons: reasons.slice(0, 4) // Top 4 most salient reasons
  };
}

module.exports = {
  computeCredibilityScore
};
