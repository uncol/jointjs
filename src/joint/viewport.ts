//---------------------------------------------------------------------
// ViewportManager - Coordinates and scaling management
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia } from "@joint/core";

export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportState {
  center: Point;
  zoom: number;
  bounds: Bounds;
}

export interface ViewportManagerOptions {
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
  paperWidth: number;
  paperHeight: number;
}

export interface ElementJSON {
  position?: Point;
  [key: string]: unknown;
}

const DEFAULT_OPTIONS: Omit<ViewportManagerOptions, 'paperWidth' | 'paperHeight'> = {
  minZoom: 0.1,
  maxZoom: 10,
  zoomStep: 0.1,
};

/**
 * ViewportManager - manages viewport state, zoom, pan and coordinate transformations
 */
export class ViewportManager {
  private paper: dia.Paper;
  private options: ViewportManagerOptions;
  private listeners: Map<string, Set<Function>> = new Map();

  constructor(paper: dia.Paper, options: ViewportManagerOptions) {
    this.paper = paper;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Update paper dimensions (preserves listeners and instance identity)
   */
  updatePaperSize(paperWidth: number, paperHeight: number): void {
    this.options.paperWidth = paperWidth;
    this.options.paperHeight = paperHeight;
  }

  /**
   * Get current viewport state
   */
  getState(): ViewportState {
    const scale = this.paper.scale();
    const translate = this.paper.translate();
    const containerSize = this.getContainerSize();

    // Calculate visible bounds in world coordinates
    const bounds: Bounds = {
      x: -translate.tx / scale.sx,
      y: -translate.ty / scale.sy,
      width: containerSize.width / scale.sx,
      height: containerSize.height / scale.sy,
    };

    // Calculate center point
    const center: Point = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    };

    return {
      center,
      zoom: scale.sx,
      bounds,
    };
  }

