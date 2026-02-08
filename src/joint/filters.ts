//---------------------------------------------------------------------
// JointJS SVG Filter Utilities
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import {dia, V} from "@joint/core";

/**
 * Load SVG filters into paper's defs
 */
export function loadSvgFilters(paper: dia.Paper, filters: string | string[]): void{
  const defs = V(paper.svg).defs();
  if(!defs){
    console.error("Cannot load SVG filters: defs element not found");
    return;
  }

  const filtersArray = Array.isArray(filters) ? filters : [filters];
  filtersArray.forEach((filterSvg) => {
    try{
      defs.append(V(filterSvg));
    } catch(error){
      console.error("Failed to add SVG filter:", error);
    }
  });
}

/**
 * Generate SVG color filters from RGB values
 * @param colorMap - Object with filter names and RGB arrays {filterName: [r, g, b]}
 * @returns Array of SVG filter strings
 */
export function generateColorFilters(colorMap: Record<string, number[]>): string[]{
  const filters: string[] = [];
  
  for(const [name, rgb] of Object.entries(colorMap)){
    if(!Array.isArray(rgb) || rgb.length !== 3){
      console.warn(`Invalid RGB value for filter "${name}":`, rgb);
      continue;
    }

    const [r, g, b] = rgb;
    // Calculate matrix coefficients
    // Diagonal values: (256 - component) / 256
    // Offset values: component / 256
    const rCoeff = (256 - r) / 256;
    const gCoeff = (256 - g) / 256;
    const bCoeff = (256 - b) / 256;
    const rOffset = r / 256;
    const gOffset = g / 256;
    const bOffset = b / 256;
    
    // Create a color matrix filter
    const filterSvg = 
      `<filter id="${name}">` +
      `<feColorMatrix type="matrix" color-interpolation-filters="sRGB" values="` +
      `${rCoeff} 0 0 0 ${rOffset} ` +
      `0 ${gCoeff} 0 0 ${gOffset} ` +
      `0 0 ${bCoeff} 0 ${bOffset} ` +
      `0 0 0 1 0"/>` +
      `</filter>`;
    
    filters.push(filterSvg);
  }
  
  return filters;
}
