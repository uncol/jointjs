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

  // ── Zoom ─────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent) {
    e.preventDefault();

    const oldScale = paper.scale().sx;
    const factor = e.deltaY < 0 ? (1 + zoomStep) : 1 / (1 + zoomStep);
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
    panOrigin = {x: e.clientX!, y: e.clientY!};
    translateOrigin = paper.translate();
    paper.el.style.cursor = "grabbing";
    document.addEventListener("pointermove", movePan);
    document.addEventListener("pointerup", stopPan);
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
        paper.translate(newTx, newTy);
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
      paper.translate(newTx, newTy);
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
