import { getActiveFilterChips } from "./filter.js";
import { CONSULTATION_TARGET } from "./siteConfig.js";
import { QUERY_KEYS } from "./urlState.js";

export { CONSULTATION_TARGET } from "./siteConfig.js";

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function pickWorkSummary(work) {
  if (!work) {
    return null;
  }

  return {
    id: work.id,
    title: work.title,
    genre: work.genre,
    siteType: work.siteType,
    purpose: work.purpose,
    budgetRange: work.budgetRange,
    durationRange: work.durationRange
  };
}

function getContext(payload) {
  if (payload.activeWork) {
    return "detail";
  }

  if (payload.compareIds.length >= 2) {
    return "compare";
  }

  if (payload.searchQuery || payload.filterLabels.length) {
    return "filtered";
  }

  return "default";
}

export function buildConsultationPayload(state, worksById, options = {}) {
  const activeWorkId =
    typeof options.activeWorkId === "string" ? options.activeWorkId : state.activeWorkId;
  const activeWork = pickWorkSummary(activeWorkId ? worksById.get(activeWorkId) : null);
  const comparedWorks = toArray(state.compareIds)
    .map((id) => worksById.get(id))
    .filter(Boolean);
  const filterChips = getActiveFilterChips(state);
  const filterLabels = filterChips
    .filter((chip) => chip.key !== "searchQuery")
    .map((chip) => chip.label);

  const payload = {
    searchQuery: String(state.searchQuery ?? "").trim(),
    selectedGenres: toArray(state.selectedGenres),
    selectedCaseTypes: toArray(state.selectedCaseTypes),
    selectedSiteTypes: toArray(state.selectedSiteTypes),
    selectedPurposes: toArray(state.selectedPurposes),
    selectedFeatures: toArray(state.selectedFeatures),
    selectedBudgetRanges: toArray(state.selectedBudgetRanges),
    sortOrder: state.sortOrder || CONSULTATION_TARGET.defaultSortOrder,
    compareIds: comparedWorks.map((work) => work.id),
    compareTitles: comparedWorks.map((work) => work.title),
    activeWork,
    filterLabels
  };

  payload.context = getContext(payload);
  return payload;
}

export function buildConsultationSummary(payload) {
  const lines = ["Aoki Design Studio Works Finder 閲覧メモ", ""];

  if (payload.searchQuery) {
    lines.push(`検索語: ${payload.searchQuery}`);
  }

  if (payload.filterLabels.length) {
    lines.push(`適用中フィルタ: ${payload.filterLabels.join(" / ")}`);
  }

  if (payload.compareTitles.length) {
    lines.push(`比較中案件: ${payload.compareTitles.join(" / ")}`);
  }

  if (payload.activeWork) {
    lines.push(
      `アクティブ案件: ${payload.activeWork.title}`,
      `案件情報: ${payload.activeWork.genre} / ${payload.activeWork.siteType} / ${payload.activeWork.purpose}`
    );
  }

  if (!payload.searchQuery && !payload.filterLabels.length && !payload.compareTitles.length && !payload.activeWork) {
    lines.push("現在は全体一覧を参照した状態です。");
  }

  lines.push("", "見返しポイント:", "- 近い案件の共通点", "- 比較時に見たい条件");
  return lines.join("\n");
}

function setListParam(params, key, values) {
  if (values.length) {
    params.set(key, values.join(","));
  }
}

export function buildConsultationUrl(payload, config = CONSULTATION_TARGET, currentHref = window.location.href) {
  const targetUrl = new URL(config.baseUrl || "./", currentHref);
  const params = new URLSearchParams();
  const extraQueryKeys = config.queryKeys || {};

  if (payload.searchQuery) {
    params.set(QUERY_KEYS.searchQuery, payload.searchQuery);
  }

  setListParam(params, QUERY_KEYS.selectedGenres, payload.selectedGenres);
  setListParam(params, QUERY_KEYS.selectedCaseTypes, payload.selectedCaseTypes);
  setListParam(params, QUERY_KEYS.selectedSiteTypes, payload.selectedSiteTypes);
  setListParam(params, QUERY_KEYS.selectedPurposes, payload.selectedPurposes);
  setListParam(params, QUERY_KEYS.selectedFeatures, payload.selectedFeatures);
  setListParam(params, QUERY_KEYS.selectedBudgetRanges, payload.selectedBudgetRanges);

  if (payload.sortOrder && payload.sortOrder !== config.defaultSortOrder) {
    params.set(QUERY_KEYS.sortOrder, payload.sortOrder);
  }

  setListParam(params, QUERY_KEYS.compareIds, payload.compareIds);

  params.set(extraQueryKeys.intent, "review");
  params.set(extraQueryKeys.source, config.source);
  params.set(extraQueryKeys.context, payload.context);

  if (payload.filterLabels.length) {
    params.set(extraQueryKeys.filters, payload.filterLabels.join(" / "));
  }

  if (payload.compareTitles.length) {
    params.set(extraQueryKeys.compareTitles, payload.compareTitles.join(" / "));
  }

  if (payload.activeWork) {
    params.set(extraQueryKeys.active, payload.activeWork.id);
    params.set(extraQueryKeys.activeTitle, payload.activeWork.title);
  }

  targetUrl.search = params.toString();
  targetUrl.hash = config.hash || "";

  return targetUrl.toString();
}

export function buildConsultationArtifacts(
  payload,
  config = CONSULTATION_TARGET,
  currentHref = window.location.href
) {
  return {
    draft: buildConsultationSummary(payload),
    href: buildConsultationUrl(payload, config, currentHref)
  };
}

export function buildConsultationArtifactsFromState(
  state,
  worksById,
  config = CONSULTATION_TARGET,
  options = {},
  currentHref = window.location.href
) {
  const payload = buildConsultationPayload(state, worksById, options);
  const artifacts = buildConsultationArtifacts(payload, config, currentHref);

  return {
    payload,
    ...artifacts
  };
}
