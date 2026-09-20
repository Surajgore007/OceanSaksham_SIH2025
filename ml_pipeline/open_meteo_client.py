"""
Open-Meteo Marine API Client
Fetches real-time or cached marine wave and wind conditions for coastal locations.
"""
import urllib.request
import json
import time

_cache = {}

def get_marine_weather(latitude: float, longitude: float) -> dict:
    key = f"{round(latitude, 2)},{round(longitude, 2)}"
    now = time.time()
    
    if key in _cache and (now - _cache[key]["ts"] < 3600):
        return _cache[key]["data"]

    url = f"https://marine-api.open-meteo.com/v1/marine?latitude={latitude:.2f}&longitude={longitude:.2f}&current=wave_height,wave_direction,wave_period,wind_wave_height&timezone=auto"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "OceanSaksham-Academic-Study/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode("utf-8"))
            current = data.get("current", {})
            res = {
                "wave_height": current.get("wave_height", 1.2),
                "wave_direction": current.get("wave_direction", 180),
                "wave_period": current.get("wave_period", 7.0),
                "wind_wave_height": current.get("wind_wave_height", 0.8),
                "source": "Open-Meteo API"
            }
            _cache[key] = {"ts": now, "data": res}
            return res
    except Exception as e:
        # Realistic empirical coastal baseline
        res = {
            "wave_height": 1.4,
            "wave_direction": 200,
            "wave_period": 7.5,
            "wind_wave_height": 0.9,
            "source": "Synthetic Fallback"
        }
        _cache[key] = {"ts": now, "data": res}
        return res