  /**
   * Get container size
   */
  private getContainerSize(): { width: number; height: number } {
    const container = this.paper.el.parentElement;
    return {
      width: container?.clientWidth || this.options.paperWidth,
      height: container?.clientHeight || this.options.paperHeight,
    };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  screenToWorld(point: Point): Point {
    return this.paper.clientToLocalPoint(point);
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  worldToScreen(point: Point): Point {
    return this.paper.localToClientPoint(point);
  }

  /**
   * Calculate scale to fit paper into container
   */
  calculateFitScale(padding = 0): number {
    const containerSize = this.getContainerSize();
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    const scaleX = availableWidth / this.options.paperWidth;
    const scaleY = availableHeight / this.options.paperHeight;

    // Use minimum to fit both dimensions
    const scale = Math.min(scaleX, scaleY);

    // Clamp to min/max zoom
    return Math.max(this.options.minZoom!, Math.min(this.options.maxZoom!, scale));
  }

  /**
   * Zoom to fit the entire paper in the viewport
   */
  zoomToFit(padding = 0): void {
    const scale = this.calculateFitScale(padding);
    const containerSize = this.getContainerSize();

    // Calculate translation to center the paper
    const scaledWidth = this.options.paperWidth * scale;
    const scaledHeight = this.options.paperHeight * scale;

    const tx = (containerSize.width - scaledWidth) / 2;
    const ty = (containerSize.height - scaledHeight) / 2;

    this.paper.scale(scale, scale);
    this.paper.translate(tx, ty);

    this.emit('viewport:change', this.getState());
  }
   
  /**
   * Transform To Fit Content
   */
  transformToFitContent(): void {
    this.paper.transformToFitContent();
  }

  /**
   * Zoom in
   */
  zoomIn(center?: Point): void {
    const currentScale = this.paper.scale().sx;
    const newScale = Math.min(this.options.maxZoom!, currentScale + this.options.zoomStep!);
    this.zoomTo(newScale, center);
  }

  /**
   * Zoom out
   */
  zoomOut(center?: Point): void {
    const currentScale = this.paper.scale().sx;
    const newScale = Math.max(this.options.minZoom!, currentScale - this.options.zoomStep!);
    this.zoomTo(newScale, center);
  }

  /**
   * Zoom to specific level
   */
  zoomTo(level: number, center?: Point): void {
    const clampedLevel = Math.max(this.options.minZoom!, Math.min(this.options.maxZoom!, level));

    if (center) {
      // Zoom at specific point (e.g., cursor position) — already in local coordinates
      this.paper.scaleUniformAtPoint(clampedLevel, center);
    } else {
      // Zoom at center of current viewport (in local coordinates)
      const state = this.getState();
      this.paper.scaleUniformAtPoint(clampedLevel, state.center);
    }

    this.emit('viewport:change', this.getState());
  }

  /**
   * Zoom to fit a specific world bounds into the viewport
   */
  zoomToBounds(bounds: Bounds, padding = 0): void {
    const containerSize = this.getContainerSize();
    const availableWidth = containerSize.width - padding * 2;
    const availableHeight = containerSize.height - padding * 2;

    if (bounds.width <= 0 || bounds.height <= 0) return;

    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    let scale = Math.min(scaleX, scaleY);
    // Clamp to min/max zoom
    scale = Math.max(this.options.minZoom!, Math.min(this.options.maxZoom!, scale));

    const scaledWidth = bounds.width * scale;
    const scaledHeight = bounds.height * scale;

    const desiredLeft = (containerSize.width - scaledWidth) / 2;
    const desiredTop = (containerSize.height - scaledHeight) / 2;

    const tx = desiredLeft - bounds.x * scale;
    const ty = desiredTop - bounds.y * scale;

    this.paper.scale(scale, scale);
    this.paper.translate(tx, ty);

    this.emit('viewport:change', this.getState());
  }

  /**
   * Reset zoom to fit view (100% = fit)
   */
  resetZoom(): void {
    this.zoomToFit();
  }

  /**
   * Pan to center on a specific world point
   */
  panTo(center: Point): void {
    const containerSize = this.getContainerSize();
    const scale = this.paper.scale().sx;

    const tx = containerSize.width / 2 - center.x * scale;
    const ty = containerSize.height / 2 - center.y * scale;

    this.paper.translate(tx, ty);
    this.emit('viewport:change', this.getState());
  }

  /**
   * Pan by delta in screen coordinates
   */
  panBy(delta: Point): void {
    const translate = this.paper.translate();
    this.paper.translate(translate.tx + delta.x, translate.ty + delta.y);
    this.emit('viewport:change', this.getState());
  }

  /**
   * Center viewport on an element
   */
  centerOn(element: dia.Element): void {
    const bbox = element.getBBox();
    const center: Point = {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2,
    };
    this.panTo(center);
  }

  /**
   * Get current zoom level as percentage
   */
  getZoomPercent(): number {
    const fitScale = this.calculateFitScale();
    const currentScale = this.paper.scale().sx;
    return Math.round((currentScale / fitScale) * 100);
  }

  /**
   * Set zoom by percentage (100% = fit)
   */
  setZoomPercent(percent: number): void {
    const fitScale = this.calculateFitScale();
    const targetScale = (percent / 100) * fitScale;
    this.zoomTo(targetScale);
  }

  /**
   * Notify listeners about viewport change (for external zoom/pan sources)
   */
  notifyChange(): void {
    this.emit('viewport:change', this.getState());
  }

  /**
   * Subscribe to viewport changes
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from viewport changes
   */
  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  /**
   * Check if paper is in edit mode (interactive)
   */
  isEditMode(): boolean {
    return this.paper.options.interactive === true;
  }

  /**
   * set paper interactivity (edit mode)
   * @param enabled 
   */
  setEditMode(enabled: boolean): void {
    // this.paper.options.interactive = enabled;
    this.paper.setInteractivity(enabled);
  }

    /**
   * Calculate bounds from cell positions in old format JSON
   * @param {Array} cells - Array of cells with position data
   * @returns {Object|null} - Bounds {minX, minY, maxX, maxY} or null if no cells
   */
  calculateBoundsFromCells(cells: ElementJSON[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!cells || cells.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const cell of cells) {
      // Only process elements with positions (not links)
      if (cell.position && typeof cell.position.x === 'number' && typeof cell.position.y === 'number') {
        const x = cell.position.x;
        const y = cell.position.y;

        // Estimate element size (default icon size ~64px)
        const elementWidth = 64;
        const elementHeight = 64;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + elementWidth);
        maxY = Math.max(maxY, y + elementHeight);
      }
    }

    // If no valid positions found, return null
    if (!isFinite(minX)) {
      return null;
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.listeners.clear();
  }
}
