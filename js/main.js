import { works } from "../data/works.js";
import {
  SORT_ORDERS,
  getDerivedWorks,
  getFilterCatalog,
  getPopularTags
} from "./filter.js";
import { renderApp } from "./render.js";
import {
  getToggledArrayValues,
  getState,
  hydrateState,
  resetFilterState,
  subscribe,
  toggleArrayValue,
  updateState
} from "./state.js";
import { loadFavoriteIds, saveFavoriteIds } from "./storage.js";
import { CONSULTATION_TARGET } from "./consultation.js";
import { readStateFromUrl, writeStateToUrl } from "./urlState.js";

const worksById = new Map(works.map((work) => [work.id, work]));
const validWorkIds = works.map((work) => work.id);
const filterCatalog = getFilterCatalog(works);
const popularTags = getPopularTags(works);
const siteSummary = {
  totalWorks: works.length,
  realWorks: works.filter((work) => !work.isConcept).length,
  filterAxes: filterCatalog.length
};
const urlStateConfig = {
  filterCatalog,
  validSortOrders: new Set(SORT_ORDERS),
  validWorkIds: new Set(validWorkIds),
  defaultSortOrder: "recommended"
};

const elements = {
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#search-input"),
  sortOrder: document.querySelector("#sort-order"),
  resetFilters: document.querySelector("#reset-filters"),
  emptyReset: document.querySelector("#empty-reset"),
  heroStatTotal: document.querySelector("#hero-stat-total"),
  heroStatReal: document.querySelector("#hero-stat-real"),
  heroStatFilters: document.querySelector("#hero-stat-filters"),
  filterGroups: document.querySelector("#filter-groups"),
  popularTags: document.querySelector("#popular-tags"),
  resultCount: document.querySelector("#result-count"),
  activeFilters: document.querySelector("#active-filters"),
  worksGrid: document.querySelector("#works-grid"),
  emptyState: document.querySelector("#empty-state"),
  ctaEyebrow: document.querySelector("#cta-eyebrow"),
  ctaTitle: document.querySelector("#cta-title"),
  ctaDescription: document.querySelector("#cta-description"),
  ctaBriefTitle: document.querySelector("#cta-brief-title"),
  ctaBriefCopy: document.querySelector("#cta-brief-copy"),
  ctaContext: document.querySelector("#cta-context"),
  ctaDraft: document.querySelector("#cta-draft"),
  ctaCopy: document.querySelector("#cta-copy"),
  ctaStatus: document.querySelector("#cta-status"),
  ctaPrimary: document.querySelector("#cta-primary"),
  ctaSecondary: document.querySelector("#cta-secondary"),
  compareBar: document.querySelector("#compare-bar"),
  compareCount: document.querySelector("#compare-count"),
  compareNote: document.querySelector("#compare-note"),
  compareSlots: document.querySelector("#compare-slots"),
  clearCompare: document.querySelector("#clear-compare"),
  openComparePanel: document.querySelector("#open-compare-panel"),
  closeComparePanel: document.querySelector("#close-compare-panel"),
  comparePanelOverlay: document.querySelector("#compare-panel-overlay"),
  comparePanel: document.querySelector("#compare-panel"),
  comparePanelBody: document.querySelector("#compare-panel-body"),
  detailModalOverlay: document.querySelector("#detail-modal-overlay"),
  detailModal: document.querySelector("#detail-modal"),
  closeDetailModal: document.querySelector("#close-detail-modal"),
  detailModalBody: document.querySelector("#detail-modal-body")
};

let previousState = getState();
let pendingDialogFocus = null;

const focusReturnTargets = {
  detail: null,
  compare: null
};

function setFocusReturnTarget(dialogKey, trigger, selector) {
  focusReturnTargets[dialogKey] = {
    element: trigger instanceof HTMLElement ? trigger : null,
    selector: typeof selector === "string" ? selector : null
  };
}

function getInitialState() {
  const urlState = readStateFromUrl(urlStateConfig);
  const favoriteIds = loadFavoriteIds(validWorkIds);

  return {
    ...urlState,
    favoriteIds
  };
}

