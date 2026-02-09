//---------------------------------------------------------------------
// JointJS Pan & Zoom
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia } from "@joint/core";

export interface PanZoomOptions {
  /** Minimum allowed zoom level. Default: 0.2 */
  minZoom?: number;
  /** Maximum allowed zoom level. Default: 5 */
  maxZoom?: number;
  /** Zoom multiplier per wheel step. Default: 0.1 (i.e. ×1.1 per notch) */
  zoomStep?: number;
  /** Called after zoom or pan changes (e.g., to sync with ViewportManager) */
  onViewportChange?: () => void;
  /** Called when user selects an area with Ctrl+drag. Bounds in world coords */
  onAreaSelect?: (bounds: {x: number; y: number; width: number; height: number}) => void;
}

const DEFAULTS: Required<Pick<PanZoomOptions, 'minZoom' | 'maxZoom' | 'zoomStep'>> = {
  minZoom: 0.2,
  maxZoom: 5,
  zoomStep: 0.1,
};

/**
 * Attach pan and wheel-zoom to a Paper.
 * - Zoom: scroll wheel, anchored to cursor position.
 * - Pan: left-mouse drag on blank canvas (elements drag as usual).
 * Returns a dispose function that removes all listeners.
 */
export function enablePanZoom(paper: dia.Paper, options: PanZoomOptions = {}): () => void {
  const {minZoom, maxZoom, zoomStep} = {...DEFAULTS, ...options};
  const onViewportChange = options.onViewportChange;
  const onAreaSelect = options.onAreaSelect;

  let panOrigin: {x: number; y: number} | null = null;
  let translateOrigin: {tx: number; ty: number} | null = null;
  let rafId: number | null = null;
  let pendingTranslate: {tx: number; ty: number} | null = null;
  // For incremental updates to avoid jumps/jitter we track the last applied
  // translate and the last pointer position that it corresponds to.
  let lastAppliedTx: number | null = null;
  let lastAppliedTy: number | null = null;
  let lastPointer: {x: number; y: number} | null = null;
  let latestPointer: {x: number; y: number} | null = null;

  // Selection state for Ctrl+drag area selection
  let selectionDiv: HTMLElement | null = null;
  let selectionStartClient: {x: number; y: number} | null = null;

  // ── Zoom ─────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    e.preventDefault();

    const oldScale = paper.scale().sx;

    // Normalize wheel delta across devices (pixels / lines / pages)
    let delta = e.deltaY;
    if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
    else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= 800;

    // Use exponential scale so that delta magnitude affects zoom smoothly.
    // Negative delta -> zoom in, positive -> zoom out.
    const dpi = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
    const factor = Math.pow(1 + zoomStep, -delta / (100 * dpi));
    const newScale = Math.min(maxZoom, Math.max(minZoom, oldScale * factor));
    if (newScale === oldScale) return;

    // Convert client coordinates to paper local coordinates
    const localPoint = paper.clientToLocalPoint({x: e.clientX, y: e.clientY});
    paper.scaleUniformAtPoint(newScale, localPoint);
    onViewportChange?.();
  }

  // ── Pan ──────────────────────────────────────────────────────────
  // blank:pointerdown fires only on empty canvas — elements
  // are dragged by standard JointJS mechanism without conflicts.
  function startPan(e: dia.Event) {
    // If Ctrl (or Cmd) is pressed start area selection instead of panning
    if ((e.ctrlKey || (e as any).metaKey) && (e.button === 0 || e.button == null)) {
      startSelection(e as unknown as PointerEvent);
      return;
    }

    panOrigin = {x: e.clientX!, y: e.clientY!};
    translateOrigin = paper.translate();
    paper.el.style.cursor = "grabbing";
    document.addEventListener("pointermove", movePan);
    document.addEventListener("pointerup", stopPan);
  }

  function startSelection(e: PointerEvent) {
    const container = paper.el.parentElement as HTMLElement;
    if (!container) return;
    selectionStartClient = {x: e.clientX, y: e.clientY};
    // Create overlay div
    selectionDiv = document.createElement('div');
    selectionDiv.className = 'selection-rect';
    selectionDiv.style.left = '0px';
    selectionDiv.style.top = '0px';
    selectionDiv.style.width = '0px';
    selectionDiv.style.height = '0px';
    container.appendChild(selectionDiv);
    document.addEventListener('pointermove', selectionMove);
    document.addEventListener('pointerup', selectionEnd);
  }

  function selectionMove(e: PointerEvent) {
    if (!selectionDiv || !selectionStartClient) return;
    const container = paper.el.parentElement as HTMLElement;
    const crect = container.getBoundingClientRect();
    const x1 = selectionStartClient.x - crect.left;
    const y1 = selectionStartClient.y - crect.top;
    const x2 = e.clientX - crect.left;
    const y2 = e.clientY - crect.top;
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    selectionDiv.style.left = `${left}px`;
    selectionDiv.style.top = `${top}px`;
    selectionDiv.style.width = `${width}px`;
    selectionDiv.style.height = `${height}px`;
  }

  function selectionEnd(e: PointerEvent) {
    if (!selectionDiv || !selectionStartClient) return;
    // Compute world coords for selection corners
    const startClient = selectionStartClient;
    const endClient = {x: e.clientX, y: e.clientY};
    const p1 = paper.clientToLocalPoint({x: startClient.x, y: startClient.y});
    const p2 = paper.clientToLocalPoint({x: endClient.x, y: endClient.y});
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const width = Math.abs(p2.x - p1.x);
    const height = Math.abs(p2.y - p1.y);
    // Cleanup
    selectionDiv.remove();
    selectionDiv = null;
    selectionStartClient = null;
    document.removeEventListener('pointermove', selectionMove);
    document.removeEventListener('pointerup', selectionEnd);
    // Notify consumer
    onAreaSelect?.({x, y, width, height});
  }

  function movePan(e: PointerEvent) {
    if (!panOrigin || !translateOrigin) return;
    latestPointer = {x: e.clientX, y: e.clientY};
    // Initialize lastApplied and lastPointer on first move
    if (lastAppliedTx == null || lastPointer == null) {
      lastAppliedTx = translateOrigin.tx;
      lastAppliedTy = translateOrigin.ty;
      lastPointer = {x: panOrigin.x, y: panOrigin.y};
    }

    if (rafId == null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!latestPointer || lastAppliedTx == null || lastAppliedTy == null || lastPointer == null) return;
        const dx = latestPointer.x - lastPointer.x;
        const dy = latestPointer.y - lastPointer.y;
        const newTx = lastAppliedTx + dx;
        const newTy = lastAppliedTy + dy;
          const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
          const roundTx = Math.round(newTx * dpr) / dpr;
          const roundTy = Math.round(newTy * dpr) / dpr;
          paper.translate(roundTx, roundTy);
        // commit applied values
        lastAppliedTx = newTx;
        lastAppliedTy = newTy;
        lastPointer = {x: latestPointer.x, y: latestPointer.y};
        latestPointer = null;
      });
    }
  }

  function stopPan() {
    if (!panOrigin) return;
    // flush any pending movement synchronously
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (latestPointer && lastAppliedTx != null && lastPointer) {
      const dx = latestPointer.x - lastPointer.x;
      const dy = latestPointer.y - lastPointer.y;
      const newTx = lastAppliedTx + dx;
      const newTy = lastAppliedTy! + dy;
      const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
      const roundTx = Math.round(newTx * dpr) / dpr;
      const roundTy = Math.round(newTy * dpr) / dpr;
      paper.translate(roundTx, roundTy);
    }
    // reset state
    pendingTranslate = null;
    latestPointer = null;
    lastPointer = null;
    lastAppliedTx = null;
    lastAppliedTy = null;
    panOrigin = null;
    translateOrigin = null;
    paper.el.style.cursor = "";
    onViewportChange?.();
    document.removeEventListener("pointermove", movePan);
    document.removeEventListener("pointerup", stopPan);
  }

  // ── Wiring ───────────────────────────────────────────────────────
  // Prevent browser touch/gesture handling delays and allow pointer events.
  paper.el.style.touchAction = "none";
  paper.el.addEventListener("wheel", onWheel, {passive: false});
  paper.on("blank:pointerdown", startPan);

  return function dispose() {
    paper.el.removeEventListener("wheel", onWheel);
    paper.off("blank:pointerdown", startPan);
    document.removeEventListener("pointermove", movePan);
    document.removeEventListener("pointerup", stopPan);
  };
}
