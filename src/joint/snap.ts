//---------------------------------------------------------------------
// Snap System - Grid snap and visual guides
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia, V } from "@joint/core";

export type SnapMode = 'grid' | 'free';

export interface SnapOptions {
  gridSize?: number;
  showGuides?: boolean;
  guideColor?: string;
}

const DEFAULT_OPTIONS: SnapOptions = {
  gridSize: 10,
  showGuides: true,
  guideColor: '#2196F3',
};

/**
 * SnapManager - manages grid snapping and visual guides
 */
export class SnapManager {
  private paper: dia.Paper;
  private options: SnapOptions;
  private _mode: SnapMode = 'grid';
  private guidesContainer: SVGGElement | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private dragHandler: ((elementView: dia.ElementView, evt: dia.Event, x: number, y: number) => void) | null = null;
  private dragEndHandler: ((elementView: dia.ElementView, evt: dia.Event, x: number, y: number) => void) | null = null;

  constructor(paper: dia.Paper, options: SnapOptions = {}) {
    this.paper = paper;
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.setupGuidesContainer();
    this.setupDragListeners();
  }

  /**
   * Get current snap mode
   */
  get mode(): SnapMode {
    return this._mode;
  }

  /**
   * Set snap mode
   */
  setMode(mode: SnapMode): void {
    this._mode = mode;
    this.updatePaperSnapSettings();
    this.emit('mode:change', mode);
  }

  /**
   * Toggle between grid and free modes
   */
  toggleMode(): SnapMode {
    const newMode = this._mode === 'grid' ? 'free' : 'grid';
    this.setMode(newMode);
    return newMode;
  }

  /**
   * Update paper snap settings based on current mode
   */
  private updatePaperSnapSettings(): void {
    if (this._mode === 'grid') {
      // Enable grid snapping
      this.paper.setGridSize(this.options.gridSize || 10);
      this.paper.setGrid(true);
    } else {
      // Disable grid snapping (set to 1 for free movement)
      this.paper.setGridSize(1);
      this.paper.setGrid(false);
    }
  }

  /**
   * Setup container for guide lines
   */
  private setupGuidesContainer(): void {
    // Create a group for guides in the paper's SVG
    const guidesGroup = V('g', { class: 'snap-guides' });
    this.paper.svg.appendChild(guidesGroup.node);
    this.guidesContainer = guidesGroup.node as SVGGElement;
  }

  /**
   * Setup drag listeners for showing guides
   */
  private setupDragListeners(): void {
    this.dragHandler = (elementView: dia.ElementView, _evt: dia.Event, _x: number, _y: number) => {
      if (!this.paper.options.interactive) {
        this.paper.trigger('blank:pointerdown', _evt, _x, _y);
        return;
    }
      if (this.paper.options.interactive && this._mode === 'grid' && this.options.showGuides) {
        this.showGuides(elementView);
      }
    };

    this.dragEndHandler = () => {
      this.hideGuides();
    };

    this.paper.on('element:pointermove', this.dragHandler);
    this.paper.on('element:pointerup', this.dragEndHandler as any);
  }

  /**
   * Show visual guides during drag
   */
  private showGuides(elementView: dia.ElementView): void {
    if (!this.guidesContainer) return;

    // Clear existing guides
    this.hideGuides();

    if (!elementView || !elementView.model) return;

    const bbox = elementView.model.getBBox();
    const scale = this.paper.scale().sx;
    const translate = this.paper.translate();

    // Calculate screen position of element edges
    const left = bbox.x * scale + translate.tx;
    const top = bbox.y * scale + translate.ty;
    const right = (bbox.x + bbox.width) * scale + translate.tx;
    const bottom = (bbox.y + bbox.height) * scale + translate.ty;
    const centerX = (bbox.x + bbox.width / 2) * scale + translate.tx;
    const centerY = (bbox.y + bbox.height / 2) * scale + translate.ty;

    // Get paper dimensions
    const paperRect = this.paper.el.getBoundingClientRect();

    // Create vertical guide at center
    this.createGuideLine(centerX, 0, centerX, paperRect.height, 'vertical-center');

    // Create horizontal guide at center
    this.createGuideLine(0, centerY, paperRect.width, centerY, 'horizontal-center');
  }

  /**
   * Create a guide line
   */
  private createGuideLine(x1: number, y1: number, x2: number, y2: number, className: string): void {
    if (!this.guidesContainer) return;

    const line = V('line', {
      x1,
      y1,
      x2,
      y2,
      stroke: this.options.guideColor,
      'stroke-width': 1,
      'stroke-dasharray': '4,4',
      class: `guide-line ${className}`,
      'pointer-events': 'none',
    });

    this.guidesContainer.appendChild(line.node);
  }

  /**
   * Hide all guides
   */
  private hideGuides(): void {
    if (this.guidesContainer) {
      this.guidesContainer.innerHTML = '';
    }
  }

  /**
   * Snap point to grid
   */
  snapToGrid(point: { x: number; y: number }): { x: number; y: number } {
    if (this._mode === 'free') {
      return point;
    }

    const gridSize = this.options.gridSize!;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize,
    };
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.options.gridSize = size;
    if (this._mode === 'grid') {
      this.paper.setGridSize(size);
      this.paper.setGrid(true);
    }
  }

  /**
   * Get grid size
   */
  getGridSize(): number {
    return this.options.gridSize!;
  }

  /**
   * Enable/disable visual guides
   */
  setShowGuides(show: boolean): void {
    this.options.showGuides = show;
    if (!show) {
      this.hideGuides();
    }
  }

  /**
   * Subscribe to events
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from events
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
   * Dispose manager
   */
  dispose(): void {
    if (this.dragHandler) {
      this.paper.off('element:pointermove', this.dragHandler);
    }
    if (this.dragEndHandler) {
      this.paper.off('element:pointerup', this.dragEndHandler as any);
    }
    if (this.guidesContainer) {
      this.guidesContainer.remove();
    }
    this.listeners.clear();
  }
}