function renderState(state = getState()) {
  const results = getDerivedWorks(works, state);

  renderApp({
    elements,
    filterCatalog,
    popularTags,
    results,
    worksById,
    state,
    consultationConfig: CONSULTATION_TARGET
  });
  attachThumbnailFallbacks();
  saveFavoriteIds(state.favoriteIds);
  writeStateToUrl(state, urlStateConfig);
}

function renderSiteSummary() {
  if (elements.heroStatTotal) {
    elements.heroStatTotal.textContent = String(siteSummary.totalWorks);
  }

  if (elements.heroStatReal) {
    elements.heroStatReal.textContent = String(siteSummary.realWorks);
  }

  if (elements.heroStatFilters) {
    elements.heroStatFilters.textContent = String(siteSummary.filterAxes);
  }
}

function applyThumbnailFallback(image) {
  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  const fallbackSource = image.dataset.fallbackSrc;

  if (!fallbackSource || image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = fallbackSource;
}

function handleThumbnailError(event) {
  applyThumbnailFallback(event.currentTarget);
}

function attachThumbnailFallbacks() {
  document.querySelectorAll("img[data-fallback-src]").forEach((image) => {
    if (!(image instanceof HTMLImageElement) || image.dataset.fallbackBound === "true") {
      return;
    }

    image.dataset.fallbackBound = "true";
    image.addEventListener("error", handleThumbnailError);

    if (image.complete && image.naturalWidth === 0) {
      applyThumbnailFallback(image);
    }
  });
}

function getOpenDialogKey(state) {
  if (state.isDetailModalOpen) {
    return "detail";
  }

  if (state.isComparePanelOpen) {
    return "compare";
  }

  return null;
}

function getDialogElements(dialogKey) {
  if (dialogKey === "detail") {
    return {
      overlay: elements.detailModalOverlay,
      panel: elements.detailModal,
      closeButton: elements.closeDetailModal
    };
  }

  if (dialogKey === "compare") {
    return {
      overlay: elements.comparePanelOverlay,
      panel: elements.comparePanel,
      closeButton: elements.closeComparePanel
    };
  }

  return null;
}

function getFocusableElements(container) {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return [...container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const styles = window.getComputedStyle(element);
    return styles.display !== "none" && styles.visibility !== "hidden" && !element.closest("[hidden]");
  });
}

function restoreFocus(dialogKey) {
  const target = focusReturnTargets[dialogKey];

  if (!target) {
    return;
  }

  const nextTarget =
    target.element instanceof HTMLElement && document.contains(target.element)
      ? target.element
      : target.selector
        ? document.querySelector(target.selector)
        : null;

  if (nextTarget instanceof HTMLElement) {
    nextTarget.focus();
  }

  focusReturnTargets[dialogKey] = null;
}

function clearFocusReturnTarget(dialogKey) {
  focusReturnTargets[dialogKey] = null;
}

function focusDialog(dialogKey) {
  const dialog = getDialogElements(dialogKey);

  if (!dialog) {
    return;
  }

  const preferredTarget =
    pendingDialogFocus?.key === dialogKey
      ? dialog.panel.querySelector(pendingDialogFocus.selector)
      : null;

  pendingDialogFocus = null;

  const focusTarget =
    preferredTarget instanceof HTMLElement
      ? preferredTarget
      : dialog.closeButton || getFocusableElements(dialog.panel)[0] || dialog.panel;

  if (focusTarget instanceof HTMLElement) {
    focusTarget.focus({ preventScroll: true });
  }
}

