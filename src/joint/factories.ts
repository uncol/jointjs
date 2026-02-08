//---------------------------------------------------------------------
// JointJS Factory Methods
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import {dia} from "@joint/core";
import {cellNamespace} from "./elements.ts";
import {generateColorFilters, loadSvgFilters} from "./filters.ts";

/**
 * Create a new JointJS graph with cellNamespace
 */
export function createGraph(options: Partial<dia.Graph.Options> = {}): dia.Graph{
  return new dia.Graph({}, {
    cellNamespace,
    ...options,
  });
}

/**
 * Create a new JointJS paper with auto-loaded color filters
 */
export function createPaper(
  el: HTMLElement, 
  filters: Record<string, number[]>, 
  options: Partial<dia.Paper.Options> = {},
): dia.Paper{
  const paper = new dia.Paper({
    el,
    model: new dia.Graph({}, {cellNamespace}),
    cellNamespace,
    ...options,
  });
  const f = generateColorFilters(filters);
  // Load SVG filters
  loadSvgFilters(paper, f);
  return paper;
}

