const FAVORITES_STORAGE_KEY = "ads-works-favorites";

function unique(values) {
  return Array.from(new Set(values));
}

function sanitizeFavoriteIds(rawValue, validWorkIds = []) {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  const validIdSet = new Set(validWorkIds);

  return unique(
    rawValue.filter((value) => {
      return typeof value === "string" && (!validIdSet.size || validIdSet.has(value));
    })
  );
}

export function loadFavoriteIds(validWorkIds = []) {
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return sanitizeFavoriteIds(JSON.parse(raw), validWorkIds);
  } catch (_error) {
    return [];
  }
}

export function saveFavoriteIds(favoriteIds) {
  try {
    const nextFavoriteIds = sanitizeFavoriteIds(favoriteIds);

    if (!nextFavoriteIds.length) {
      window.localStorage.removeItem(FAVORITES_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavoriteIds));
  } catch (_error) {
    // Ignore storage write failures so the UI state remains functional.
  }
}
