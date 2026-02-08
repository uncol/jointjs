//---------------------------------------------------------------------
// SVG Background - Scalable background image
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia } from "@joint/core";
import { ViewportManager } from "./viewport";

export interface BackgroundConfig {
  image: string;
  width: number;
  height: number;
  opacity?: number;
}

/**
 * Set a scalable SVG background image that transforms with the viewport
 * Unlike CSS background, this SVG image will zoom/pan with the diagram
 *
 * Background dimensions are in world coordinates (matching paper config).
 * The browser automatically handles DPI scaling for sharp rendering on high-DPI displays.
 * For best quality on retina displays, provide 2x resolution images (e.g., 6400x3600 for 3200x1800 world space).
 */
export function setScalableBackground(paper: dia.Paper, viewport: ViewportManager, config: BackgroundConfig): void {
  if (!config.image) {
    return;
  }

  // Use configured world coordinate dimensions, not image pixel dimensions
  // The browser automatically handles DPI scaling for sharp rendering
  paper.drawBackground({
    image: config.image,
    position: { x: 0, y: 0 },
    size: { width: config.width, height: config.height },
    repeat: 'no-repeat',
    opacity: config.opacity
  });
}

/**
 * Remove scalable background from paper
 */
export function removeScalableBackground(paper: dia.Paper): void {
  paper.drawBackground();
}
