//---------------------------------------------------------------------
// Minimap - Navigation mini-map for the diagram
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia, V } from "@joint/core";
import { cellNamespace } from "../joint/elements.ts";
import type { ViewportManager } from "../joint/viewport.ts";

export interface MinimapOptions {
  container: HTMLElement;
  paper: dia.Paper;
  viewport: ViewportManager;
  width?: number;
  height?: number;
  paperWidth: number;
  paperHeight: number;
}

const DEFAULT_WIDTH = 150;
const DEFAULT_HEIGHT = 100;

/**
 * Minimap - non-interactive JointJS Paper sharing the same graph,
 * with a viewport rectangle overlay for navigation.
 */
export class Minimap {
  private container: HTMLElement;
  private mainPaper: dia.Paper;
  private viewport: ViewportManager;
  private width: number;
  private height: number;
  private paperWidth: number;
  private paperHeight: number;

  private wrapper: HTMLDivElement | null = null;
  private minimapPaper: dia.Paper | null = null;
  private viewportRect: SVGRectElement | null = null;
  private isDragging = false;
  private minimapScale: number;

  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: () => void;

  constructor(options: MinimapOptions) {
    this.container = options.container;
    this.mainPaper = options.paper;
    this.viewport = options.viewport;
    this.width = options.width || DEFAULT_WIDTH;
    this.height = options.height || DEFAULT_HEIGHT;
    this.paperWidth = options.paperWidth;
    this.paperHeight = options.paperHeight;

    this.minimapScale = Math.min(
      this.width / this.paperWidth,
      this.height / this.paperHeight,
    );

    // Bind document-level handlers for drag navigation
    this.mouseMoveHandler = (e: MouseEvent) => {
      if (this.isDragging) this.handleNavigation(e);
    };
    this.mouseUpHandler = () => {
      this.isDragging = false;
    };

    this.render();
    this.setupListeners();
    this.updateViewportRect();
  }

  /**
   * Render minimap: a small non-interactive Paper + viewport rect overlay
   */
  private render(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'minimap';
    this.wrapper.style.width = `${this.width}px`;
    this.wrapper.style.height = `${this.height}px`;

    // Nested element for JointJS Paper (isolates it from wrapper positioning)
    const paperEl = document.createElement('div');
    this.wrapper.appendChild(paperEl);

    // Create a smaller Paper sharing the same graph (model)
    this.minimapPaper = new dia.Paper({
      el: paperEl,
      model: this.mainPaper.model,
      cellNamespace,
      width: this.width,
      height: this.height,
      interactive: false,
      drawGrid: false,
    });

    // Scale content so the entire diagram fits inside the minimap
    this.minimapPaper.scale(this.minimapScale);

    // Viewport rectangle overlay (appended directly to SVG root,
    // outside the viewport transform group, so coordinates are in SVG pixels)
    const rectEl = V('rect', {
      fill: 'rgba(33, 150, 243, 0.15)',
      stroke: '#2196F3',
      'stroke-width': 2,
      'pointer-events': 'none',
      class: 'minimap-viewport-rect',
    });
    this.minimapPaper.svg.appendChild(rectEl.node);
    this.viewportRect = rectEl.node as SVGRectElement;

    this.container.appendChild(this.wrapper);

    // Stop events from reaching JointJS main paper
    this.wrapper.addEventListener('mousedown', (e) => e.stopPropagation());
    this.wrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  /**
   * Setup event listeners for navigation and viewport tracking
   */
  private setupListeners(): void {
    // Click / drag on minimap to navigate the main viewport
    this.wrapper?.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.handleNavigation(e);
    });

    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);

    // Update viewport rect when the main viewport changes
    this.viewport.on('viewport:change', () => {
      this.updateViewportRect();
    });
  }

  /**
   * Convert a click on the minimap to a panTo on the main viewport
   */
  private handleNavigation(e: MouseEvent): void {
    if (!this.wrapper) return;

    const rect = this.wrapper.getBoundingClientRect();

    // Clamp click position to minimap boundaries
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, this.width));
    const clickY = Math.max(0, Math.min(e.clientY - rect.top, this.height));

    // Minimap pixels → diagram local coordinates
    const localX = clickX / this.minimapScale;
    const localY = clickY / this.minimapScale;

    this.viewport.panTo({ x: localX, y: localY });
  }

  /**
   * Redraw the viewport rectangle to match the current main viewport bounds
   */
  private updateViewportRect(): void {
    if (!this.viewportRect) return;

    const state = this.viewport.getState();
    const b = state.bounds;

    // Bounds are in local coords → multiply by minimapScale for SVG pixels
    // Rectangle may extend beyond minimap bounds (naturally clipped by SVG viewport)
    this.viewportRect.setAttribute('x', String(b.x * this.minimapScale));
    this.viewportRect.setAttribute('y', String(b.y * this.minimapScale));
    this.viewportRect.setAttribute('width', String(b.width * this.minimapScale));
    this.viewportRect.setAttribute('height', String(b.height * this.minimapScale));
  }

  /**
   * Update when diagram dimensions change (e.g. after loading a new file)
   */
  updateDimensions(paperWidth: number, paperHeight: number): void {
    this.paperWidth = paperWidth;
    this.paperHeight = paperHeight;
    this.minimapScale = Math.min(
      this.width / this.paperWidth,
      this.height / this.paperHeight,
    );

    if (this.minimapPaper) {
      this.minimapPaper.scale(this.minimapScale);
    }

    this.updateViewportRect();
  }

  /**
   * Show / hide minimap
   */
  setVisible(visible: boolean): void {
    if (this.wrapper) {
      this.wrapper.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Dispose minimap and clean up listeners
   */
  dispose(): void {
    document.removeEventListener('mousemove', this.mouseMoveHandler);
    document.removeEventListener('mouseup', this.mouseUpHandler);
    this.minimapPaper?.remove();
    this.wrapper?.remove();
  }
}