function syncDialogEffects(nextState) {
  const previousDialogKey = getOpenDialogKey(previousState);
  const nextDialogKey = getOpenDialogKey(nextState);

  document.body.classList.toggle("body--overlay-open", Boolean(nextDialogKey));

  if (previousDialogKey && previousDialogKey !== nextDialogKey) {
    if (nextDialogKey) {
      clearFocusReturnTarget(previousDialogKey);
    } else {
      restoreFocus(previousDialogKey);
    }
  }

  if (!nextDialogKey) {
    pendingDialogFocus = null;
    previousState = nextState;
    return;
  }

  requestAnimationFrame(() => {
    const dialog = getDialogElements(nextDialogKey);

    if (!dialog) {
      return;
    }

    const activeElement = document.activeElement;
    const shouldMoveFocus =
      previousDialogKey !== nextDialogKey ||
      !(activeElement instanceof HTMLElement) ||
      !dialog.panel.contains(activeElement) ||
      pendingDialogFocus?.key === nextDialogKey;

    if (shouldMoveFocus) {
      focusDialog(nextDialogKey);
    }
  });

  previousState = nextState;
}

function setPendingDialogFocus(dialogKey, selector) {
  pendingDialogFocus = {
    key: dialogKey,
    selector
  };
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  const previousActiveElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  if (!(elements.ctaDraft instanceof HTMLTextAreaElement)) {
    return false;
  }

  elements.ctaDraft.focus({ preventScroll: true });
  elements.ctaDraft.select();
  elements.ctaDraft.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    if (previousActiveElement instanceof HTMLElement && document.contains(previousActiveElement)) {
      previousActiveElement.focus({ preventScroll: true });
    }
  }
}

function setConsultationStatus(message, isError = false) {
  if (!(elements.ctaStatus instanceof HTMLElement)) {
    return;
  }

  elements.ctaStatus.textContent = message;
  elements.ctaStatus.dataset.error = String(isError);
}

async function handleCopyConsultation() {
  const text = elements.ctaCopy?.dataset.copyText || elements.ctaDraft?.value || "";
  const isCopied = await copyTextToClipboard(text);

  setConsultationStatus(
    isCopied ? "閲覧メモをコピーしました。" : "コピーに失敗しました。手動でメモを選択してください。",
    !isCopied
  );
}

function openConsultationTarget(href) {
  if (!href) {
    return;
  }

  window.location.href = href;
}

function openDetailModal(workId, trigger) {
  if (!worksById.has(workId)) {
    return;
  }

  setFocusReturnTarget("detail", trigger, `[data-action="open-details"][data-work-id="${workId}"]`);
  pendingDialogFocus = null;

  updateState({
    activeWorkId: workId,
    isDetailModalOpen: true,
    isComparePanelOpen: false
  });
}

function closeDetailModal(options = {}) {
  if (options.returnFocus === false) {
    focusReturnTargets.detail = null;
  }

  pendingDialogFocus = null;

  updateState({
    activeWorkId: null,
    isDetailModalOpen: false
  });
}

function openComparePanel(trigger) {
  setFocusReturnTarget("compare", trigger, "#open-compare-panel");
  pendingDialogFocus = null;

  updateState((currentState) => {
    if (!currentState.compareIds.length) {
      return null;
    }

    return {
      isComparePanelOpen: true,
      isDetailModalOpen: false,
      activeWorkId: null
    };
  });
}

function closeComparePanel(options = {}) {
  if (options.returnFocus === false) {
    focusReturnTargets.compare = null;
  }

  pendingDialogFocus = null;

  updateState({
    isComparePanelOpen: false
  });
}

function toggleCompareWork(workId) {
  updateState((currentState) => {
    const nextCompareIds = getToggledArrayValues(currentState.compareIds, workId, { max: 3 });

    if (nextCompareIds == null) {
      return null;
    }

    return {
      compareIds: nextCompareIds,
      isComparePanelOpen: nextCompareIds.length ? currentState.isComparePanelOpen : false
    };
  });
}

function handleStateChange(nextState) {
  renderState(nextState);
  syncDialogEffects(nextState);
}

function handleFilterChange(event) {
  const input = event.target.closest("input[data-filter-key]");

  if (!input) {
    return;
  }

  toggleArrayValue(input.dataset.filterKey, input.value);
}

