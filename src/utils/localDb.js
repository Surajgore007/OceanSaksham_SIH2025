// Simple local database utility using localStorage collections
// Collections are stored as JSON arrays under a namespaced key

const COLLECTION_PREFIX = 'oceansaksham_col_';

function getKey(collectionName) {
  return `${COLLECTION_PREFIX}${collectionName}`;
}

export function getCollection(collectionName) {
  try {
    const namespacedRaw = localStorage.getItem(getKey(collectionName));
    const legacyRaw = localStorage.getItem(collectionName);
    
    if (namespacedRaw) {
      const parsed = JSON.parse(namespacedRaw);
      return Array.isArray(parsed) ? parsed : [];
    }
    
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) {
        // Migrate legacy to namespaced
        localStorage.setItem(getKey(collectionName), legacyRaw);
        return parsed;
      }
    }
    
    const memRecords = inMemoryStore.get(collectionName);
    if (memRecords && Array.isArray(memRecords) && memRecords.length > 0) {
      return memRecords;
    }

    return [];
  } catch (e) {
    console.error(`Error reading collection ${collectionName}:`, e);
    return inMemoryStore.get(collectionName) || [];
  }
}

const inMemoryStore = new Map();

export function setCollection(collectionName, records) {
  const safeRecords = Array.isArray(records) ? records : [];
  inMemoryStore.set(collectionName, safeRecords);
  inMemoryStore.set(getKey(collectionName), safeRecords);

  try {
    const json = JSON.stringify(safeRecords);
    localStorage.setItem(getKey(collectionName), json);
    localStorage.setItem(collectionName, json);
  } catch (e) {
    console.warn(`localStorage quota exceeded for ${collectionName}, storing in memory:`, e);
    // If quota exceeded, attempt to prune old entries in localStorage if possible
    try {
      // Save last 20 records only to save space
      const trimmed = safeRecords.slice(-20);
      const json = JSON.stringify(trimmed);
      localStorage.setItem(getKey(collectionName), json);
      localStorage.setItem(collectionName, json);
    } catch (innerError) {
      // Memory store is already populated
    }
  }
}

export function insert(collectionName, record) {
  if (!record) return null;
  const records = getCollection(collectionName);
  const existingIdx = record?.id ? records.findIndex((r) => r?.id === record.id) : -1;
  
  if (existingIdx !== -1) {
    records[existingIdx] = { ...records[existingIdx], ...record };
  } else {
    records.push(record);
  }
  
  setCollection(collectionName, records);
  return record;
}

export function update(collectionName, id, updater) {
  const records = getCollection(collectionName);
  const idx = records.findIndex((r) => r?.id === id);
  if (idx !== -1) {
    const updated = typeof updater === 'function' ? updater(records[idx]) : { ...records[idx], ...updater };
    records[idx] = updated;
    setCollection(collectionName, records);
    return updated;
  }
  return null;
}

export function deleteItem(collectionName, id) {
  const records = getCollection(collectionName);
  const filtered = records.filter((r) => r?.id !== id);
  setCollection(collectionName, filtered);
  return filtered;
}

export default { getCollection, setCollection, insert, update, deleteItem };


