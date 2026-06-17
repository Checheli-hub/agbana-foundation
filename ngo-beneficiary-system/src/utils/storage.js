const STORAGE_KEY = "ngo-beneficiaries";

export function loadFromStorage(key = STORAGE_KEY, fallback = []) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Failed to load from storage", error);
    return fallback;
  }
}

export function saveToStorage(key = STORAGE_KEY, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to save to storage", error);
  }
}

export function formatDateKey(value) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}
