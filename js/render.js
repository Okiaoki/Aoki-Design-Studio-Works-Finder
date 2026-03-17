import { getActiveFilterChips } from "./filter.js";
import {
  buildConsultationArtifactsFromState
} from "./consultation.js";

const comparisonRows = [
  { label: "制作目的", getValue: (work) => formatDisplayValue(work.purpose) },
  { label: "想定予算帯 / 規模感", getValue: (work) => getBudgetOrScaleLabel(work) },
  { label: "制作期間帯 / サイト種別", getValue: (work) => getDurationOrSiteTypeLabel(work) },
  { label: "ページ数 / 規模感", getValue: (work) => formatPageAndScale(work) },
  { label: "主な機能", getValue: (work) => formatLimitedList(work.features, 3) },
  { label: "使用技術", getValue: (work) => formatLimitedList(work.techStack, 3) },
  { label: "デザイン傾向", getValue: (work) => formatDisplayValue(work.designTone) }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value ?? "-");
}

function formatLimitedList(value, limit = 3) {
  const values = Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);

  if (!values.length) {
    return "-";
  }

  if (values.length <= limit) {
    return values.join(", ");
  }

  return `${values.slice(0, limit).join(", ")} ほか${values.length - limit}`;
}

function formatPageAndScale(work) {
  const pageLabel = work.pageCount ? `${work.pageCount}ページ` : "-";

  if (!work.scale) {
    return pageLabel;
  }

  return `${pageLabel} / ${work.scale}`;
}

function hasDisplayValue(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).length > 0;
  }

  return value != null && value !== "";
}

function getPageLabel(work) {
  return work.pageCount ? `${work.pageCount}ページ` : "";
}

function getBudgetOrScaleLabel(work) {
  if (hasDisplayValue(work.budgetRange)) {
    return formatDisplayValue(work.budgetRange);
  }

  if (hasDisplayValue(work.scale)) {
    return formatDisplayValue(work.scale);
  }

  if (work.pageCount) {
    return getPageLabel(work);
  }

  return formatDisplayValue(work.siteType);
}

function getDurationOrSiteTypeLabel(work) {
  if (hasDisplayValue(work.durationRange)) {
    return formatDisplayValue(work.durationRange);
  }

  return formatDisplayValue(work.siteType);
}

function renderFactsList(facts) {
  return facts
    .filter((fact) => fact && hasDisplayValue(fact.value))
    .map(
      (fact) => `
        <div>
          <dt>${escapeHtml(fact.label)}</dt>
          <dd>${escapeHtml(fact.value)}</dd>
        </div>
      `
    )
    .join("");
}

function getCardMetaItems(work) {
  const secondaryItems = [
    hasDisplayValue(work.budgetRange)
      ? { label: "想定予算", value: formatDisplayValue(work.budgetRange) }
      : work.pageCount
        ? { label: "ページ数", value: getPageLabel(work) }
        : null,
    hasDisplayValue(work.durationRange)
      ? { label: "制作期間", value: formatDisplayValue(work.durationRange) }
      : hasDisplayValue(work.siteType)
        ? { label: "サイト種別", value: formatDisplayValue(work.siteType) }
        : null
  ].filter(Boolean);

  return [
    {
      label: "制作目的",
      value: formatDisplayValue(work.purpose),
      className: "work-card__meta-item work-card__meta-item--wide"
    },
    ...secondaryItems.map((item) => ({
      ...item,
      className: "work-card__meta-item"
    }))
  ];
}

function getDetailQuickFacts(work) {
  return [
    { label: "制作目的", value: formatDisplayValue(work.purpose) },
    { label: "ページ数", value: getPageLabel(work) || "-" },
    {
      label: hasDisplayValue(work.budgetRange) ? "想定予算帯" : "サイト種別",
      value: hasDisplayValue(work.budgetRange)
        ? formatDisplayValue(work.budgetRange)
        : formatDisplayValue(work.siteType)
    },
    {
      label: hasDisplayValue(work.durationRange)
        ? "制作期間帯"
        : hasDisplayValue(work.scale)
          ? "規模感"
          : "更新方式",
      value: hasDisplayValue(work.durationRange)
        ? formatDisplayValue(work.durationRange)
        : hasDisplayValue(work.scale)
          ? formatDisplayValue(work.scale)
          : getContentModeLabel(work)
    }
  ];
}

