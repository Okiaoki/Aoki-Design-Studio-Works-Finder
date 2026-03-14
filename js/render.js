import { getActiveFilterChips } from "./filter.js";
import {
  buildConsultationArtifactsFromState
} from "./consultation.js";

const comparisonRows = [
  { label: "制作目的", getValue: (work) => formatDisplayValue(work.purpose) },
  { label: "想定予算帯", getValue: (work) => formatDisplayValue(work.budgetRange) },
  { label: "制作期間帯", getValue: (work) => formatDisplayValue(work.durationRange) },
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

function renderWorkImage(work, attributes = "") {
  const fallbackSource =
    work.thumbnailFallback && work.thumbnailFallback !== work.thumbnail ? work.thumbnailFallback : "";
  const fallbackAttribute = fallbackSource
    ? ` data-fallback-src="${escapeHtml(fallbackSource)}"`
    : "";

  return `<img src="${escapeHtml(work.thumbnail)}"${fallbackAttribute} alt="${escapeHtml(work.title)}"${attributes} />`;
}

function renderDetailQuickFacts(work) {
  const facts = [
    { label: "制作目的", value: formatDisplayValue(work.purpose) },
    { label: "想定予算帯", value: formatDisplayValue(work.budgetRange) },
    { label: "制作期間帯", value: formatDisplayValue(work.durationRange) },
    { label: "ページ数", value: work.pageCount ? `${work.pageCount}ページ` : "-" }
  ];

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

  let eyebrow = "相談準備";
  let title = "近い事例が見つかったら、そのまま相談準備に進む。";
  let description = "実績を見比べながら整理した要件を、そのまま相談メモとして持ち出せる導線です。";
  let briefTitle = "相談時に添えるメモ";
  let briefCopy = "現在の閲覧内容をベースに、相談ページへ引き継ぎやすいメモを自動で整えています。";
  let primaryLabel = "実績を踏まえて相談する";
  let secondaryLabel = "一覧を見返して候補を整理する";
  let secondaryHref = state.compareIds.length ? "#compare-bar" : "#results-heading";
  let contextItems = ["制作実績 12件", "比較は最大3件", "お気に入りはローカル保存"];

  if (activeWork && (options.forceWork || state.isDetailModalOpen)) {
    eyebrow = "案件をもとに相談";
    title = "この事例に近い制作を、そのまま相談する。";
    description = `${activeWork.title} の構成・予算帯・制作目的を踏まえて、近い相談へつなげます。`;
    briefTitle = "この事例を起点にした相談メモ";
    briefCopy = "案件単位の要件がそのまま伝わるよう、参考事例と前提条件を整えています。";
    primaryLabel = "この事例を参考に相談する";
    secondaryLabel = "一覧に戻って他の候補も見る";
    secondaryHref = "#results-heading";
    contextItems = [
      activeWork.title,
      formatDisplayValue(activeWork.genre),
      formatDisplayValue(activeWork.purpose)
    ];
  } else if (comparedWorks.length >= 2) {
    eyebrow = "比較をもとに相談";
    title = "比較中の事例を踏まえて、要件を相談する。";
    description = "複数案件の差分を見たうえで、必要なページ数・機能・予算帯を整理した状態で相談できます。";
    briefTitle = "比較中の事例を踏まえた相談メモ";
    briefCopy = "比較表の差分が伝わるよう、検討中の候補と相談論点をまとめています。";
    primaryLabel = "比較中の事例を踏まえて相談する";
    secondaryLabel = "比較結果を見直す";
    secondaryHref = "#compare-bar";
    contextItems = comparedWorks;
  } else if (results.isEmpty) {
    eyebrow = "要件を整理して相談";
    title = "近い事例がなくても、要件から相談できます。";
    description = "条件に完全一致する実績が見つからない場合でも、目的や実装要件をもとに相談へ進めます。";
    briefTitle = "条件未一致時の相談メモ";
    briefCopy = "近い事例がないときでも、現在の検索条件や相談論点をメモとして持ち出せます。";
    primaryLabel = "要件をもとに相談する";
    secondaryLabel = "条件を見直して探し直す";
    secondaryHref = "#filter-heading";
    contextItems = ["条件再調整", "要件ヒアリング", "提案前相談"];
  } else if (state.searchQuery || filterLabels.length) {
    eyebrow = "条件をもとに相談";
    title = "現在の条件に近い事例をもとに相談する。";
    description = `${results.count}件まで絞り込んだ結果を前提に、制作方針や優先順位を相談しやすい導線です。`;
    briefTitle = "絞り込み条件を踏まえた相談メモ";
    briefCopy = "検索語や適用中の条件をそのまま相談の前提情報として渡せます。";
    primaryLabel = "この条件に近い制作を相談する";
    secondaryLabel = "候補を見返して比較する";
    secondaryHref = "#results-heading";
    contextItems = filterLabels.slice(0, 4);
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

function renderFilterGroups(container, filterCatalog, state) {
  container.innerHTML = filterCatalog
    .map((group) => {
      const selectedValues = state[group.key] || [];

      return `
        <section class="filter-group">
          <div class="filter-group__header">
            <h3 class="filter-group__title">${escapeHtml(group.label)}</h3>
            <span class="filter-group__count">${getSelectedLabel(selectedValues)}</span>
          </div>
          <div class="filter-group__options">
            ${group.options
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
                    <span>
                      ${escapeHtml(option.label)}
                      <small class="filter-option__meta">${option.count}</small>
                    </span>
                  </label>
                `;
              })
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderToolbar(elements, results, state) {
  const { resultCount, searchInput, sortOrder, activeFilters } = elements;
  const chips = getActiveFilterChips(state);

  resultCount.textContent = getResultCountLabel(results.count);
  resultCount.dataset.empty = String(results.isEmpty);

  if (searchInput.value !== state.searchQuery) {
    searchInput.value = state.searchQuery;
  }

  if (sortOrder.value !== state.sortOrder) {
    sortOrder.value = state.sortOrder;
  }

  activeFilters.innerHTML = chips.length
    ? chips
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
              ${escapeHtml(chip.label)}
            </button>
          `
        )
        .join("")
    : `<span class="tag-cloud__label">条件未選択。キーワード検索と複数フィルタを組み合わせて探せます。</span>`;
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
              <div class="work-card__meta-item work-card__meta-item--wide">
                <span class="work-card__meta-label">制作目的</span>
                <span class="work-card__meta-value">${escapeHtml(formatDisplayValue(work.purpose))}</span>
              </div>
              <div class="work-card__meta-item">
                <span class="work-card__meta-label">想定予算</span>
                <span class="work-card__meta-value">${escapeHtml(formatDisplayValue(work.budgetRange))}</span>
              </div>
              <div class="work-card__meta-item">
                <span class="work-card__meta-label">制作期間</span>
                <span class="work-card__meta-value">${escapeHtml(formatDisplayValue(work.durationRange))}</span>
              </div>
            </div>

            ${tagsMarkup ? `<div class="work-card__tags">${tagsMarkup}</div>` : ""}

            <div class="work-card__utility">
              <button
                class="card-action card-action--primary"
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
              <button
                class="card-action ${isCompared ? "work-card__action--active" : ""}"
                type="button"
                data-action="toggle-compare"
                data-work-id="${escapeHtml(work.id)}"
                aria-pressed="${isCompared}"
                aria-label="${escapeHtml(work.title)} を${isCompared ? "比較から外す" : "比較に追加する"}"
                ${compareDisabled ? "disabled" : ""}
              >
                ${isCompared ? "比較中" : compareDisabled ? "上限3件" : "比較に追加"}
              </button>
              <button
                class="card-action ${isFavorite ? "work-card__action--active" : ""}"
                type="button"
                data-action="toggle-favorite"
                data-work-id="${escapeHtml(work.id)}"
                aria-pressed="${isFavorite}"
                aria-label="${escapeHtml(work.title)} を${isFavorite ? "お気に入りから外す" : "お気に入りに追加する"}"
              >
                ${isFavorite ? "お気に入り済み" : "お気に入りに追加"}
              </button>
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
          <p class="compare-slot__meta">${escapeHtml(formatDisplayValue(work.genre))} / ${escapeHtml(formatDisplayValue(work.budgetRange))}</p>
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
                <span class="compare-table__meta">${escapeHtml(formatDisplayValue(work.purpose))} / ${escapeHtml(formatDisplayValue(work.budgetRange))}</span>
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
  openComparePanel.setAttribute("aria-expanded", String(state.isComparePanelOpen && hasCompareItems));
  openComparePanel.setAttribute("aria-disabled", String(!hasCompareItems));
  clearCompare.setAttribute("aria-disabled", String(!hasCompareItems));

  if (!hasCompareItems) {
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
      : "選択中の事例を比較表で見比べながら、そのまま相談内容を整理できます。";
  clearCompare.disabled = false;
  openComparePanel.disabled = false;
  compareSlots.innerHTML = renderCompareSlots(selectedWorks);
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
  const externalDetailAction = hasDetailPageUrl(activeWork)
    ? `
      <a
        class="ghost-button"
        href="${escapeHtml(activeWork.detailUrl)}"
        target="_blank"
        rel="noopener noreferrer"
      >
        詳細ページを見る
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
            aria-label="${escapeHtml(activeWork.title)} を参考に相談を始める"
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
            ${isCompared ? "比較中" : compareDisabled ? "上限3件" : "比較に追加"}
          </button>
          <button
            class="card-action ${isFavorite ? "work-card__action--active" : ""}"
            type="button"
            data-action="toggle-favorite"
            data-work-id="${escapeHtml(activeWork.id)}"
            aria-pressed="${isFavorite}"
            aria-label="${escapeHtml(activeWork.title)} を${isFavorite ? "お気に入りから外す" : "お気に入りに追加する"}"
          >
            ${isFavorite ? "お気に入り済み" : "お気に入りに追加"}
          </button>
          ${externalDetailAction}
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
          <div>
            <dt>想定予算帯</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.budgetRange))}</dd>
          </div>
          <div>
            <dt>制作期間帯</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.durationRange))}</dd>
          </div>
          <div>
            <dt>規模感</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.scale))}</dd>
          </div>
          <div>
            <dt>デザイン傾向</dt>
            <dd>${escapeHtml(formatDisplayValue(activeWork.designTone))}</dd>
          </div>
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
  const contextItems = content.contextItems?.length ? content.contextItems : ["相談文脈を整理中"];

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