function handleClick(event) {
  if (event.target === elements.comparePanelOverlay) {
    closeComparePanel();
    return;
  }

  if (event.target === elements.detailModalOverlay) {
    closeDetailModal();
    return;
  }

  const trigger = event.target.closest(
    "[data-action], #reset-filters, #empty-reset, #clear-compare, #open-compare-panel, #close-compare-panel, #close-detail-modal, #cta-copy"
  );

  if (!trigger) {
    return;
  }

  if (trigger.id === "reset-filters" || trigger.id === "empty-reset") {
    resetFilterState();
    return;
  }

  if (trigger.id === "clear-compare") {
    focusReturnTargets.compare = null;
    pendingDialogFocus = null;
    updateState({ compareIds: [], isComparePanelOpen: false });
    return;
  }

  if (trigger.id === "open-compare-panel") {
    openComparePanel(trigger);
    return;
  }

  if (trigger.id === "close-compare-panel") {
    closeComparePanel();
    return;
  }

  if (trigger.id === "close-detail-modal") {
    closeDetailModal();
    return;
  }

  if (trigger.id === "cta-copy") {
    handleCopyConsultation();
    return;
  }

  const action = trigger.dataset.action;

  if (action === "apply-popular-tag") {
    updateState({ searchQuery: trigger.dataset.value || "" });
    return;
  }

  if (action === "remove-filter-chip") {
    const { filterKey, value } = trigger.dataset;

    if (filterKey === "searchQuery") {
      updateState({ searchQuery: "" });
      return;
    }

    toggleArrayValue(filterKey, value);
    return;
  }

  if (action === "open-details") {
    openDetailModal(trigger.dataset.workId, trigger);
    return;
  }

  if (action === "toggle-compare") {
    if (elements.detailModal.contains(trigger)) {
      setPendingDialogFocus("detail", `[data-action="toggle-compare"][data-work-id="${trigger.dataset.workId}"]`);
    }

    toggleCompareWork(trigger.dataset.workId);
    return;
  }

  if (action === "toggle-favorite") {
    if (elements.detailModal.contains(trigger)) {
      setPendingDialogFocus("detail", `[data-action="toggle-favorite"][data-work-id="${trigger.dataset.workId}"]`);
    }

    toggleArrayValue("favoriteIds", trigger.dataset.workId);
    return;
  }

  if (action === "consult-work") {
    const consultationHref = trigger.dataset.consultationHref || elements.ctaPrimary?.getAttribute("href") || "";
    closeDetailModal({ returnFocus: false });
    requestAnimationFrame(() => openConsultationTarget(consultationHref));
  }
}

function trapFocus(event, dialogKey) {
  const dialog = getDialogElements(dialogKey);

  if (!dialog) {
    return;
  }

  const focusableElements = getFocusableElements(dialog.panel);

  if (!focusableElements.length) {
    event.preventDefault();
    dialog.panel.focus({ preventScroll: true });
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;
  const isOutsideDialog = !(activeElement instanceof HTMLElement) || !dialog.panel.contains(activeElement);

  if (event.shiftKey) {
    if (isOutsideDialog || activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }

    return;
  }

  if (isOutsideDialog || activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function handleKeydown(event) {
  const currentState = getState();
  const openDialogKey = getOpenDialogKey(currentState);

  if (!openDialogKey) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();

    if (openDialogKey === "detail") {
      closeDetailModal();
      return;
    }

    closeComparePanel();
    return;
  }

  if (event.key === "Tab") {
    trapFocus(event, openDialogKey);
  }
}

function handleSearchInput(event) {
  updateState({ searchQuery: event.target.value });
}

function handleSortChange(event) {
  updateState({ sortOrder: event.target.value });
}

function bindEvents() {
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.sortOrder.addEventListener("change", handleSortChange);
  elements.filterGroups.addEventListener("change", handleFilterChange);
  document.addEventListener("click", handleClick);
  document.addEventListener("keydown", handleKeydown);
  elements.searchForm.addEventListener("submit", (event) => event.preventDefault());
}

function initialize() {
  hydrateState(getInitialState());
  const initialState = getState();
  renderSiteSummary();
  renderState(initialState);
  previousState = initialState;
  subscribe(handleStateChange);
  bindEvents();
}

initialize();