function getProductionFacts(work) {
  return [
    hasDisplayValue(work.budgetRange)
      ? { label: "想定予算帯", value: formatDisplayValue(work.budgetRange) }
      : { label: "ページ数", value: getPageLabel(work) || "-" },
    hasDisplayValue(work.durationRange)
      ? { label: "制作期間帯", value: formatDisplayValue(work.durationRange) }
      : { label: "サイト種別", value: formatDisplayValue(work.siteType) },
    hasDisplayValue(work.scale)
      ? { label: "規模感", value: formatDisplayValue(work.scale) }
      : { label: "更新方式", value: getContentModeLabel(work) },
    { label: "デザイン傾向", value: formatDisplayValue(work.designTone) }
  ];
}

function formatList(items, className) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!values.length) {
    return `<span class="${className} ${className}--muted">情報整理中</span>`;
  }

  return values
    .map((value) => `<span class="${className}">${escapeHtml(value)}</span>`)
    .join("");
}

function renderCardTags(items, limit = 2) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];

  if (!values.length) {
    return "";
  }

  const visibleValues = values.slice(0, limit);
  const hiddenCount = Math.max(0, values.length - visibleValues.length);

  return [
    ...visibleValues.map((value) => `<span class="work-card__tag">${escapeHtml(value)}</span>`),
    hiddenCount ? `<span class="work-card__tag work-card__tag--more">+${hiddenCount}</span>` : ""
  ].join("");
}

function getSelectedLabel(selectedValues) {
  if (!selectedValues.length) {
    return "未選択";
  }

  return `${selectedValues.length}件選択中`;
}

function getResultCountLabel(count) {
  if (count === 0) {
    return "該当する実績はありません";
  }

  return `${count}件の実績`;
}

function getResultCountMarkup(count) {
  if (count === 0) {
    return `
      <span class="result-count__value">0</span>
      <span class="result-count__label">該当する実績はありません</span>
    `;
  }

  return `
    <span class="result-count__value">${count}</span>
    <span class="result-count__label">件の実績</span>
  `;
}

function getBooleanFlags(work) {
  return [
    work.hasCms ? "CMSあり" : "CMSなし",
    work.hasForm ? "フォームあり" : "フォームなし",
    work.hasAnimation ? "アニメーションあり" : "アニメーションなし"
  ];
}

function getContentModeLabel(work) {
  return work.hasCms ? "CMS更新" : "静的構成";
}

function getCaseTypeMeta(work) {
  return work.isConcept
    ? {
        shortLabel: "コンセプト",
        label: "コンセプト案件",
        badgeClass: "concept"
      }
    : {
        shortLabel: "実案件",
        label: "実案件",
        badgeClass: "client"
      };
}

function getStatusLabels(work) {
  const caseType = getCaseTypeMeta(work);
  const labels = [
    {
      label: caseType.label,
      className: `detail-modal__status-pill detail-modal__status-pill--${caseType.badgeClass}`
    }
  ];

  if (work.isFeatured) {
    labels.push({
      label: "注目事例",
      className: "detail-modal__status-pill detail-modal__status-pill--featured"
    });
  }

  return labels;
}

function getActiveWork(state, worksById) {
  return state.activeWorkId ? worksById.get(state.activeWorkId) || null : null;
}

function hasDetailPageUrl(work) {
  return (
    typeof work?.detailUrl === "string" &&
    work.detailUrl.trim() !== "" &&
    !work.detailUrl.trim().startsWith("#")
  );
}

function isExternalDetailUrl(detailUrl) {
  return /^(?:[a-z]+:)?\/\//i.test(detailUrl.trim());
}

function renderWorkImage(work, attributes = "") {
  const fallbackSource =
    work.thumbnailFallback && work.thumbnailFallback !== work.thumbnail ? work.thumbnailFallback : "";
  const fallbackAttribute = fallbackSource
    ? ` data-fallback-src="${escapeHtml(fallbackSource)}"`
    : "";

  return `<img src="${escapeHtml(work.thumbnail)}"${fallbackAttribute} alt="${escapeHtml(work.title)}"${attributes} />`;
}

function renderDetailQuickFacts(work) {
  const facts = getDetailQuickFacts(work);

  return facts
    .map(
      (fact) => `
        <div class="detail-modal__quick-fact">
          <span class="detail-modal__quick-label">${escapeHtml(fact.label)}</span>
          <strong class="detail-modal__quick-value">${escapeHtml(fact.value)}</strong>
        </div>
      `
    )
    .join("");
}

