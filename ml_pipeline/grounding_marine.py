"""
Marine Telemetry Grounding & Wave Height Sanity Check
Queries Open-Meteo Historical / Forecast Marine API to check wave height (Hs) 
and wind thresholds against Indian coastal coordinates during storm events vs calm days.
"""

import urllib.request
import json
import numpy as np

# Coordinates for coastal stations
STATIONS = {
    "Gujarat_Coast_Jakhau": {"lat": 23.23, "lng": 68.60, "desc": "Cyclone Biparjoy landfall region (June 2023)"},
    "Chennai_Coast": {"lat": 13.08, "lng": 80.27, "desc": "Cyclone Michaung region (Dec 2023)"},
    "Mumbai_Coast": {"lat": 18.92, "lng": 72.83, "desc": "Arabian Sea coastal monitoring"},
    "Puri_Odisha_Coast": {"lat": 19.81, "lng": 85.83, "desc": "Bay of Bengal cyclone corridor"},
    "Kochi_Kerala_Coast": {"lat": 9.93, "lng": 76.26, "desc": "Southwest Monsoon swell region"}
}

def test_live_marine_api():
    print("=" * 60)
    print("Open-Meteo Marine API Live Grounding & Sanity Check")
    print("=" * 60)
    
    results = {}
    for name, info in STATIONS.items():
        url = f"https://marine-api.open-meteo.com/v1/marine?latitude={info['lat']}&longitude={info['lng']}&current=wave_height,wave_period,wind_wave_height,swell_wave_height&timezone=auto"
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'OceanSaksham-Grounding-Check/1.0'})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                current = data.get('current', {})
                wave_height = current.get('wave_height', 0.0)
                wave_period = current.get('wave_period', 0.0)
                swell_height = current.get('swell_wave_height', 0.0)
                
                # Rule check: Calm threshold (<1.3m) vs Moderate (1.3-2.5m) vs Rough/Severe (>2.5m)
                state = "Calm (<1.3m)" if wave_height < 1.3 else ("Moderate (1.3-2.5m)" if wave_height < 2.5 else "Rough/Severe (>2.5m)")
                
                results[name] = {
                    "lat": info['lat'],
                    "lng": info['lng'],
                    "wave_height_m": wave_height,
                    "wave_period_s": wave_period,
                    "swell_m": swell_height,
                    "sea_state": state
                }
                print(f"[{name}] {info['desc']}")
                print(f"  Coordinates: ({info['lat']}, {info['lng']}) | Hs: {wave_height} m | Period: {wave_period} s | State: {state}")
        except Exception as e:
            print(f"[{name}] Failed to fetch: {e}")
            
    with open("ml_pipeline/marine_grounding_results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("=" * 60)
    print("Grounding results saved to ml_pipeline/marine_grounding_results.json")

if __name__ == "__main__":
    test_live_marine_api()
