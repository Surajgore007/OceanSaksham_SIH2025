"""
Realistic Synthetic Coastal Hazard Dataset Generator with Complex Noise & Multi-Region Partitions.
Generates 1,000 synthetic records with authentic native text descriptions, realistic maritime GPS degradation,
adversarial hoaxes, stripped EXIF metadata, overlapping wave heights, and geographic split (West vs East).
"""
import random
import json
import csv
import hashlib
from datetime import datetime, timedelta

random.seed(42)

WEST_COAST_REGIONS = [
    {"name": "Mumbai, Maharashtra", "lat": 18.9220, "lng": 72.8347, "lang": "mr", "coast": "west"},
    {"name": "Alibaug, Maharashtra", "lat": 18.6414, "lng": 72.8722, "lang": "mr", "coast": "west"},
    {"name": "Surat, Gujarat", "lat": 21.1140, "lng": 72.6468, "lang": "gu", "coast": "west"},
    {"name": "Porbandar, Gujarat", "lat": 21.6417, "lng": 69.6293, "lang": "gu", "coast": "west"},
    {"name": "Kochi, Kerala", "lat": 9.9312, "lng": 76.2673, "lang": "ml", "coast": "west"},
    {"name": "Kozhikode, Kerala", "lat": 11.2588, "lng": 75.7804, "lang": "ml", "coast": "west"},
    {"name": "Panaji, Goa", "lat": 15.4909, "lng": 73.8278, "lang": "hi", "coast": "west"},
    {"name": "Mangalore, Karnataka", "lat": 12.9141, "lng": 74.8560, "lang": "en", "coast": "west"}
]

EAST_COAST_REGIONS = [
    {"name": "Chennai, Tamil Nadu", "lat": 13.0827, "lng": 80.2707, "lang": "ta", "coast": "east"},
    {"name": "Nagapattinam, Tamil Nadu", "lat": 10.7672, "lng": 79.8424, "lang": "ta", "coast": "east"},
    {"name": "Visakhapatnam, Andhra Pradesh", "lat": 17.6868, "lng": 83.2185, "lang": "te", "coast": "east"},
    {"name": "Kakinada, Andhra Pradesh", "lat": 16.9891, "lng": 82.2475, "lang": "te", "coast": "east"},
    {"name": "Puri, Odisha", "lat": 19.8135, "lng": 85.8312, "lang": "or", "coast": "east"},
    {"name": "Paradip, Odisha", "lat": 20.3165, "lng": 86.6114, "lang": "or", "coast": "east"},
    {"name": "Digha, West Bengal", "lat": 21.6266, "lng": 87.5074, "lang": "bn", "coast": "east"}
]

ALL_REGIONS = WEST_COAST_REGIONS + EAST_COAST_REGIONS
HAZARDS = ["high-waves", "flood", "storm-surge", "coastal-erosion", "tsunami"]