function getConsultationContent(results, state, worksById, consultationConfig, options = {}) {
  const { payload, draft, href } = buildConsultationArtifactsFromState(
    state,
    worksById,
    consultationConfig,
    {
      activeWorkId: options.work?.id
    }
  );
  const activeWork = payload.activeWork;
  const comparedWorks = payload.compareTitles;
  const filterLabels = payload.filterLabels;
  const totalWorksCount = worksById.size;
  const realWorksCount = Array.from(worksById.values()).filter((work) => !work.isConcept).length;

  let eyebrow = "作品メモ";
  let title = "比較で見えた観点を、短く残す。";
  let description = "検索や比較で見えた条件や判断軸を、掲載用作品の締めとして整理する補助領域です。";
  let briefTitle = "見返し用メモ";
  let briefCopy = "現在の閲覧内容をベースに、あとから参照しやすいメモを自動で整えています。";
  let primaryLabel = "この条件をメモに残す";
  let secondaryLabel = "一覧へ戻る";
  let secondaryHref = state.compareIds.length ? "#compare-bar" : "#results-heading";
  let contextItems = [`掲載案件 ${totalWorksCount}件`, `実案件 ${realWorksCount}件`, "比較は最大3件"];

  if (activeWork && (options.forceWork || state.isDetailModalOpen)) {
    eyebrow = "事例メモ";
    title = "この事例の要点を、短く残す。";
    description = `${activeWork.title} の構成・制作目的・近い条件を踏まえて、見返しやすい形で整理します。`;
    briefTitle = "この事例を起点にしたメモ";
    briefCopy = "案件単位の要点が伝わるよう、参考事例と前提条件を簡潔に整えています。";
    primaryLabel = "この事例をメモに残す";
    secondaryLabel = "一覧に戻って他の候補も見る";
    secondaryHref = "#results-heading";
    contextItems = [
      activeWork.title,
      formatDisplayValue(activeWork.genre),
      formatDisplayValue(activeWork.purpose)
    ];
  } else if (comparedWorks.length >= 2) {
    eyebrow = "比較メモ";
    title = "比較中の事例を、差分ごと残す。";
    description = "複数案件の差分を見たうえで、必要なページ数・機能・規模感を整理した状態で残せます。";
    briefTitle = "比較内容を残すメモ";
    briefCopy = "比較表の差分が伝わるよう、候補と判断軸を短くまとめています。";
    primaryLabel = "比較内容をメモにする";
    secondaryLabel = "比較結果を見直す";
    secondaryHref = "#compare-bar";
    contextItems = comparedWorks;
  } else if (results.isEmpty) {
    eyebrow = "探索メモ";
    title = "近い事例がなくても、条件整理は残せます。";
    description = "条件に完全一致する実績が見つからない場合でも、目的や実装要件をもとに検討メモを残せます。";
    briefTitle = "条件整理メモ";
    briefCopy = "近い事例がないときでも、現在の検索条件や検討観点を短く残せます。";
    primaryLabel = "条件メモを作る";
    secondaryLabel = "条件を見直して探し直す";
    secondaryHref = "#filter-heading";
    contextItems = ["条件再調整", "要件の言語化", "比較軸の再設定"];
  } else if (state.searchQuery || filterLabels.length) {
    eyebrow = "条件メモ";
    title = "現在の条件を、見返しやすく残す。";
    description = `${results.count}件まで絞り込んだ結果を前提に、比較観点や優先順位を整理しやすくします。`;
    briefTitle = "条件を残すメモ";
    briefCopy = "検索語や適用中の条件を、そのまま後から参照できる形で残します。";
    primaryLabel = "この条件のメモを作る";
    secondaryLabel = "候補を見返して比較する";
    secondaryHref = "#results-heading";
    contextItems = filterLabels.slice(0, 3);
  }

  return {
    eyebrow,
    title,
    description,
    briefTitle,
    briefCopy,
    primaryLabel,
    secondaryLabel,
    secondaryHref,
    contextItems,
    draft,
    primaryHref: href
  };
}

function renderPopularTags(container, popularTags, state) {
  container.innerHTML = popularTags
    .map((tag) => {
      const isActive = state.searchQuery === tag;

      return `
        <button
          class="chip-button"
          type="button"
          data-action="apply-popular-tag"
          data-value="${escapeHtml(tag)}"
          aria-pressed="${isActive}"
        >
          ${escapeHtml(tag)}
        </button>
      `;
    })
    .join("");
}

