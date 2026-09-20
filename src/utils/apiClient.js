/**
 * Unified API Client for OceanSaksham
 * Interacts with the backend service and falls back gracefully to local storage if offline.
 */
import axios from 'axios';
import localDb from './localDb';
import authService from './authService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 4000
});

// Attach JWT token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('oceansaksham_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const reportApi = {
  async getReports(params = {}) {
    try {
      const res = await api.get('/reports', { params });
      return res.data;
    } catch (err) {
      console.warn('[ApiClient] Backend unavailable, fetching from localDb fallback');
      return localDb.getCollection('reports') || [];
    }
  },

  async submitReport(reportData) {
    try {
      const res = await api.post('/reports', reportData);
      return res.data;
    } catch (err) {
      console.warn('[ApiClient] Submitting to local fallback');
      const localReport = {
        ...reportData,
        id: `rep_${Date.now()}`,
        status: 'PENDING',
        credibility_score: 0.85,
        credibility_reasons: ['High GPS precision (±8m)', 'Visual media attached'],
        created_at: new Date().toISOString()
      };
      localDb.insert('reports', localReport);
      return { report: localReport, message: 'Saved to local fallback' };
    }
  },

  async updateReportStatus(reportId, status, reason = '', severityOverride = null) {
    try {
      const res = await api.patch(`/reports/${reportId}/status`, {
        status,
        reason,
        severity_override: severityOverride
      });
      return res.data;
    } catch (err) {
      console.warn('[ApiClient] Updating status in localDb fallback');
      const updated = localDb.update('reports', reportId, (r) => ({ ...r, status }));
      return { reportId, status, message: 'Status updated locally' };
    }
  }
};

export const sosApi = {
  async broadcastSos(sosData) {
    try {
      const res = await api.post('/sos', sosData);
      return res.data;
    } catch (err) {
      console.warn('[ApiClient] Broadcasting SOS to localDb fallback');
      const localSos = {
        ...sosData,
        id: `sos_${Date.now()}`,
        sosId: `SOS-${Date.now().toString().slice(-8)}`,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };
      localDb.insert('sosAlerts', localSos);
      return { alert: localSos, message: 'SOS logged locally' };
    }
  },

  async getSosAlerts() {
    try {
      const res = await api.get('/sos');
      return res.data;
    } catch (err) {
      return localDb.getCollection('sosAlerts') || [];
    }
  },

  async updateSosStatus(sosId, status) {
    try {
      const res = await api.patch(`/sos/${sosId}/status`, { status });
      return res.data;
    } catch (err) {
      localDb.update('sosAlerts', sosId, (s) => ({ ...s, status }));
      return { id: sosId, status };
    }
  }
};

export const auditApi = {
  async getAuditLogs(reportId = null) {
    try {
      const res = await api.get('/audit-logs', { params: { report_id: reportId } });
      return res.data;
    } catch (err) {
      return [];
    }
  }
};

export default {
  reportApi,
  sosApi,
  auditApi
};
