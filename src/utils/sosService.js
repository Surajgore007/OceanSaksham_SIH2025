import authService from './authService';
import localDb from './localDb';
import locationService from './locationService';
import realTimeService from './realTimeService';

const SOS_COLLECTION = 'sosAlerts';
const DENIED_MESSAGE = 'Location permission is required to send your SOS location.';

const getReporterInfo = () => {
  const user = authService.getCurrentUser();
  if (!user) return null;

  return {
    userId: user.id,
    name: user.name,
    phone: user.phone || null,
    email: user.email || null,
  };
};

const getCachedNonFallbackLocation = () => {
  const cached = locationService.getCachedPosition?.();
  return cached && !cached.isFallback ? cached : null;
};

const getEmergencyLocation = async () => {
  if (!locationService.isGeolocationAvailable()) {
    throw new Error('Geolocation is not available in this browser. Please use a secure connection and enable location services.');
  }

  const permissionStatus = await locationService.checkPermissionStatus();
  if (permissionStatus === 'denied') {
    throw new Error(DENIED_MESSAGE);
  }

  const strategies = [
    {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    },
    {
      enableHighAccuracy: false,
      timeout: 16000,
      maximumAge: 60000,
    },
  ];

  let lastError = null;
  for (const strategy of strategies) {
    try {
      const rawPosition = await locationService.executePositioningStrategy(strategy, false);
      if (locationService.isValidPosition(rawPosition)) {
        const position = locationService.formatPosition(rawPosition);
        locationService.cachePosition(position);
        return position;
      }
    } catch (error) {
      lastError = error;
      if (error?.code === 1) {
        throw new Error(DENIED_MESSAGE);
      }
    }
  }

  const cached = getCachedNonFallbackLocation();
  if (cached) {
    return { ...cached, source: `${cached.source || 'Cached'} Cached`, isCached: true };
  }

  throw new Error(lastError?.message || 'Unable to get your GPS location. Please try again.');
};

const notifySosListeners = () => {
  realTimeService.notifyListeners('sosAlerts', localDb.getCollection(SOS_COLLECTION));
};

export async function createSosAlert() {
  const location = await getEmergencyLocation();
  const nowIso = new Date().toISOString();
  const reporter = getReporterInfo();

  const alert = {
    id: `sos_${Date.now()}`,
    sosId: `SOS-${Date.now().toString().slice(-8)}`,
    latitude: location.latitude,
    longitude: location.longitude,
    accuracy: location.accuracy,
    timestamp: nowIso,
    status: 'ACTIVE',
    source: location.source || 'GPS',
    isCachedLocation: !!location.isCached,
    reporter,
    location: {
      address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
        lat: location.latitude,
        lng: location.longitude,
      },
      lat: location.latitude,
      lng: location.longitude,
      accuracy: location.accuracy,
      timestamp: location.timestamp,
    },
    acknowledgedAt: null,
    acknowledgedBy: null,
    resolvedAt: null,
    resolvedBy: null,
  };

  localDb.insert(SOS_COLLECTION, alert);
  notifySosListeners();
  return alert;
}

export function getSosAlerts() {
  return localDb.getCollection(SOS_COLLECTION);
}

export function updateSosStatus(id, status, officialName) {
  const nowIso = new Date().toISOString();
  const updated = localDb.update(SOS_COLLECTION, id, (alert) => ({
    ...alert,
    status,
    ...(status === 'ACKNOWLEDGED'
      ? { acknowledgedAt: nowIso, acknowledgedBy: officialName }
      : {}),
    ...(status === 'RESOLVED'
      ? { resolvedAt: nowIso, resolvedBy: officialName }
      : {}),
  }));

  notifySosListeners();
  return updated;
}

export default {
  createSosAlert,
  getSosAlerts,
  updateSosStatus,
};
