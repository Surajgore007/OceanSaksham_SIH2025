// Simple local database utility using localStorage collections
// Collections are stored as JSON arrays under a namespaced key

const COLLECTION_PREFIX = 'oceansaksham_col_';

function getKey(collectionName) {
  return `${COLLECTION_PREFIX}${collectionName}`;
}

export function getCollection(collectionName) {
  try {
    const raw = localStorage.getItem(getKey(collectionName));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setCollection(collectionName, records) {
  localStorage.setItem(getKey(collectionName), JSON.stringify(records || []));
}

export function insert(collectionName, record) {
  const records = getCollection(collectionName);
  records.push(record);
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

export default { getCollection, setCollection, insert, update };


