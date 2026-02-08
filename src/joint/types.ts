//---------------------------------------------------------------------
// JointJS Type Definitions
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import {dia} from "@joint/core";

// Type definitions
export type CellNamespace = Record<string, unknown>;

// Custom element types with additional methods
export interface FontIconElementType extends dia.Element {
  setClass: (size?: string, status?: string) => void;
  getSizeFromClass: (sizeClass: string) => number;
}

export interface ImageIconElementType extends dia.Element {
  setStatus: (filter: string) => void;
  convertImageIdToPath: (href: string) => string;
}

export interface BreakTextSize {
  width: number;
  height?: number;
}

export interface BreakTextStyles {
  lineHeight?: string;
  [key: string]: unknown;
}

export interface BreakTextOptions {
  svgDocument?: SVGSVGElement;
}

export interface ViewportOptions {
  position?: {x: number; y: number};
  size?: {width: number; height: number};
  attrs?: Record<string, unknown>;
  z?: number;
}
