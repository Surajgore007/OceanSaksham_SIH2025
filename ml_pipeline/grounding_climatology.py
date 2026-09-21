"""
Climatological Marine Model Sanity Check
Queries Open-Meteo Marine Archive API for multi-year historical baselines (2018-2022)
compared against Cyclone Biparjoy (June 15, 2023) and Cyclone Michaung (Dec 4, 2023).
"""

import urllib.request
import json
import statistics

LOCATIONS = {
    "Jakhau_Gujarat": {
        "lat": 23.23,
        "lng": 68.60,
        "storm_date": "2023-06-15",
        "storm_name": "Cyclone Biparjoy (Landfall)",
        "baseline_dates": [f"{year}-06-15" for year in range(2018, 2023)]
    },
    "Chennai_TamilNadu": {
        "lat": 13.08,
        "lng": 80.27,
        "storm_date": "2023-12-04",
        "storm_name": "Cyclone Michaung (Near-Coast Track)",
        "baseline_dates": [f"{year}-12-04" for year in range(2018, 2023)]
    }
}

def fetch_day_wave_stats(lat, lng, date_str):
    url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lng}&start_date={date_str}&end_date={date_str}&hourly=wave_height,wave_period&timezone=auto"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'OceanSaksham-Climatology-Check/1.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            heights = [h for h in data.get('hourly', {}).get('wave_height', []) if h is not None]
            if heights:
                return {"mean": statistics.mean(heights), "max": max(heights), "valid": True}
    except Exception as e:
        print(f"Error fetching {date_str}: {e}")
    return {"mean": 0.0, "max": 0.0, "valid": False}

def run_climatology():
    print("=" * 60)
    print("Open-Meteo Marine Multi-Year Climatology Check (2018-2022 vs 2023 Storms)")
    print("=" * 60)

    summary = {}
    for loc_key, cfg in LOCATIONS.items():
        print(f"\nAnalyzing {loc_key} ({cfg['lat']}, {cfg['lng']})...")
        # Storm day stats
        storm_stats = fetch_day_wave_stats(cfg['lat'], cfg['lng'], cfg['storm_date'])
        
        # Baseline years (2018-2022)
        baseline_means = []
        for b_date in cfg['baseline_dates']:
            b_stat = fetch_day_wave_stats(cfg['lat'], cfg['lng'], b_date)
            if b_stat['valid']:
                baseline_means.append(b_stat['mean'])
                print(f"  Baseline {b_date}: Mean Hs = {round(b_stat['mean'], 2)}m, Max Hs = {round(b_stat['max'], 2)}m")
                
        multi_year_median = statistics.median(baseline_means) if baseline_means else 0.0
        multi_year_mean = statistics.mean(baseline_means) if baseline_means else 0.0
        
        summary[loc_key] = {
            "storm_name": cfg['storm_name'],
            "storm_date": cfg['storm_date'],
            "storm_mean_hs": round(storm_stats['mean'], 2),
            "storm_max_hs": round(storm_stats['max'], 2),
            "climatological_5yr_mean_hs": round(multi_year_mean, 2),
            "climatological_5yr_median_hs": round(multi_year_median, 2),
            "baseline_years_means": [round(m, 2) for m in baseline_means]
        }
        
        print(f"  --> {cfg['storm_name']} on {cfg['storm_date']}: Mean Hs = {round(storm_stats['mean'], 2)}m (Max = {round(storm_stats['max'], 2)}m)")
        print(f"  --> 5-Year Same-Date Baseline (2018-2022): Mean = {round(multi_year_mean, 2)}m, Median = {round(multi_year_median, 2)}m")

    with open("ml_pipeline/climatology_marine_results.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("\n" + "=" * 60)
    print("Climatology results saved to ml_pipeline/climatology_marine_results.json")

if __name__ == "__main__":
    run_climatology()
