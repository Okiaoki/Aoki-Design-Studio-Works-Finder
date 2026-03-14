export const FILTER_STATE_KEYS = [
  "searchQuery",
  "selectedGenres",
  "selectedSiteTypes",
  "selectedPurposes",
  "selectedFeatures",
  "selectedBudgetRanges",
  "sortOrder"
];

export const initialState = Object.freeze({
  searchQuery: "",
  selectedGenres: [],
  selectedSiteTypes: [],
  selectedPurposes: [],
  selectedFeatures: [],
  selectedBudgetRanges: [],
  sortOrder: "recommended",
  compareIds: [],
  favoriteIds: [],
  isComparePanelOpen: false,
  activeWorkId: null,
  isDetailModalOpen: false
});

const arrayKeys = [
  "selectedGenres",
  "selectedSiteTypes",
  "selectedPurposes",
  "selectedFeatures",
  "selectedBudgetRanges",
  "compareIds",
  "favoriteIds"
];

const listeners = new Set();

let state = clone(initialState);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(values) {
  return Array.from(new Set(values));
}

function normalizeState(nextState) {
  const normalized = {
    ...initialState,
    ...nextState,
    searchQuery: String(nextState.searchQuery ?? "").trim(),
    sortOrder: nextState.sortOrder || initialState.sortOrder,
    isComparePanelOpen: Boolean(nextState.isComparePanelOpen),
    activeWorkId: typeof nextState.activeWorkId === "string" ? nextState.activeWorkId : null,
    isDetailModalOpen: Boolean(nextState.isDetailModalOpen)
  };

  arrayKeys.forEach((key) => {
    normalized[key] = Array.isArray(nextState[key]) ? unique(nextState[key]) : [];
  });

  normalized.compareIds = normalized.compareIds.slice(0, 3);
  return normalized;
}

function emit() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

export function getState() {
  return clone(state);
}

export function hydrateState(partialState = {}) {
  state = normalizeState({ ...state, ...partialState });
  emit();
}

export function updateState(patchOrUpdater) {
  const currentState = getState();
  const patch =
    typeof patchOrUpdater === "function"
      ? patchOrUpdater(currentState)
      : patchOrUpdater;

  if (patch == null) {
    return;
  }

  state = normalizeState({ ...currentState, ...patch });
  emit();
}

export function resetFilterState() {
  updateState((currentState) => {
    const nextState = {
      compareIds: currentState.compareIds,
      favoriteIds: currentState.favoriteIds
    };

    FILTER_STATE_KEYS.forEach((key) => {
      nextState[key] = clone(initialState[key]);
    });

    return nextState;
  });
}

export function getToggledArrayValues(currentValues, value, options = {}) {
  const hasValue = currentValues.includes(value);
  const nextValues = hasValue
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];

  if (typeof options.max === "number" && nextValues.length > options.max) {
    return null;
  }

  return nextValues;
}

export function toggleArrayValue(key, value, options = {}) {
  updateState((currentState) => {
    const currentValues = currentState[key] || [];
    const nextValues = getToggledArrayValues(currentValues, value, options);

    if (nextValues == null) {
      return null;
    }

    return { [key]: nextValues };
  });
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
