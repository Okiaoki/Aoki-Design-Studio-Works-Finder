export const QUERY_KEYS = {
  searchQuery: "q",
  selectedGenres: "genre",
  selectedCaseTypes: "case",
  selectedSiteTypes: "type",
  selectedPurposes: "purpose",
  selectedFeatures: "feature",
  selectedBudgetRanges: "budget",
  sortOrder: "sort",
  compareIds: "compare",
  detailWorkId: "detail"
};

function unique(values) {
  return Array.from(new Set(values));
}

function getFilterValueSets(filterCatalog = []) {
  return filterCatalog.reduce((sets, group) => {
    sets[group.key] = new Set(group.options.map((option) => option.value));
    return sets;
  }, {});
}

function readListParam(searchParams, key) {
  return searchParams
    .getAll(key)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function sanitizeList(values, validSet, max = Number.POSITIVE_INFINITY) {
  const sanitizedValues = unique(
    values.filter((value) => typeof value === "string" && (!validSet || validSet.has(value)))
  );

  return sanitizedValues.slice(0, max);
}

export function parseStateFromSearch(search, config = {}) {
  const searchParams = new URLSearchParams(search);
  const filterValueSets = config.filterValueSets || getFilterValueSets(config.filterCatalog);
  const validSortOrders = config.validSortOrders || new Set();
  const validWorkIds = config.validWorkIds || new Set();
  const nextState = {};

  const searchQuery = searchParams.get(QUERY_KEYS.searchQuery)?.trim();
  if (searchQuery) {
    nextState.searchQuery = searchQuery;
  }

  [
    "selectedGenres",
    "selectedCaseTypes",
    "selectedSiteTypes",
    "selectedPurposes",
    "selectedFeatures",
    "selectedBudgetRanges"
  ].forEach((stateKey) => {
    const values = sanitizeList(readListParam(searchParams, QUERY_KEYS[stateKey]), filterValueSets[stateKey]);

    if (values.length) {
      nextState[stateKey] = values;
    }
  });

  const sortOrder = searchParams.get(QUERY_KEYS.sortOrder);
  if (sortOrder && validSortOrders.has(sortOrder)) {
    nextState.sortOrder = sortOrder;
  }

  const compareIds = sanitizeList(
    readListParam(searchParams, QUERY_KEYS.compareIds),
    validWorkIds,
    3
  );
  if (compareIds.length) {
    nextState.compareIds = compareIds;
  }

  const detailWorkId = searchParams.get(QUERY_KEYS.detailWorkId)?.trim();
  if (detailWorkId && validWorkIds.has(detailWorkId)) {
    nextState.activeWorkId = detailWorkId;
    nextState.isDetailModalOpen = true;
  }

  return nextState;
}

export function serializeStateToQuery(state, config = {}) {
  const searchParams = new URLSearchParams();
  const defaultSortOrder = config.defaultSortOrder || "recommended";

  if (state.searchQuery) {
    searchParams.set(QUERY_KEYS.searchQuery, state.searchQuery);
  }

  [
    "selectedGenres",
    "selectedCaseTypes",
    "selectedSiteTypes",
    "selectedPurposes",
    "selectedFeatures",
    "selectedBudgetRanges"
  ].forEach((stateKey) => {
    const values = Array.isArray(state[stateKey]) ? state[stateKey].filter(Boolean) : [];

    if (values.length) {
      searchParams.set(QUERY_KEYS[stateKey], values.join(","));
    }
  });

  if (state.sortOrder && state.sortOrder !== defaultSortOrder) {
    searchParams.set(QUERY_KEYS.sortOrder, state.sortOrder);
  }

  if (Array.isArray(state.compareIds) && state.compareIds.length) {
    searchParams.set(QUERY_KEYS.compareIds, state.compareIds.join(","));
  }

  if (state.isDetailModalOpen && typeof state.activeWorkId === "string" && state.activeWorkId.trim()) {
    searchParams.set(QUERY_KEYS.detailWorkId, state.activeWorkId.trim());
  }

  return searchParams.toString();
}

export function readStateFromUrl(config = {}, search = window.location.search) {
  return parseStateFromSearch(search, config);
}

export function writeStateToUrl(state, config = {}) {
  const nextQuery = serializeStateToQuery(state, config);
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    window.history.replaceState(window.history.state, "", nextUrl);
  }
}
