"""
Feature Extraction Engine for OceanSaksham Credibility & Triage Model
Extracts 7 feature groups (Location, Time, Text, Media, Corroboration, Reporter, External Marine).
"""
import math
import json
from datetime import datetime

# Reference coastline anchors for Indian coastal perimeter
COASTAL_ANCHORS = [
    (18.9220, 72.8347), (18.6414, 72.8722), (13.0827, 80.2707), (10.7672, 79.8424),
    (17.6868, 83.2185), (9.9312, 76.2673), (11.2588, 75.7804), (19.8135, 85.8312),
    (20.3165, 86.6114), (21.6266, 87.5074), (21.1140, 72.6468), (21.6417, 69.6293),
    (12.9141, 74.8560), (15.4909, 73.8278)
]

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    return 2.0 * R * math.asin(math.sqrt(max(0.0, min(1.0, a))))

def min_dist_to_coastline(lat, lng):
    return min(haversine_km(lat, lng, clat, clng) for clat, clng in COASTAL_ANCHORS)

KEYWORD_MAP = {
    "flood": ["water", "flood", "submerged", "inundation", "overflow", "पानी", "पूर", "வெள்ளம்", "వరద", "বন্যা", "પાણી"],
    "high-waves": ["wave", "swell", "rough", "sea", "surge", "लाट", "तरंग", "அலை", "తరంగాలు", "ঢেউ"],
    "tsunami": ["tsunami", "earthquake", "withdrawal", "tidal", "सुनामी", "சுனாமி"],
    "storm-surge": ["storm", "cyclone", "surge", "gale", "चक्रीवादळ", "புயல்", "తుఫాను", "ঘূর্ণিঝড়"],
    "coastal-erosion": ["erosion", "shoreline", "collapsed", "damage", "धूप", "அரிப்பு", "కోత", "ক্ষয়"]
}

SEVERITY_SCALE = {"Low": 1.0, "Moderate": 2.0, "High": 3.0, "Severe": 4.0}

def extract_features_for_dataset(reports):
    """
    Transforms list of raw report dictionaries into dense feature matrices.
    Returns: X (feature vectors), y (binary label: 1=VERIFIED, 0=REJECTED/UNCERTAIN), feature_names
    """
    feature_names = [
        # Location (4)
        "loc_log_gps_acc", "loc_exif_dist_km", "loc_has_valid_exif", "loc_dist_to_coast_km",
        # Time (3)
        "time_log_delta_min", "time_sin_hour", "time_cos_hour",
        # Text (3)
        "text_log_length", "text_keyword_match", "text_is_english",
        # Media (2)
        "media_has_visual", "media_is_duplicate",
        # Corroboration (2)
        "corrob_count_5km_6h", "corrob_type_agreement_ratio",
        # Reporter (2)
        "rep_reputation_score", "rep_log_prior_volume",
        # External Marine (3)
        "ext_wave_height_m", "ext_wind_speed_kmh", "ext_wave_severity_interaction"
    ]

    # Pre-index media hashes and spatial-temporal points for fast corroboration
    seen_media_hashes = set()
    features = []
    labels = []
    metadata = []

    # Sort reports chronologically by server timestamp
    sorted_reports = sorted(reports, key=lambda r: r.get("server_timestamp", ""))

    for i, rep in enumerate(sorted_reports):
        # 1. Location Group
        acc = rep.get("gps_accuracy", 15.0)
        loc_log_gps_acc = math.log1p(acc)
        
        has_exif = 1.0 if rep.get("exif_valid") and rep.get("exif_lat") and rep.get("exif_lng") else 0.0
        exif_dist = 0.0
        if has_exif:
            exif_dist = haversine_km(rep["latitude"], rep["longitude"], rep["exif_lat"], rep["exif_lng"])
        loc_dist_to_coast = min_dist_to_coastline(rep["latitude"], rep["longitude"])

        # 2. Time Group
        time_delta_sec = rep.get("time_delta_sec", 60)
        time_log_delta_min = math.log1p(abs(time_delta_sec) / 60.0)
        
        try:
            dev_dt = datetime.fromisoformat(rep["device_timestamp"])
            hour = dev_dt.hour + dev_dt.minute / 60.0
        except Exception:
            hour = 12.0
        time_sin_hour = math.sin(2.0 * math.pi * hour / 24.0)
        time_cos_hour = math.cos(2.0 * math.pi * hour / 24.0)

        # 3. Text Group
        desc = rep.get("description", "")
        text_log_length = math.log1p(len(desc))
        kws = KEYWORD_MAP.get(rep.get("hazard_type", ""), [])
        desc_lower = desc.lower()
        text_keyword_match = 1.0 if any(kw.lower() in desc_lower for kw in kws) else 0.0
        text_is_english = 1.0 if rep.get("text_lang", "en") == "en" else 0.0

        # 4. Media Group
        media_has_visual = 1.0 if rep.get("media_url") else 0.0
        m_hash = rep.get("media_hash")
        media_is_duplicate = 0.0
        if m_hash:
            if m_hash in seen_media_hashes:
                media_is_duplicate = 1.0
            seen_media_hashes.add(m_hash)

        # 5. Corroboration Group (lookback over recent reports within 6h and 5km)
        rep_time = datetime.fromisoformat(rep["server_timestamp"]).timestamp()
        corrob_count = 0
        matching_types = 0
        for j in range(max(0, i - 150), i):
            prev = sorted_reports[j]
            prev_time = datetime.fromisoformat(prev["server_timestamp"]).timestamp()
            hours_diff = abs(rep_time - prev_time) / 3600.0
            if hours_diff <= 6.0 and prev.get("reporter_id") != rep.get("reporter_id"):
                d = haversine_km(rep["latitude"], rep["longitude"], prev["latitude"], prev["longitude"])
                if d <= 5.0:
                    corrob_count += 1
                    if prev.get("hazard_type") == rep.get("hazard_type"):
                        matching_types += 1
        
        corrob_type_ratio = (matching_types / corrob_count) if corrob_count > 0 else 0.0

        # 6. Reporter Group
        rep_reputation = rep.get("reporter_reputation", 0.5)
        rep_log_prior_volume = math.log1p(10.0 if rep.get("reporter_type") == "veteran_trusted" else 2.0)

        # 7. External Marine Group
        wave_h = rep.get("wave_height_m", 1.2)
        wind_spd = rep.get("wind_speed_kmh", 20.0)
        sev_num = SEVERITY_SCALE.get(rep.get("severity", "Moderate"), 2.0)
        ext_wave_sev_interaction = wave_h * sev_num

        vec = [
            loc_log_gps_acc, exif_dist, has_exif, loc_dist_to_coast,
            time_log_delta_min, time_sin_hour, time_cos_hour,
            text_log_length, text_keyword_match, text_is_english,
            media_has_visual, media_is_duplicate,
            float(corrob_count), corrob_type_ratio,
            rep_reputation, rep_log_prior_volume,
            wave_h, wind_spd, ext_wave_sev_interaction
        ]

        # Ground truth label (1 if VERIFIED, 0 if REJECTED or UNCERTAIN)
        y = 1 if rep.get("ground_truth") == "VERIFIED" else 0

        features.append(vec)
        labels.append(y)
        metadata.append({
            "id": rep["id"],
            "region": rep.get("region_name", "Coastal India"),
            "coast_split": rep.get("coast_split", "west"),
            "lang": rep.get("text_lang", "en"),
            "ground_truth": rep.get("ground_truth", "REJECTED"),
            "severity": rep.get("severity", "Moderate")
        })

    return features, labels, feature_names, metadata
