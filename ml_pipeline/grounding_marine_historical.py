"""
Historical Marine Model Sanity Check with Same-Season Pre-Storm Baselines
Queries Open-Meteo Marine Archive API for:
1. Cyclone Biparjoy (June 15, 2023, Jakhau, Gujarat) vs Pre-Storm Same-Season Baseline (June 7, 2023)
2. Cyclone Michaung (Dec 4, 2023, Chennai, Tamil Nadu) vs Pre-Storm Same-Season Baseline (Nov 26, 2023)
"""

import urllib.request
import json

HISTORICAL_EVENTS = [
    {
        "event": "Cyclone Biparjoy (Landfall Day)",
        "location": "Jakhau Coast, Gujarat",
        "lat": 23.23,
        "lng": 68.60,
        "date": "2023-06-15",
        "expected_state": "Severe (>2.5m)"
    },
    {
        "event": "Pre-Biparjoy Same-Season Baseline (1 Week Prior)",
        "location": "Jakhau Coast, Gujarat",
        "lat": 23.23,
        "lng": 68.60,
        "date": "2023-06-07",
        "expected_state": "Moderate/Calm (<2.5m)"
    },
    {
        "event": "Cyclone Michaung (Near-Coast Offshore Track)",
        "location": "Chennai Coast, Tamil Nadu",
        "lat": 13.08,
        "lng": 80.27,
        "date": "2023-12-04",
        "expected_state": "Severe/Marginal (>2.5m)"
    },
    {
        "event": "Pre-Michaung Same-Season Baseline (1 Week Prior)",
        "location": "Chennai Coast, Tamil Nadu",
        "lat": 13.08,
        "lng": 80.27,
        "date": "2023-11-26",
        "expected_state": "Calm (<1.3m)"
    }
]

def run_check():
    print("=" * 60)
    print("Open-Meteo Marine Model Historical Sanity Check")
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
                    "categorized_sea_state": state
                }
                results.append(res)
                print(f"[{item['event']}] {item['location']} ({item['date']})")
                print(f"  Coords: ({item['lat']}, {item['lng']}) | Max Hs: {max_hs}m | Mean Hs: {round(mean_hs, 2)}m | Categorized: {state}")
        except Exception as e:
            print(f"[{item['event']}] Error fetching: {e}")
            
    with open("ml_pipeline/historical_marine_check.json", "w") as f:
        json.dump(results, f, indent=2)
    print("=" * 60)
    print("Sanity check completed and saved to ml_pipeline/historical_marine_check.json")

if __name__ == "__main__":
    run_check()