MULTILINGUAL_TEXT = {
    "en": {
        "high-waves": ["Dangerous rough waves exceeding 4 meters breaching sea wall near fishing jetty.", "Severe swells observed along the promenade, small boats unable to anchor."],
        "flood": ["Tidal seawater inundating low-lying residential houses near beach.", "High tide flooding entered coastal market area."],
        "storm-surge": ["Severe storm surge and cyclonic gale winds hitting the harbor.", "Storm surge pushing sea water 200m inland."],
        "coastal-erosion": ["Rapid cliff collapse and sand dune destruction after heavy tides.", "Shoreline erosion threatening coastal road."],
        "tsunami": ["Abnormal sudden withdrawal of sea water observed followed by rising wave wall."],
        "false": ["Sunny clear weather at beach having fun with friends.", "Hotel discount booking promotion near seaside."]
    },
    "hi": {
        "high-waves": ["तटीय क्षेत्र में 4 मीटर से ऊंची खतरनाक लहरें उठ रही हैं।", "समुद्र में भारी उफान, नावों का संचालन पूरी तरह ठप।"],
        "flood": ["समुद्र का पानी तटीय बस्तियों में घुस गया है, भारी जलभराव।", "ज्वार के कारण तटीय सड़कों पर पानी भर गया है।"],
        "storm-surge": ["चक्रवाती हवाओं के साथ समुद्र में भारी जल स्तर वृद्धि।", "तूफानी लहरों से तटीय सुरक्षा दीवार टूट गई।"],
        "coastal-erosion": ["समुद्री कटाव के कारण तट की सुरक्षा दीवार ढह गई है।", "तटीय भूमि का तेजी से क्षरण हो रहा है।"],
        "tsunami": ["समुद्र का पानी अचानक असामान्य रूप से पीछे हट गया है।"],
        "false": ["समुद्र किनारे होटल बुकिंग के लिए संपर्क करें।", "मौसम साफ और धूप खिली है।"]
    },
    "mr": {
        "high-waves": ["समुद्रकिनारी ४ मीटरपेक्षा उंच लाटा उसळत आहेत, मच्छीमारांना धोका.", "धक्कादायक लाटांचा जोर वाढला असून जेटीवर पाणी आले आहे."],
        "flood": ["उधाणाचे पाणी गावातील घरांमध्ये शिरले असून रस्ते पाण्याखाली गेले आहेत.", "समुद्राचे पाणी सखल भागात भरले."],
        "storm-surge": ["चक्रीवादळामुळे समुद्राच्या पाण्याची पातळी अचानक प्रचंड वाढली आहे.", "वादळी उधाणामुळे किनारपट्टीवर गंभीर स्थिती."],
        "coastal-erosion": ["लाटांच्या माऱ्याने समुद्रकिनाऱ्याची धूप वेगाने होत आहे.", "तटबंदी कोसळून धूप सुरू."],
        "tsunami": ["समुद्राचे पाणी अचानक मागे गेले असून धोक्याची शक्यता आहे."],
        "false": ["बीच रिसॉर्ट बुकिंगसाठी आजच कॉल करा.", "किनारी फिरायला छान वातावरण आहे."]
    },
    "ta": {
        "high-waves": ["கடற்கரையில் 4 மீட்டருக்கும் அதிகமான உயரமான கடல் அலைகள் சீறுகின்றன.", "மீன்பிடி தளத்தில் அலைகளின் சீற்றம் அதிகம்."],
        "flood": ["கடல் நீர் ஊருக்குள் புகுந்து குடியிருப்பு பகுதிகளை சூழ்ந்துள்ளது.", "கடல் நீர் பெருக்கெடுத்து வீடுகளுக்குள் புகுந்தது."],
        "storm-surge": ["புயல் காற்றுடன் கடல் அலைகள் கடும் வேகத்துடன் ஊருக்குள் நுழைகின்றன.", "புயல் சீற்றத்தால் கடல் நீர்மட்டம் உயர்வு."],
        "coastal-erosion": ["கடல் அரிப்பினால் கடற்கரை சாலை சேதமடைந்துள்ளது.", "நிலப்பரப்பை கடல் அரித்துச் செல்கிறது."],
        "tsunami": ["கடல் நீர் திடீரென உள்வாங்கி காணப்படுகிறது, எச்சரிக்கை தேவை."],
        "false": ["சுற்றுலா படகு சவாரி மற்றும் விடுதி முன்பதிவு.", "கடற்கரையில் இனிமையான காற்று வீசுகிறது."]
    },
    "te": {
        "high-waves": ["సముద్రంలో 4 మీటర్ల ఎత్తున అలలు ఎగసిపడుతున్నాయి.", "తీరప్రాంతంలో అలల తీవ్రత పెరిగింది."],
        "flood": ["సముద్రపు నీరు గ్రామంలోకి ప్రవేశించి ఇళ్లను ముంచెత్తింది.", "తీరప్రాంత రహదారులు వరద నీటితో జలమయం."],
        "storm-surge": ["తుఫాను ప్రభావంతో సముద్రపు పోటు తీవ్రంగా పెరిగింది.", "తీరప్రాంత రక్షణ గోడ దెబ్బతింది."],
        "coastal-erosion": ["సముద్ర కోత కారణంగా తీరప్రాంత భూమి కొట్టుకుపోతోంది.", "తీరప్రాంతంలో తీవ్రమైన కోత."],
        "tsunami": ["సముద్రపు నీరు అకస్మాత్తుగా వెనక్కి తగ్గింది."],
        "false": ["బీచ్ రిసార్ట్ ఆఫర్లు మరియు బుకింగ్.", "వాతావరణం చాలా ప్రశాంతంగా ఉంది."]
    },
    "or": {
        "high-waves": ["ସମୁଦ୍ରରେ ୪ ମିଟରରୁ ଅଧିକ ଉଚ୍ଚ ଲହଡ଼ି ମାଡ଼ି ଆସୁଛି ।", "ବେଳାଭୂମିରେ ପ୍ରବଳ ଢେଉର ପ୍ରକୋପ ।"],
        "flood": ["ଜୁଆର ପାଣି ତଟବର୍ତ୍ତୀ ଗାଁ ଭିତରେ ପଶି ଜଳବନ୍ଦୀ କରିଛି ।", "ସମୁଦ୍ର ପାଣି ଘରେ ପଶିଗଲା ।"],
        "storm-surge": ["ବାତ୍ୟା ଯୋଗୁଁ ସମୁଦ୍ରରେ ପ୍ରଳୟଙ୍କରୀ ଜୁଆର ମାଡ଼ି ଆସୁଛି ।"],
        "coastal-erosion": ["ସମୁଦ୍ର କୂଳ ଲଗାତାର ଧୋଇ ହୋଇ ନଷ୍ଟ ହେଉଛି ।"],
        "tsunami": ["ସମୁଦ୍ର ପାଣି ହଠାତ୍ ପଛକୁ ହଟି ଯାଇଛି ।"],
        "false": ["ପୁରୀ ହୋଟେଲ ବୁକିଂ ପାଇଁ ଯୋଗାଯୋଗ କରନ୍ତୁ ।", "ଆଜି ପାଗ ଖୁବ୍ ଭଲ ଅଛି ।"]
    },
    "bn": {
        "high-waves": ["উপকূলে ৪ মিটারের বেশি উত্তাল ঢেউ উঠছে, বাঁধ উপচে জল ঢুকছে।", "উত্তাল সমুদ্রের ঢেউতে মাছ ধরার নৌকা ক্ষতিগ্রস্ত।"],
        "flood": ["জোয়ারের জলে উপকূলীয় গ্রাম প্লাবিত হয়েছে, ঘরে জল ঢুকেছে।", "নোনা জল ঢুকে চাষের জমি প্লাবিত।"],
        "storm-surge": ["ঘূর্ণিঝড়ের প্রভাবে জলোচ্ছ্বাসে বাঁধ ভেঙে জল ঢুকছে।", "প্রচণ্ড জলোচ্ছ্বাস শুরু হয়েছে।"],
        "coastal-erosion": ["সমুদ্রের প্রবল ঢেউয়ে সৈকত ও বাঁধের ব্যাপক ভাঙন শুরু হয়েছে।", "উপকূলরেখা ভেঙে তলিয়ে যাচ্ছে।"],
        "tsunami": ["সমুদ্রের জল আচমকা অনেক দূর পিছিয়ে গেছে।"],
        "false": ["দীঘা সমুদ্র সৈকত হোটেল বুকিং ডিসকাউন্ট।", "আজকে আবহাওয়া খুব ভালো।"]
    },
    "gu": {
        "high-waves": ["દરિયામાં ૪ મીટરથી વધુ ઊંચા મોજા ઉછળી રહ્યા છે.", "જેટી પાસે ભારે મોજાના કારણે નુકસાન."],
        "flood": ["દરિયાના પાણી નીચાણવાળા વિસ્તારોમાં ઘૂસી ગયા છે.", "ભરતીના પાણીથી રસ્તાઓ જળબંબાકાર."],
        "storm-surge": ["વાવાઝોડાના કારણે દરિયાઈ મોજાનું જોર અતિશય વધી ગયું છે."],
        "coastal-erosion": ["દરિયાઈ ધોવાણથી કિનારાની જમીન ધસી પડી છે."],
        "tsunami": ["દરિયાનું પાણી અચાનક પાછળ હટી ગયું છે."],
        "false": ["હોટેલ અને બીચ ટૂર માટે સંપર્ક કરો.", "આજે દરિયાકિનારે રમવાની મજા આવી."]
    },
    "ml": {
        "high-waves": ["തീരത്ത് 4 മീറ്ററിലധികം ഉയരമുള്ള ശക്തമായ തിരമാലകൾ അടിച്ചു കയറുന്നു.", "കടലാക്രമണം ശക്തമായി."],
        "flood": ["കടൽക്ഷോഭത്തെ തുടർന്ന് വീടുകളിൽ വെള്ളം കയറി.", "തീരദേശ റോഡുകൾ വെള്ളത്തിനടിയിലായി."],
        "storm-surge": ["ചുഴലിക്കാറ്റും ശക്തമായ കടൽക്ഷോഭവും തീരത്തെ തകർക്കുന്നു."],
        "coastal-erosion": ["കടലാക്രമണത്തിൽ തീരദേശ സംരക്ഷണ ഭിത്തി തകർന്നു."],
        "tsunami": ["കടൽ പെട്ടെന്ന് ഉൾവലിഞ്ഞു, അടിയന്തര ജാഗ്രത വേണം."],
        "false": ["റിസോർട്ട് ബുക്കിംഗിന് വിളിക്കുക.", "ബീച്ചിൽ നല്ല കാലാവസ്ഥ."]
    }
}

