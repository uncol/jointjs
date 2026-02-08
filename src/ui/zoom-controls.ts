//---------------------------------------------------------------------
// Zoom Controls - UI toolbar for zoom and snap
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import type { SnapManager } from "../joint/snap.ts";
import type { ViewportManager } from "../joint/viewport.ts";

export interface ZoomControlsOptions {
  container: HTMLElement;
  viewport: ViewportManager;
  snap: SnapManager;
  zoomPresets?: number[];
}

export type ViewMode = 'edit' | 'view';

const DEFAULT_PRESETS = [25, 50, 75, 100, 150, 200, 400];

/**
 * ZoomControls - UI toolbar with zoom buttons, presets, and snap toggle
 */
export class ZoomControls {
  private container: HTMLElement;
  private viewport: ViewportManager;
  private snap: SnapManager;
  private editMode: ViewMode;
  private presets: number[];
  private toolbar: HTMLDivElement | null = null;
  private zoomDisplay: HTMLSpanElement | null = null;

  constructor(options: ZoomControlsOptions) {
    this.container = options.container;
    this.viewport = options.viewport;
    this.snap = options.snap;
    this.presets = options.zoomPresets || DEFAULT_PRESETS;
    this.editMode = this.viewport.isEditMode() ? 'edit' : 'view';
    this.render();
    this.setupListeners();
  }

  /**
   * Render the toolbar
   */
  private render(): void {
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'zoom-toolbar';
    this.toolbar.innerHTML = `
      <button class="zoom-btn zoom-out" title="Zoom Out (Ctrl+-)">−</button>
      <button class="zoom-btn zoom-in" title="Zoom In (Ctrl+=)">+</button>
      <div class="zoom-select-wrapper">
        <select class="zoom-select" title="Zoom Level">
          ${this.presets.map(p => `<option value="${p}">${p}%</option>`).join('')}
          <option value="fit">Fit</option>
        </select>
      </div>
      <span class="zoom-display">100%</span>
      <button class="zoom-btn zoom-fit" title="Fit to View (Ctrl+1)">⬚</button>
      <button class="zoom-btn edit-toggle edit-mode" title="Toggle Edit Mode (E)">
        <span class="edit-icon">✎</span>
      </button>
      <button class="zoom-btn snap-toggle grid-mode" title="Toggle Grid/Free (G)">
        <span class="snap-icon">⊞</span>
      </button>
    `;

    this.container.appendChild(this.toolbar);
    this.zoomDisplay = this.toolbar.querySelector('.zoom-display');

    // Prevent JointJS from intercepting pointer events on the toolbar
    // (JointJS captures mousedown on paper.el and calls preventDefault,
    // which blocks native <select> dropdown and other HTML controls)
    this.toolbar.addEventListener('mousedown', (e) => e.stopPropagation());
    this.toolbar.addEventListener('pointerdown', (e) => e.stopPropagation());

    // Update initial state
    this.updateZoomDisplay();
    this.updateSnapButton();
    this.updateEditButton();
  }
  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    if (!this.toolbar) return;

    // Zoom out button
    this.toolbar.querySelector('.zoom-out')?.addEventListener('click', () => {
      this.viewport.zoomOut();
      this.updateZoomDisplay();
    });

    // Zoom in button
    this.toolbar.querySelector('.zoom-in')?.addEventListener('click', () => {
      this.viewport.zoomIn();
      this.updateZoomDisplay();
    });

    // Zoom fit button
    this.toolbar.querySelector('.zoom-fit')?.addEventListener('click', () => {
      // this.viewport.zoomToFit();
      this.viewport.transformToFitContent();
      this.updateZoomDisplay();
    });

    // Zoom select
    const select = this.toolbar.querySelector('.zoom-select') as HTMLSelectElement;
    select?.addEventListener('change', () => {
      const value = select.value;
      if (value === 'fit') {
        this.viewport.zoomToFit();
      } else {
        this.viewport.setZoomPercent(parseInt(value, 10));
      }
      this.updateZoomDisplay();
    });

    this.toolbar.querySelector('.edit-toggle')?.addEventListener('click', () => {
      this.editMode = this.editMode === 'edit' ? 'view' : 'edit';
      this.viewport.setEditMode(this.editMode === 'edit');
      this.updateEditButton();
    });

    // Snap toggle
    this.toolbar.querySelector('.snap-toggle')?.addEventListener('click', () => {
      this.snap.toggleMode();
      this.updateSnapButton();
    });

    // Listen to viewport changes
    this.viewport.on('viewport:change', () => {
      this.updateZoomDisplay();
    });

    // Listen to snap mode changes
    this.snap.on('mode:change', () => {
      this.updateSnapButton();
    });
  }

  /**
   * Update zoom display
   */
  private updateZoomDisplay(): void {
    if (this.zoomDisplay) {
      const percent = this.viewport.getZoomPercent();
      this.zoomDisplay.textContent = `${percent}%`;
    }

    // Update select value
    const select = this.toolbar?.querySelector('.zoom-select') as HTMLSelectElement;
    if (select) {
      const percent = this.viewport.getZoomPercent();
      const matchingOption = this.presets.find(p => p === percent);
      if (matchingOption) {
        select.value = String(matchingOption);
      }
    }
  }

  /**
   * Update snap button state
   */
  private updateSnapButton(): void {
    const btn = this.toolbar?.querySelector('.snap-toggle');
    const icon = btn?.querySelector('.snap-icon');
    if (btn && icon) {
      const mode = this.snap.mode;
      btn.classList.toggle('grid-mode', mode === 'grid');
      btn.classList.toggle('free-mode', mode === 'free');
      icon.textContent = mode === 'grid' ? '⊞' : '↔';
      btn.setAttribute('title',
        `${mode === 'grid' ? 'Grid' : 'Free'} Mode (G)`);
    }
  }

  private updateEditButton(): void {
    const btn = this.toolbar?.querySelector('.edit-toggle');
    const icon = btn?.querySelector('.edit-icon');
    if (btn && icon) {
      const mode = this.editMode;
      btn.classList.toggle('edit-mode', mode === 'edit');
      btn.classList.toggle('view-mode', mode === 'view');
      icon.textContent = mode === 'edit' ? '✎' : '🚫';
      btn.setAttribute('title',
        `${mode === 'edit' ? 'Edit' : 'View'} Mode (E)`);
    }
  }

  /**
   * Dispose controls
   */
  dispose(): void {
    this.toolbar?.remove();
  }
}
