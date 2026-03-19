const CACHE_PREFIX = "civiqai";

function getUserCacheKey(type, email) {
  return `${CACHE_PREFIX}:${type}:${email}`;
}

export function readUserCache(type, email) {
  if (!email) return [];

  try {
    const raw = localStorage.getItem(getUserCacheKey(type, email));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Failed to read ${type} cache`, error);
    return [];
  }
}

export function writeUserCache(type, email, value) {
  if (!email) return;

  try {
    localStorage.setItem(getUserCacheKey(type, email), JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to write ${type} cache`, error);
  }
}
