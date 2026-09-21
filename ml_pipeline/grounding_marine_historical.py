"""
Historical Marine Telemetry & Extreme Weather Comparison
Queries Open-Meteo Historical Marine Archive API for known cyclone landfall dates:
- Cyclone Biparjoy (June 14-15, 2023, Gujarat Coast)
- Cyclone Michaung (Dec 3-4, 2023, Chennai/Andhra Coast)
vs calm baseline days at the same coastal coordinates.
"""

import urllib.request
import json

HISTORICAL_EVENTS = [
    {
        "event": "Cyclone Biparjoy (Extreme Storm)",
        "location": "Jakhau Coast, Gujarat",
        "lat": 23.23,
        "lng": 68.60,
        "date": "2023-06-15",
        "expected_state": "Severe (>2.5m)"
    },
    {
        "event": "Calm Baseline Day (Post-Monsoon)",
        "location": "Jakhau Coast, Gujarat",
        "lat": 23.23,
        "lng": 68.60,
        "date": "2023-11-15",
        "expected_state": "Calm (<1.3m)"
    },
    {
        "event": "Cyclone Michaung (Severe Storm)",
        "location": "Chennai Coast, Tamil Nadu",
        "lat": 13.08,
        "lng": 80.27,
        "date": "2023-12-04",
        "expected_state": "Severe (>2.5m)"
    },
    {
        "event": "Calm Baseline Day (Pre-Monsoon)",
        "location": "Chennai Coast, Tamil Nadu",
        "lat": 13.08,
        "lng": 80.27,
        "date": "2023-04-15",
        "expected_state": "Calm (<1.3m)"
    }
]

def fetch_historical_marine():
    print("=" * 60)
    print("Open-Meteo Historical Marine Data Sanity Check")
    print("=" * 60)
    
    results = []
    for item in HISTORICAL_EVENTS:
        url = f"https://marine-api.open-meteo.com/v1/marine?latitude={item['lat']}&longitude={item['lng']}&start_date={item['date']}&end_date={item['date']}&hourly=wave_height,wave_period,wind_wave_height&timezone=auto"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'OceanSaksham-Historical-Check/1.0'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                hourly = data.get('hourly', {})
                wave_heights = [h for h in hourly.get('wave_height', []) if h is not None]
                if wave_heights:
                    max_hs = max(wave_heights)
                    mean_hs = sum(wave_heights) / len(wave_heights)
                else:
                    max_hs, mean_hs = 0.0, 0.0
                
                state = "Calm (<1.3m)" if mean_hs < 1.3 else ("Moderate (1.3-2.5m)" if mean_hs < 2.5 else "Rough/Severe (>2.5m)")
                res = {
                    "event": item['event'],
                    "location": item['location'],
                    "date": item['date'],
                    "lat": item['lat'],
                    "lng": item['lng'],
                    "max_wave_height_m": round(max_hs, 2),
                    "mean_wave_height_m": round(mean_hs, 2),
                    "categorized_sea_state": state,
                    "rule_behavior": "CORRECT" if (("Severe" in state and "Severe" in item['expected_state']) or ("Calm" in state and "Calm" in item['expected_state'])) else "MISMATCH"
                }
                results.append(res)
                print(f"[{item['event']}] {item['location']} ({item['date']})")
                print(f"  Coords: ({item['lat']}, {item['lng']}) | Max Hs: {max_hs}m | Mean Hs: {round(mean_hs, 2)}m | Categorized: {state}")
        except Exception as e:
            print(f"[{item['event']}] Error fetching: {e}")
            
    with open("ml_pipeline/historical_marine_check.json", "w") as f:
        json.dump(results, f, indent=2)
    print("=" * 60)
    print("Historical check completed and saved.")

if __name__ == "__main__":
    fetch_historical_marine()
