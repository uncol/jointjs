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
  }

  function movePan(e: MouseEvent) {
    if (!panOrigin || !translateOrigin) return;
    paper.translate(
      translateOrigin.tx + (e.clientX - panOrigin.x),
      translateOrigin.ty + (e.clientY - panOrigin.y),
    );
  }

  function stopPan() {
    if (!panOrigin) return;
    panOrigin = null;
    translateOrigin = null;
    paper.el.style.cursor = "";
    onViewportChange?.();
  }

  // ── Wiring ───────────────────────────────────────────────────────
  paper.el.addEventListener("wheel", onWheel, {passive: false});
  paper.on("blank:pointerdown", startPan);
  document.addEventListener("mousemove", movePan);
  document.addEventListener("mouseup", stopPan);

  return function dispose() {
    paper.el.removeEventListener("wheel", onWheel);
    paper.off("blank:pointerdown", startPan);
    document.removeEventListener("mousemove", movePan);
    document.removeEventListener("mouseup", stopPan);
  };
}