def generate_complex_dataset(num_samples=1000):
    reports = []
    base_time = datetime(2025, 8, 15, 6, 0, 0)
    
    # Reporter pool
    reporters = []
    for i in range(50):
        rep_type = random.choices(["veteran", "regular", "casual", "spammer"], weights=[0.20, 0.45, 0.25, 0.10])[0]
        reporters.append({
            "id": f"usr_{i+1:03d}",
            "type": rep_type,
            "reputation": 0.88 if rep_type == "veteran" else (0.60 if rep_type == "regular" else (0.45 if rep_type == "casual" else 0.20))
        })

    # Cluster centres
    clusters = []
    for reg in random.sample(ALL_REGIONS, 8):
        clusters.append({
            "region": reg,
            "lat": reg["lat"] + random.uniform(-0.02, 0.02),
            "lng": reg["lng"] + random.uniform(-0.02, 0.02),
            "hazard_type": random.choice(["high-waves", "storm-surge", "flood"]),
            "start_time": base_time + timedelta(hours=random.randint(2, 72)),
            "duration_h": random.randint(6, 24),
            "base_wave": random.uniform(2.0, 3.8),
            "base_wind": random.uniform(40.0, 75.0)
        })

    for idx in range(num_samples):
        # 55% True Hazards, 30% False Alarms, 15% Marginal
        category = random.choices(["true_hazard", "false_alarm", "marginal_ambiguous"], weights=[0.55, 0.30, 0.15])[0]
        reporter = random.choice(reporters)

        if category == "true_hazard":
            cluster = random.choice(clusters)
            region = cluster["region"]
            hazard_type = cluster["hazard_type"] if random.random() < 0.85 else random.choice(HAZARDS)
            ground_truth = "VERIFIED"
            
            lat = cluster["lat"] + random.gauss(0, 0.02)
            lng = cluster["lng"] + random.gauss(0, 0.02)
            
            # GPS error noise
            gps_acc = random.uniform(50.0, 150.0) if random.random() < 0.22 else random.uniform(5.0, 25.0)
            
            # EXIF: 50% stripped by messaging apps
            has_exif = random.random() < 0.50
            if has_exif:
                exif_lat = lat + random.gauss(0, 0.004)
                exif_lng = lng + random.gauss(0, 0.004)
                exif_valid = 1
            else:
                exif_lat, exif_lng, exif_valid = None, None, 0

            has_media = random.random() < 0.80
            wave_h = round(cluster["base_wave"] + random.gauss(0, 0.5), 2)
            wind_spd = round(cluster["base_wind"] + random.gauss(0, 8.0), 1)

            event_time = cluster["start_time"] + timedelta(hours=random.uniform(0, cluster["duration_h"]))
            srv_delay_min = random.choices([random.randint(5, 30), random.randint(30, 180), random.randint(180, 480)], weights=[0.60, 0.30, 0.10])[0]
            dev_time = event_time
            srv_time = dev_time + timedelta(minutes=srv_delay_min)
            
            # Native language selection
            lang = region["lang"] if random.random() < 0.70 else random.choice(["en", "hi", region["lang"]])
            pool = MULTILINGUAL_TEXT.get(lang, MULTILINGUAL_TEXT["en"]).get(hazard_type, MULTILINGUAL_TEXT["en"]["high-waves"])
            desc = random.choice(pool)

        elif category == "false_alarm":
            region = random.choice(ALL_REGIONS)
            hazard_type = random.choice(HAZARDS)
            ground_truth = "REJECTED"
            
            is_inland = random.random() < 0.45
            if is_inland:
                lat = region["lat"] + random.uniform(0.08, 0.35)
                lng = region["lng"] + random.uniform(0.08, 0.35)
            else:
                lat = region["lat"] + random.gauss(0, 0.01)
                lng = region["lng"] + random.gauss(0, 0.01)

            gps_acc = random.uniform(3.0, 15.0) if random.random() < 0.60 else random.uniform(40.0, 200.0)

            has_exif = random.random() < 0.35
            if has_exif and is_inland:
                exif_lat = lat + random.uniform(0.05, 0.20)
                exif_lng = lng + random.uniform(0.05, 0.20)
                exif_valid = 1
            else:
                exif_lat, exif_lng, exif_valid = None, None, 0

            has_media = random.random() < 0.50
            wave_h = round(random.uniform(0.4, 1.3), 2)
            wind_spd = round(random.uniform(10.0, 25.0), 1)

            dev_time = base_time + timedelta(hours=random.randint(1, 90))
            srv_time = dev_time + timedelta(minutes=random.randint(10, 300))
            
            lang = region["lang"] if random.random() < 0.70 else "en"
            desc = random.choice(MULTILINGUAL_TEXT.get(lang, MULTILINGUAL_TEXT["en"])["false"])

        else: # marginal_ambiguous
            region = random.choice(ALL_REGIONS)
            hazard_type = random.choice(["flood", "high-waves", "coastal-erosion"])
            ground_truth = random.choice(["VERIFIED", "REJECTED"])
            
            lat = region["lat"] + random.gauss(0, 0.03)
            lng = region["lng"] + random.gauss(0, 0.03)
            gps_acc = random.uniform(20.0, 60.0)
            exif_valid, exif_lat, exif_lng = 0, None, None
            has_media = random.random() < 0.40
            wave_h = round(random.uniform(1.2, 1.8), 2)
            wind_spd = round(random.uniform(25.0, 38.0), 1)
            dev_time = base_time + timedelta(hours=random.randint(1, 80))
            srv_time = dev_time + timedelta(minutes=random.randint(15, 120))
            lang = region["lang"] if random.random() < 0.60 else "en"
            desc = f"Observed water activity near coast in {region['name']}."

        # Media hash
        media_hash = None
        media_url = None
        if has_media:
            if category == "false_alarm" and random.random() < 0.35:
                media_hash = hashlib.sha256(b"viral_recycled_storm_image_2023").hexdigest()
            else:
                media_hash = hashlib.sha256(f"img_{lat:.4f}_{lng:.4f}_{idx}".encode()).hexdigest()
            media_url = f"https://example.com/media_{idx}.jpg"

        report = {
            "id": f"rep_{idx+1:04d}",
            "reporter_id": reporter["id"],
            "reporter_reputation": reporter["reputation"],
            "region_name": region["name"],
            "coast_split": region["coast"],
            "hazard_type": hazard_type,
            "severity": random.choice(["Low", "Moderate", "High", "Severe"]),
            "description": desc,
            "text_lang": lang,
            "latitude": round(lat, 6),
            "longitude": round(lng, 6),
            "gps_accuracy": round(gps_acc, 2),
            "device_timestamp": dev_time.isoformat(),
            "server_timestamp": srv_time.isoformat(),
            "time_delta_sec": int((srv_time - dev_time).total_seconds()),
            "exif_valid": exif_valid,
            "exif_lat": round(exif_lat, 6) if exif_lat else None,
            "exif_lng": round(exif_lng, 6) if exif_lng else None,
            "media_url": media_url,
            "media_hash": media_hash,
            "wave_height_m": wave_h,
            "wind_speed_kmh": wind_spd,
            "ground_truth": ground_truth
        }
        reports.append(report)

    with open("ml_pipeline/reports_dataset.json", "w", encoding="utf-8") as f:
        json.dump(reports, f, indent=2)

    with open("ml_pipeline/reports_dataset.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=reports[0].keys())
        writer.writeheader()
        writer.writerows(reports)

    ver_count = sum(1 for r in reports if r["ground_truth"] == "VERIFIED")
    rej_count = sum(1 for r in reports if r["ground_truth"] == "REJECTED")
    west_count = sum(1 for r in reports if r["coast_split"] == "west")
    east_count = sum(1 for r in reports if r["coast_split"] == "east")

    print(f"Generated {len(reports)} synthetic reports.")
    print(f"Ground Truth: VERIFIED={ver_count}, REJECTED={rej_count}")
    print(f"Spatial Partition: West Coast={west_count}, East Coast={east_count}")

if __name__ == "__main__":
    generate_complex_dataset(1000)
