const optionOrders = {
  selectedGenres: [
    "美容・クリニック",
    "採用・BtoB",
    "SaaS・BtoB",
    "不動産",
    "建築・インテリア",
    "食品・ライフスタイル",
    "カルチャー・アート"
  ],
  selectedSiteTypes: [
    "コーポレートサイト",
    "採用サイト",
    "ブランドサイト",
    "サービスサイト",
    "ECサイト",
    "LP"
  ],
  selectedPurposes: [
    "ブランド刷新",
    "採用強化",
    "リード獲得",
    "売上拡大",
    "問い合わせ改善",
    "商品訴求",
    "キャンペーン訴求",
    "情報整理"
  ],
  selectedFeatures: [
    "CMS",
    "アニメーション",
    "フォーム",
    "予約導線",
    "記事運用",
    "多言語",
    "検索UI",
    "EC導線",
    "LP最適化"
  ],
  selectedBudgetRanges: [
    "80-120万円",
    "120-180万円",
    "180-250万円",
    "250-400万円",
    "400万円以上"
  ]
};

const budgetOrder = {
  "80-120万円": 1,
  "120-180万円": 2,
  "180-250万円": 3,
  "250-400万円": 4,
  "400万円以上": 5
};

export const SORT_ORDERS = ["recommended", "newest", "budget-asc"];

const searchableFields = [
  "title",
  "genre",
  "siteType",
  "purpose",
  "summary",
  "features",
  "techStack",
  "tags",
  "challenge"
];

const searchIndexCache = new WeakMap();

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item != null && item !== "");
  }

  if (value == null || value === "") {
    return [];
  }

  return [value];
}

function unique(values) {
  return Array.from(new Set(values));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function getFeatureValues(work) {
  const featureValues = [...toArray(work.features)];

  if (work.hasCms) {
    featureValues.push("CMS");
  }

  if (work.hasAnimation) {
    featureValues.push("アニメーション");
  }

  if (work.hasForm) {
    featureValues.push("フォーム");
  }

  return unique(featureValues);
}

const filterDefinitions = [
  {
    key: "selectedGenres",
    label: "ジャンル",
    getValues: (work) => toArray(work.genre)
  },
  {
    key: "selectedSiteTypes",
    label: "サイト種別",
    getValues: (work) => toArray(work.siteType)
  },
  {
    key: "selectedPurposes",
    label: "制作目的",
    getValues: (work) => toArray(work.purpose)
  },
  {
    key: "selectedFeatures",
    label: "実装特徴",
    getValues: (work) => getFeatureValues(work)
  },
  {
    key: "selectedBudgetRanges",
    label: "想定予算帯",
    getValues: (work) => toArray(work.budgetRange)
  }
];

function sortByConfiguredOrder(values, key) {
  const order = optionOrders[key] || [];

  return [...values].sort((left, right) => {
    const leftIndex = order.indexOf(left);
    const rightIndex = order.indexOf(right);

    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "ja");
    }

    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    return leftIndex - rightIndex;
  });
}

function getNormalizedFacetValues(values) {
  return toArray(values).map(normalizeText);
}

function getSearchIndex(work) {
  if (!searchIndexCache.has(work)) {
    const rawSearchText = searchableFields
      .flatMap((field) => toArray(work[field]))
      .join(" ");

    searchIndexCache.set(work, normalizeText(rawSearchText));
  }

  return searchIndexCache.get(work);
}

function tokenizeSearchQuery(searchQuery) {
  const normalizedQuery = normalizeText(searchQuery);
  return normalizedQuery ? normalizedQuery.split(" ") : [];
}

export function getBudgetRank(rangeLabel) {
  return budgetOrder[rangeLabel] ?? Number.MAX_SAFE_INTEGER;
}

export function matchesSearchQuery(work, searchQuery) {
  const searchTokens = tokenizeSearchQuery(searchQuery);

  if (!searchTokens.length) {
    return true;
  }

  const searchIndex = getSearchIndex(work);
  return searchTokens.every((token) => searchIndex.includes(token));
}

export function matchesSelectedValues(selectedValues, workValues) {
  if (!selectedValues.length) {
    return true;
  }

  const normalizedSelections = getNormalizedFacetValues(selectedValues);
  const normalizedWorkValues = getNormalizedFacetValues(workValues);

  return normalizedSelections.some((selectedValue) => normalizedWorkValues.includes(selectedValue));
}

export function matchesAllFilters(work, state) {
  const matchesFacetFilters = filterDefinitions.every((definition) => {
    return matchesSelectedValues(state[definition.key] || [], definition.getValues(work));
  });

  // Same facet = OR via matchesSelectedValues, different facets = AND via every().
  return matchesSearchQuery(work, state.searchQuery) && matchesFacetFilters;
}

function compareTitles(left, right) {
  return String(left.title ?? "").localeCompare(String(right.title ?? ""), "ja");
}

export function sortWorks(works, sortOrder) {
  const nextWorks = [...works];

  return nextWorks.sort((left, right) => {
    if (sortOrder === "newest") {
      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return compareTitles(left, right);
    }

    if (sortOrder === "budget-asc") {
      const budgetDiff = getBudgetRank(left.budgetRange) - getBudgetRank(right.budgetRange);

      if (budgetDiff !== 0) {
        return budgetDiff;
      }

      if (left.year !== right.year) {
        return right.year - left.year;
      }

      return compareTitles(left, right);
    }

    const featuredDiff = Number(right.isFeatured) - Number(left.isFeatured);

    if (featuredDiff !== 0) {
      return featuredDiff;
    }

    if (left.year !== right.year) {
      return right.year - left.year;
    }

    return compareTitles(left, right);
  });
}

export function getFilteredWorks(works, state) {
  return works.filter((work) => matchesAllFilters(work, state));
}

export function getDerivedWorks(works, state) {
  const filteredWorks = getFilteredWorks(works, state);
  const sortedWorks = sortWorks(filteredWorks, state.sortOrder);

  return {
    items: sortedWorks,
    count: sortedWorks.length,
    isEmpty: sortedWorks.length === 0
  };
}

export function getFilterCatalog(works) {
  return filterDefinitions.map((definition) => {
    const rawValues = works.flatMap((work) => definition.getValues(work));
    const counts = countBy(rawValues);

    return {
      key: definition.key,
      label: definition.label,
      options: sortByConfiguredOrder(Object.keys(counts), definition.key).map((value) => ({
        label: value,
        value,
        count: counts[value]
      }))
    };
  });
}

export function getPopularTags(works, limit = 8) {
  const counts = countBy(works.flatMap((work) => toArray(work.tags)));

  return Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "ja");
    })
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function getActiveFilterChips(state) {
  const chips = [];

  if (state.searchQuery) {
    chips.push({
      label: `検索: ${state.searchQuery}`,
      key: "searchQuery",
      value: state.searchQuery
    });
  }

  filterDefinitions.forEach((definition) => {
    const selectedValues = state[definition.key] || [];

    selectedValues.forEach((value) => {
      chips.push({
        label: `${definition.label}: ${value}`,
        key: definition.key,
        value
      });
    });
  });

  return chips;
}
