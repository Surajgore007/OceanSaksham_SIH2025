"""
Locust Performance Benchmark for OceanSaksham Platform
Simulates concurrent citizen hazard submissions and official console dashboard live updates.
Run with: locust -f evaluation/locustfile.py --headless -u 100 -r 10 -t 60s --host http://localhost:5000
"""
from locust import HttpUser, task, between
import random
import json

HAZARD_TYPES = ["high-waves", "flood", "storm-surge", "coastal-erosion", "tsunami"]
SEVERITIES = ["Low", "Moderate", "High", "Severe"]

class CoastalCitizenUser(HttpUser):
    wait_time = between(1.0, 3.0)

    def on_start(self):
        # Register or login
        self.phone = f"987{random.randint(1000000, 9999999)}"
        res = self.client.post("/api/auth/register", json={
            "name": f"Citizen_{self.phone[-4:]}",
            "phone": self.phone,
            "password": "citizen_pass_123",
            "role": "citizen"
        })
        if res.status_code in [200, 201]:
            self.token = res.json().get("token")
        else:
            self.token = None

    @task(3)
    def submit_hazard_report(self):
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        payload = {
            "hazard_type": random.choice(HAZARD_TYPES),
            "severity": random.choice(SEVERITIES),
            "description": "High sea swells and water breach observed near coastal pier.",
            "text_lang": random.choice(["en", "hi", "mr", "ta", "te"]),
            "latitude": 18.922 + random.uniform(-0.02, 0.02),
            "longitude": 72.834 + random.uniform(-0.02, 0.02),
            "gps_accuracy": random.uniform(5.0, 30.0),
            "device_timestamp": "2025-09-10T12:00:00.000Z",
            "media_url": "https://images.unsplash.com/photo-coastal-test.jpg"
        }
        self.client.post("/api/reports", json=payload, headers=headers)

    @task(1)
    def send_emergency_sos(self):
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.post("/api/sos", json={
            "latitude": 18.922,
            "longitude": 72.834,
            "accuracy": 10.0,
            "source": "GPS"
        }, headers=headers)

class DisasterOfficialUser(HttpUser):
    wait_time = between(0.5, 1.5)

    def on_start(self):
        res = self.client.post("/api/auth/login", json={
            "emailOrPhone": "official@oceansaksham.gov.in",
            "password": "official123",
            "role": "official"
        })
        self.token = res.json().get("token") if res.status_code == 200 else None

    @task(4)
    def poll_triage_queue(self):
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/api/reports?sort_by=credibility&status=PENDING", headers=headers)

    @task(2)
    def get_audit_logs(self):
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        self.client.get("/api/audit-logs", headers=headers)

    @task(1)
    def update_report_status(self):
        if not self.token:
            return
        headers = {"Authorization": f"Bearer {self.token}"}
        # Update a sample report
        self.client.patch("/api/reports/rep_0001/status", json={
            "status": "VERIFIED",
            "reason": "Verified via radar and local observer corroboration"
        }, headers=headers)