const COLLAPSIBLE_FILTER_KEYS = new Set(["selectedFeatures", "selectedBudgetRanges"]);

function renderFilterOptions(group, selectedValues) {
  return group.options
    .map((option) => {
      const checked = selectedValues.includes(option.value);

      return `
        <label class="filter-option">
          <input
            type="checkbox"
            data-filter-key="${escapeHtml(group.key)}"
            value="${escapeHtml(option.value)}"
            ${checked ? "checked" : ""}
          />
          <span class="filter-option__surface">
            <span class="filter-option__label">${escapeHtml(option.label)}</span>
            <span class="filter-option__aside">
              <small class="filter-option__meta">${option.count}</small>
              <span class="filter-option__indicator" aria-hidden="true"></span>
            </span>
          </span>
        </label>
      `;
    })
    .join("");
}

function renderFilterGroups(container, filterCatalog, state) {
  container.innerHTML = filterCatalog
    .map((group) => {
      const selectedValues = state[group.key] || [];
      const countLabel = getSelectedLabel(selectedValues);
      const optionsMarkup = renderFilterOptions(group, selectedValues);
      const isCollapsible = COLLAPSIBLE_FILTER_KEYS.has(group.key);

      if (isCollapsible) {
        return `
          <details class="filter-group filter-group--collapsible" ${selectedValues.length ? "open" : ""}>
            <summary class="filter-group__summary">
              <span class="filter-group__title">${escapeHtml(group.label)}</span>
              <span class="filter-group__count">${escapeHtml(countLabel)}</span>
            </summary>
            <div class="filter-group__options">
              ${optionsMarkup}
            </div>
          </details>
        `;
      }

      return `
        <section class="filter-group">
          <div class="filter-group__header">
            <h3 class="filter-group__title">${escapeHtml(group.label)}</h3>
            <span class="filter-group__count">${escapeHtml(countLabel)}</span>
          </div>
          <div class="filter-group__options">
            ${optionsMarkup}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderToolbar(elements, results, state) {
  const { resultCount, searchInput, sortOrder, activeFilters } = elements;
  const chips = getActiveFilterChips(state);

  resultCount.innerHTML = getResultCountMarkup(results.count);
  resultCount.setAttribute("aria-label", getResultCountLabel(results.count));
  resultCount.dataset.empty = String(results.isEmpty);

  if (searchInput.value !== state.searchQuery) {
    searchInput.value = state.searchQuery;
  }

  if (sortOrder.value !== state.sortOrder) {
    sortOrder.value = state.sortOrder;
  }

  activeFilters.innerHTML = chips.length
    ? `
        <span class="active-filters__label">適用中の条件</span>
        ${chips
          .map(
            (chip) => `
              <button
                class="filter-chip"
                type="button"
                data-action="remove-filter-chip"
                data-filter-key="${escapeHtml(chip.key)}"
                data-value="${escapeHtml(chip.value)}"
                aria-label="${escapeHtml(chip.label)} を絞り込み条件から外す"
              >
                <span class="filter-chip__text">${escapeHtml(chip.label)}</span>
                <span class="filter-chip__remove" aria-hidden="true">×</span>
              </button>
            `
          )
          .join("")}
      `
    : `<span class="active-filters__empty">キーワード検索と条件選択を組み合わせて絞り込めます。</span>`;
}

function renderEmptyState(elements, results) {
  const { worksGrid, emptyState } = elements;

  worksGrid.hidden = results.isEmpty;
  worksGrid.setAttribute("aria-hidden", String(results.isEmpty));
  emptyState.hidden = !results.isEmpty;
  emptyState.setAttribute("aria-hidden", String(!results.isEmpty));

  if (results.isEmpty) {
    worksGrid.innerHTML = "";
  }
}

function renderWorksGrid(elements, results, state) {
  const { worksGrid } = elements;

  if (results.isEmpty) {
    return;
  }

  worksGrid.hidden = false;
  worksGrid.innerHTML = results.items
    .map((work) => {
      const isCompared = state.compareIds.includes(work.id);
      const isFavorite = state.favoriteIds.includes(work.id);
      const isDetailOpen = state.isDetailModalOpen && state.activeWorkId === work.id;
      const compareLimitReached = state.compareIds.length >= 3;
      const compareDisabled = !isCompared && compareLimitReached;
      const caseType = getCaseTypeMeta(work);
      const tagsMarkup = renderCardTags(work.tags, 2);
      const cardMetaItems = getCardMetaItems(work);

      return `
        <article class="work-card ${isCompared ? "work-card--compared" : ""} ${isFavorite ? "work-card--favorited" : ""}" data-work-id="${escapeHtml(work.id)}">
          <div class="work-card__media">
            ${renderWorkImage(work, ' loading="lazy"')}
            <div class="work-card__badges">
              <span class="meta-pill meta-pill--case-type meta-pill--${escapeHtml(caseType.badgeClass)}">${escapeHtml(caseType.shortLabel)}</span>
              ${work.isFeatured ? `<span class="meta-pill meta-pill--featured">注目事例</span>` : ""}
              <span class="meta-pill meta-pill--year">${work.year}</span>
            </div>
          </div>

          <div class="work-card__body">
            <header class="work-card__header">
              <div>
                <p class="work-card__kicker">${escapeHtml(formatDisplayValue(work.genre))} / ${escapeHtml(formatDisplayValue(work.siteType))}</p>
                <h3 class="work-card__title">${escapeHtml(work.title)}</h3>
              </div>
            </header>

            <p class="work-card__summary">${escapeHtml(work.summary)}</p>

            <div class="work-card__meta">
              ${cardMetaItems
                .map(
                  (item) => `
                    <div class="${escapeHtml(item.className)}">
                      <span class="work-card__meta-label">${escapeHtml(item.label)}</span>
                      <span class="work-card__meta-value">${escapeHtml(item.value)}</span>
                    </div>
                  `
                )
                .join("")}
            </div>

            ${tagsMarkup ? `<div class="work-card__tags">${tagsMarkup}</div>` : ""}

            <div class="work-card__utility">
              <button
                class="card-action card-action--primary work-card__primary-action"
                type="button"
                data-action="open-details"
                data-work-id="${escapeHtml(work.id)}"
                aria-haspopup="dialog"
                aria-controls="detail-modal-overlay"
                aria-expanded="${isDetailOpen}"
                aria-label="${escapeHtml(work.title)} の詳細を開く"
              >
                詳細を見る
              </button>
              <div class="work-card__secondary-actions">
                <button
                  class="card-action card-action--secondary work-card__secondary-action ${isCompared ? "work-card__action--active" : ""}"
                  type="button"
                  data-action="toggle-compare"
                  data-work-id="${escapeHtml(work.id)}"
                  aria-pressed="${isCompared}"
                  aria-label="${escapeHtml(work.title)} を${isCompared ? "比較から外す" : "比較に追加する"}"
                  ${compareDisabled ? "disabled" : ""}
                >
                  ${isCompared ? "比較中" : compareDisabled ? "上限3件" : "比較"}
                </button>
                <button
                  class="card-action card-action--secondary work-card__secondary-action ${isFavorite ? "work-card__action--active" : ""}"
                  type="button"
                  data-action="toggle-favorite"
                  data-work-id="${escapeHtml(work.id)}"
                  aria-pressed="${isFavorite}"
                  aria-label="${escapeHtml(work.title)} を${isFavorite ? "保存候補から外す" : "保存候補に加える"}"
                >
                  ${isFavorite ? "保存済み" : "保存"}
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCompareSlots(selectedWorks) {
  const slots = Array.from({ length: 3 }, (_, index) => selectedWorks[index] || null);

  return slots
    .map((work, index) => {
      if (!work) {
        return `
          <div class="compare-slot">
            <span class="compare-slot__badge">候補 ${index + 1}</span>
            <p class="compare-slot__title">比較候補を追加</p>
            <p class="compare-slot__meta">カードの比較ボタンから最大3件まで保持できます。</p>
          </div>
        `;
      }

      return `
        <div class="compare-slot compare-slot--filled">
          <span class="compare-slot__badge">${escapeHtml(formatDisplayValue(work.siteType))}</span>
          <p class="compare-slot__title">${escapeHtml(work.title)}</p>
          <p class="compare-slot__meta">${escapeHtml(formatDisplayValue(work.genre))} / ${escapeHtml(getBudgetOrScaleLabel(work))}</p>
        </div>
      `;
    })
    .join("");
}

function renderComparePanelBody(selectedWorks) {
  if (selectedWorks.length < 2) {
    const onlyWork = selectedWorks[0];

    return `
      <div class="compare-panel__hint">
        <p class="compare-panel__message">あと1件以上選ぶと比較表として意味が出ます。</p>
        <article class="compare-preview-card">
          <p class="compare-preview-card__eyebrow">${escapeHtml(formatDisplayValue(onlyWork.genre))} / ${escapeHtml(formatDisplayValue(onlyWork.siteType))}</p>
          <h3 class="compare-preview-card__title">${escapeHtml(onlyWork.title)}</h3>
          <p class="compare-preview-card__summary">${escapeHtml(onlyWork.summary)}</p>
        </article>
      </div>
    `;
  }

  const rowStyle = `style="grid-template-columns: minmax(180px, 220px) repeat(${selectedWorks.length}, minmax(0, 1fr));"`;

  return `
    <div class="compare-table" role="table" aria-label="案件比較表">
      <div class="compare-table__row compare-table__row--head" role="row" ${rowStyle}>
        <div class="compare-table__cell compare-table__cell--label" role="columnheader">比較項目</div>
        ${selectedWorks
          .map(
            (work) => `
              <div class="compare-table__cell compare-table__cell--work" role="columnheader">
                <span class="compare-table__eyebrow">${escapeHtml(formatDisplayValue(work.genre))} / ${escapeHtml(formatDisplayValue(work.siteType))}</span>
                <strong>${escapeHtml(work.title)}</strong>
                <span class="compare-table__meta">${escapeHtml(formatDisplayValue(work.purpose))} / ${escapeHtml(getBudgetOrScaleLabel(work))}</span>
              </div>
            `
          )
          .join("")}
      </div>
      ${comparisonRows
        .map(
          (row) => `
            <div class="compare-table__row" role="row" ${rowStyle}>
              <div class="compare-table__cell compare-table__cell--label" role="rowheader">${escapeHtml(row.label)}</div>
              ${selectedWorks
                .map(
                  (work) => `
                    <div class="compare-table__cell" role="cell">${escapeHtml(row.getValue(work))}</div>
                  `
                )
                .join("")}
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCompareBar(elements, worksById, state) {
  const {
    compareBar,
    compareCount,
    compareNote,
    compareSlots,
    clearCompare,
    openComparePanel
  } = elements;
  const selectedWorks = state.compareIds.map((id) => worksById.get(id)).filter(Boolean);
  const hasCompareItems = selectedWorks.length > 0;

  compareBar.hidden = !hasCompareItems;
  compareBar.setAttribute("aria-hidden", String(!hasCompareItems));
  document.body.classList.toggle("body--compare-active", hasCompareItems);
  openComparePanel.setAttribute("aria-expanded", String(state.isComparePanelOpen && hasCompareItems));
  openComparePanel.setAttribute("aria-disabled", String(!hasCompareItems));
  clearCompare.setAttribute("aria-disabled", String(!hasCompareItems));

  if (!hasCompareItems) {
    document.documentElement.style.removeProperty("--compare-bar-offset");
    compareCount.textContent = "0 / 3 件選択中";
    compareSlots.innerHTML = "";
    compareNote.textContent = "";
    clearCompare.disabled = true;
    openComparePanel.disabled = true;
    return;
  }

  compareCount.textContent = `${selectedWorks.length} / 3 件選択中`;
  compareNote.textContent =
    selectedWorks.length === 1
      ? "あと1件追加すると、制作条件の差分を見比べやすくなります。"
      : "選択中の事例を比較表で見比べながら、差分と共通点を整理できます。";
  clearCompare.disabled = false;
  openComparePanel.disabled = false;
  compareSlots.innerHTML = renderCompareSlots(selectedWorks);
  document.documentElement.style.setProperty(
    "--compare-bar-offset",
    `${Math.ceil(compareBar.getBoundingClientRect().height + 28)}px`
  );
}

function renderComparePanel(elements, worksById, state) {
  const { comparePanelOverlay, comparePanel, comparePanelBody } = elements;
  const selectedWorks = state.compareIds.map((id) => worksById.get(id)).filter(Boolean);
  const shouldShowPanel = state.isComparePanelOpen && selectedWorks.length > 0;

  comparePanelOverlay.hidden = !shouldShowPanel;
  comparePanelOverlay.setAttribute("aria-hidden", String(!shouldShowPanel));
  comparePanelOverlay.toggleAttribute("inert", !shouldShowPanel);
  comparePanel.setAttribute("aria-hidden", String(!shouldShowPanel));

  if (!shouldShowPanel) {
    comparePanelBody.innerHTML = "";
    return;
  }

  comparePanelBody.innerHTML = renderComparePanelBody(selectedWorks);
}

function renderDetailModal(elements, worksById, state, results, consultationConfig) {
  const { detailModalOverlay, detailModal, detailModalBody } = elements;
  const activeWork = getActiveWork(state, worksById);
  const shouldShowModal = state.isDetailModalOpen && Boolean(activeWork);

  detailModalOverlay.hidden = !shouldShowModal;
  detailModalOverlay.setAttribute("aria-hidden", String(!shouldShowModal));
  detailModalOverlay.toggleAttribute("inert", !shouldShowModal);
  detailModal.setAttribute("aria-hidden", String(!shouldShowModal));

  if (!shouldShowModal || !activeWork) {
    detailModalBody.innerHTML = "";
    return;
  }

  const isCompared = state.compareIds.includes(activeWork.id);
  const isFavorite = state.favoriteIds.includes(activeWork.id);
  const compareLimitReached = state.compareIds.length >= 3;
  const compareDisabled = !isCompared && compareLimitReached;
  const statusLabels = getStatusLabels(activeWork);
  const booleanFlags = getBooleanFlags(activeWork);
  const caseType = getCaseTypeMeta(activeWork);
  const consultation = getConsultationContent(results, state, worksById, consultationConfig, {
    work: activeWork,
    forceWork: true
  });
  const detailPageAction = hasDetailPageUrl(activeWork)
    ? `
      <a
        class="ghost-button"
        href="${escapeHtml(activeWork.detailUrl)}"
        ${isExternalDetailUrl(activeWork.detailUrl) ? 'target="_blank" rel="noopener noreferrer"' : ""}
      >
        ケーススタディを見る
      </a>
    `
    : "";

  detailModalBody.innerHTML = `
    <div class="detail-modal__hero">
      <div class="detail-modal__media">
        ${renderWorkImage(activeWork)}
      </div>

      <div class="detail-modal__intro">
        <p class="detail-modal__eyebrow">${escapeHtml(formatDisplayValue(activeWork.genre))} / ${escapeHtml(formatDisplayValue(activeWork.siteType))}</p>
        <h2 id="detail-modal-title" class="detail-modal__title">${escapeHtml(activeWork.title)}</h2>
        <p id="detail-modal-summary" class="detail-modal__summary">${escapeHtml(activeWork.summary)}</p>

        <div class="detail-modal__status">
          ${statusLabels
            .map(
              (status) =>
                `<span class="${escapeHtml(status.className)}">${escapeHtml(status.label)}</span>`
            )
            .join("")}
          <span class="detail-modal__status-pill detail-modal__status-pill--year">${escapeHtml(activeWork.year)}</span>
        </div>
        ${activeWork.isConcept ? '<p class="detail-modal__notice">公開情報をもとに構成したコンセプト案件です。</p>' : ""}
        <div class="detail-modal__quick-facts">
          ${renderDetailQuickFacts(activeWork)}
        </div>

        <div class="detail-modal__actions">
          <button
            class="primary-button"
            type="button"
            data-action="consult-work"
            data-work-id="${escapeHtml(activeWork.id)}"
            data-consultation-href="${escapeHtml(consultation.primaryHref)}"
            data-consultation-draft="${escapeHtml(consultation.draft)}"
            aria-label="${escapeHtml(activeWork.title)} の閲覧メモを作る"
          >
            ${escapeHtml(consultation.primaryLabel)}
          </button>
          <button
            class="card-action ${isCompared ? "work-card__action--active" : ""}"
            type="button"
            data-action="toggle-compare"
            data-work-id="${escapeHtml(activeWork.id)}"
            aria-pressed="${isCompared}"
            aria-label="${escapeHtml(activeWork.title)} を${isCompared ? "比較から外す" : "比較に追加する"}"
            ${compareDisabled ? "disabled" : ""}
          >
            ${isCompared ? "比較中" : compareDisabled ? "上限3件" : "比較"}
          </button>
          <button
            class="card-action ${isFavorite ? "work-card__action--active" : ""}"
            type="button"
            data-action="toggle-favorite"
            data-work-id="${escapeHtml(activeWork.id)}"
            aria-pressed="${isFavorite}"
            aria-label="${escapeHtml(activeWork.title)} を${isFavorite ? "保存候補から外す" : "保存候補に加える"}"
          >
            ${isFavorite ? "保存済み" : "保存"}
          </button>
          ${detailPageAction}
        </div>
      </div>
    </div>

    <div class="detail-modal__sections">
      <section class="detail-modal__section">
        <p class="eyebrow">案件背景</p>
        <h3>背景と判断ポイント</h3>
        <div class="detail-modal__copy">
          <p>${escapeHtml(activeWork.challenge)}</p>
        </div>
        <dl class="detail-modal__facts">
          <div>
            <dt>ジャンル</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.genre))}</dd>
          </div>
          <div>
            <dt>サイト種別</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.siteType))}</dd>
          </div>
          <div>
            <dt>案件種別</dt>
            <dd>${escapeHtml(caseType.label)}</dd>
          </div>
        </dl>
        <div class="detail-modal__group">
          <span class="detail-modal__group-label">タグ</span>
          <div class="detail-modal__chip-list">
            ${formatList(activeWork.tags, "detail-modal__chip")}
          </div>
        </div>
      </section>

      <section class="detail-modal__section">
        <p class="eyebrow">制作条件</p>
        <h3>予算と進行条件</h3>
        <dl class="detail-modal__facts">
          ${renderFactsList(getProductionFacts(activeWork))}
        </dl>
      </section>

      <section class="detail-modal__section">
        <p class="eyebrow">実装情報</p>
        <h3>構成と機能</h3>
        <dl class="detail-modal__facts">
          <div>
            <dt>ページ数</dt>
            <dd>${activeWork.pageCount ? `${escapeHtml(activeWork.pageCount)}ページ` : "-"}</dd>
          </div>
          <div>
            <dt>更新方式</dt>
            <dd>${escapeHtml(getContentModeLabel(activeWork))}</dd>
          </div>
        </dl>
        <div class="detail-modal__group">
          <span class="detail-modal__group-label">主な機能</span>
          <div class="detail-modal__chip-list">
            ${formatList(activeWork.features, "detail-modal__chip")}
          </div>
        </div>
        <div class="detail-modal__group">
          <span class="detail-modal__group-label">使用技術</span>
          <div class="detail-modal__chip-list">
            ${formatList(activeWork.techStack, "detail-modal__chip")}
          </div>
        </div>
        <div class="detail-modal__group">
          <span class="detail-modal__group-label">導線・運用</span>
          <div class="detail-modal__chip-list">
            ${formatList(booleanFlags, "detail-modal__chip")}
          </div>
        </div>
      </section>
    </div>
  `;
}

function renderCta(elements, results, worksById, state, consultationConfig) {
  const content = getConsultationContent(results, state, worksById, consultationConfig);
  const contextItems = content.contextItems?.length ? content.contextItems : ["閲覧メモを整理中"];

  elements.ctaEyebrow.textContent = content.eyebrow;
  elements.ctaTitle.textContent = content.title;
  elements.ctaDescription.textContent = content.description;
  elements.ctaBriefTitle.textContent = content.briefTitle;
  elements.ctaBriefCopy.textContent = content.briefCopy;
  elements.ctaPrimary.textContent = content.primaryLabel;
  elements.ctaSecondary.textContent = content.secondaryLabel;
  elements.ctaPrimary.setAttribute("href", content.primaryHref);
  elements.ctaPrimary.setAttribute("aria-label", content.primaryLabel);
  elements.ctaSecondary.setAttribute("href", content.secondaryHref);
  elements.ctaDraft.value = content.draft;
  elements.ctaCopy.dataset.copyText = content.draft;
  elements.ctaContext.innerHTML = contextItems
    .map((item) => `<span class="detail-modal__chip">${escapeHtml(item)}</span>`)
    .join("");
  elements.ctaStatus.textContent = "";
}

export function renderApp(context) {
  const {
    elements,
    filterCatalog,
    popularTags,
    results,
    worksById,
    state,
    consultationConfig
  } = context;

  renderPopularTags(elements.popularTags, popularTags, state);
  renderFilterGroups(elements.filterGroups, filterCatalog, state);
  renderToolbar(elements, results, state);
  renderEmptyState(elements, results);
  renderWorksGrid(elements, results, state);
  renderCompareBar(elements, worksById, state);
  renderComparePanel(elements, worksById, state);
  renderDetailModal(elements, worksById, state, results, consultationConfig);
  renderCta(elements, results, worksById, state, consultationConfig);
}
