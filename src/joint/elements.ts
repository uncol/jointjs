//---------------------------------------------------------------------
// JointJS Custom Elements
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia, shapes, util } from "@joint/core";
import type { CellNamespace, FontIconElementType, ImageIconElementType } from "./types.ts";

// Configurable stencil directory path (default)
let stencilDir = "/stencils";

/**
 * Set the stencil directory path for icon loading
 */
export function setStencilDir(dir: string): void {
  stencilDir = dir;
}

/**
 * Get the current stencil directory path
 */
export function getStencilDir(): string {
  return stencilDir;
}

// Text label background strategy:
//   "stroke" — white stroke behind glyphs via paintOrder (spaces not covered)
//   "rect"   — white <rect> behind each label, sized in initialize
const TEXT_LABEL_BG = "stroke" as "stroke" | "rect";

const LABEL_FONT_SIZE = 12;
const LABEL_PADDING = 2;

const textLabelBg = TEXT_LABEL_BG === "stroke"
  ? {stroke: "#FFFFFF", strokeWidth: 3, paintOrder: "stroke fill"}
  : {};

// Markup children for rotatable group: bg rects before texts when mode is "rect"
const elementMarkup = TEXT_LABEL_BG === "rect"
  ? [
    {tagName: "rect", selector: "titleBg"},
    {tagName: "text", selector: "title", className: "rotatable"},
    {tagName: "rect", selector: "ipaddrBg"},
    {tagName: "text", selector: "ipaddr", className: "rotatable"},
  ]
  : [
    {tagName: "text", selector: "title", className: "rotatable"},
    {tagName: "text", selector: "ipaddr", className: "rotatable"},
  ];

// Default attrs for bg rects (empty when mode is not "rect")
const labelBgAttrs = TEXT_LABEL_BG === "rect"
  ? {
    titleBg: {fill: "#FFFFFF", ref: "icon", refX: "50%", refY: "100%", rx: 2, width: 0, height: 0},
    ipaddrBg: {fill: "#FFFFFF", ref: "icon", refX: "50%", refY: "100%", rx: 2, width: 0, height: 0, display: "none"},
  }
  : {};

// Compute rect geometry for a label: centered under icon, height based on line count
function calcLabelBg(text: string, breakWidth: number){
  const lines = text ? text.split("\n").length : 1;
  const width = breakWidth + LABEL_PADDING * 2;
  const height = lines * LABEL_FONT_SIZE + LABEL_PADDING * 2;
  return {
    x: -width / 2,
    y: -LABEL_FONT_SIZE * 0.75 - LABEL_PADDING,
    width,
    height,
  };
}
          // {
          //   "type": "noc.FontIconElement",
          //   "position": {"x": 100, "y": 50},
          //   "attrs": {
          //     "icon": {
          //       "size": "gf-1x",
          //       "status": "gf-ok",
          //       "text": "\uF20A", // cisco-asa-5500
          //     },
          //     "title": {
          //       "text": "Пользователи ssh long text test example, wrapping test",
          //     },
          //     "ipaddr": {"text": "182.0.2.1"},
          //   },
          //   "id": "uuid-1",
          // },
/**
 * FontIconElement - Custom element for font-based icons
 */
export const FontIconElement = dia.Element.define("noc.FontIconElement", {
  type: "noc.FontIconElement",
  z: 100,
  attrs: {
    icon: { },
    title: {
      ref: "icon",
      refX: "50%",
      refY: "100%",
      textAnchor: "middle",
      display: "block",
      fill: "#000000",
      ...textLabelBg,
    },
    ipaddr: {
      ref: "icon",
      refX: "50%",
      refY: "100%",
      textAnchor: "middle",
      display: "none",
      fill: "#000000",
      ...textLabelBg,
    },
    ...labelBgAttrs,
  },
}, {
  markup: [...elementMarkup, {tagName: "text", selector: "icon", className: "scalable"}],

  initialize: function(this: FontIconElementType, ...args: dia.Element.Attributes[]){
    dia.Element.prototype.initialize.apply(this, args as [dia.Element.Attributes]);
    const attrs = this.get("attrs")?.icon || {};
    this.setClass(attrs.size, attrs.status);

    // Break text for both labels based on icon width
    const iconWidth = this.getSizeFromClass(attrs.size);
    const breakWidth = iconWidth * 2;

    const titleText = this.get("attrs")?.title?.text;
    if(titleText){
      const brokenText = util.breakText(titleText, {width: breakWidth});
      this.attr("title/text", brokenText);
      if(TEXT_LABEL_BG === "rect") this.attr("titleBg", calcLabelBg(brokenText, breakWidth));
    }

    const ipaddrText = this.get("attrs")?.ipaddr?.text;
    if(ipaddrText){
      const brokenText = util.breakText(ipaddrText, {width: breakWidth});
      this.attr("ipaddr/text", brokenText);
      if(TEXT_LABEL_BG === "rect") this.attr("ipaddrBg", calcLabelBg(brokenText, breakWidth));
    }

    // Listen for future changes to image href
    this.on("change:attrs", (prev) => {
      const status = prev?.icon?.status !== this.get("attrs")?.icon?.status ? this.get("attrs")?.icon?.status : prev?.icon?.status;
      const size = prev?.icon?.size !== this.get("attrs")?.icon?.size ? this.get("attrs")?.icon?.size : prev?.icon?.size;
      this.setClass(size, status);
    });
  },

  getSizeFromClass: function(sizeClass: string): number{
    // Create temporary element to measure actual CSS size
    const tempElement = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tempElement.setAttribute("class", `gf ${sizeClass || ""}`);
    tempElement.textContent = "\uE283"; // Use 'rectangle' icon as reference character

    // Append to body temporarily to get computed style
    document.body.appendChild(tempElement);
    const computedStyle = window.getComputedStyle(tempElement);
    const fontSize = parseFloat(computedStyle.fontSize) || 32;
    document.body.removeChild(tempElement);

    return fontSize;
  },

  toggleLabel: function(): void{
    const titleDisplay = this.attr("title/display");
    const ipaddrDisplay = this.attr("ipaddr/display");
    const newTitle = titleDisplay === "none" ? "block" : "none";
    const newIpaddr = ipaddrDisplay === "none" ? "block" : "none";

    this.attr("title/display", newTitle);
    this.attr("ipaddr/display", newIpaddr);
    if(TEXT_LABEL_BG === "rect"){
      this.attr("titleBg/display", newTitle);
      this.attr("ipaddrBg/display", newIpaddr);
    }
  },

  setClass: function(size: string, status: string): void{
    this.attr("icon/class", `gf ${size} ${status}`);
    const embeddedCells = this.getEmbeddedCells();
    embeddedCells.forEach((badge: dia.Element) => {
      badge.attr("body/class", `gf ${size} ${status}`);
      badge.attr("text/class", `gf ${size} ${status}`);
    });
  },
});

/**
 * ImageIconElement - Custom element for SVG image-based icons
 */
export const ImageIconElement = dia.Element.define("noc.ImageIconElement", {
  type: "noc.ImageIconElement",
  z: 100,
  attrs: {
    icon: {
      width: 64,
      height: 64,
      xlinkHref: "",  // Will be set from href attribute via convertImageIdToPath
      preserveAspectRatio: "xMidYMid meet",
    },
    title: {
      text: "New Object",
      fill: "#000000",
      ...textLabelBg,
      ref: "icon",
      refX: "50%",
      refY: "100%",
      textAnchor: "middle",
      lineHeight: "1em",
      display: "block",
    },
    ipaddr: {
      text: "",
      fill: "#000000",
      ...textLabelBg,
      ref: "icon",
      refX: "50%",
      refY: "100%",
      textAnchor: "middle",
      lineHeight: "1em",
      display: "none",
    },
    ...labelBgAttrs,
  },
}, {
  markup: [...elementMarkup, {tagName: "image", selector: "icon", className: "scalable"}],

  initialize: function(this: ImageIconElementType, ...args: dia.Element.Attributes[]){
    dia.Element.prototype.initialize.apply(this, args as [dia.Element.Attributes]);
    const attrs = this.get("attrs")?.icon || {};
    // Convert #img-* to path immediately after initialization
    const initialHref = attrs.href;
    if(initialHref && initialHref.startsWith("#img-")){
      const path = this.convertImageIdToPath(initialHref);
      this.attr("icon/href", path);
    }

    // Apply status if specified in attributes
    const statusValue = attrs.status;
    if(statusValue){
      this.setStatus(statusValue);
    }

    // Break text for both labels based on icon width
    const iconWidth = attrs.width || 64;
    const breakWidth = iconWidth * 2;

    const titleText = this.get("attrs")?.title?.text;
    if(titleText){
      const brokenText = util.breakText(titleText, {width: breakWidth});
      this.attr("title/text", brokenText);
      if(TEXT_LABEL_BG === "rect") this.attr("titleBg", calcLabelBg(brokenText, breakWidth));
    }

    const ipaddrText = this.get("attrs")?.ipaddr?.text;
    if(ipaddrText){
      const brokenText = util.breakText(ipaddrText, {width: breakWidth});
      this.attr("ipaddr/text", brokenText);
      if(TEXT_LABEL_BG === "rect") this.attr("ipaddrBg", calcLabelBg(brokenText, breakWidth));
    }

    // Listen for future changes to image href
    this.on("change:attrs", (prev) => {
      const currentStatus = prev?.icon?.status;
      const newStatus = this.get("attrs")?.icon?.status;
      if(newStatus !== currentStatus){
        this.setStatus(newStatus);
      }
    });
  },

  toggleLabel: function(): void{
    const titleDisplay = this.attr("title/display");
    const ipaddrDisplay = this.attr("ipaddr/display");
    const newTitle = titleDisplay === "none" ? "block" : "none";
    const newIpaddr = ipaddrDisplay === "none" ? "block" : "none";

    this.attr("title/display", newTitle);
    this.attr("ipaddr/display", newIpaddr);
    if(TEXT_LABEL_BG === "rect"){
      this.attr("titleBg/display", newTitle);
      this.attr("ipaddrBg/display", newIpaddr);
    }
  },

  // Use image selector for filters and manipulation
  setStatus: function(filter: string): void{
    this.attr("icon/filter", `url(#os${filter})`);
    const embeddedCells = this.getEmbeddedCells();
    embeddedCells.forEach((badge: dia.Element) => {
      badge.attr("body/filter", `url(#os${filter})`);
      badge.attr("text/filter", `url(#os${filter})`);
    });
  },

  // Helper function to convert #img-* to stencil path using configured stencilDir
  convertImageIdToPath: function(href: string): string{
    if(href && href.startsWith("#img-")){
      // Extract icon name from #img-Cisco-router format
      const iconId = href.substring(5); // Remove '#img-' prefix
      // Convert back: img-Cisco-router -> Cisco/router
      const iconPath = iconId.replace(/-/, "/").replace(/-/g, "_");
      return `${stencilDir}/${iconPath}.svg`;
    }
    return href;
  },
});

/**
 * LinkElement - Custom link based on standard.Link
 * No arrowheads, carries link metadata (bw, method, connector)
 */
export const LinkElement = shapes.standard.Link.define("noc.LinkElement", {
  z: 10,
  markup: [
    {
      tagName: "path",
      selector: "outline",
      attributes: {
                'fill': 'none',
                'cursor': 'pointer',
                'stroke': 'transparent',
                'stroke-linecap': 'round'
      }
    },
    {tagName: "path", selector: "line"},
  ],
  attrs: {
    line: {
      stroke: "#000000",
      strokeWidth: 1,
      strokeLinecap: "round",
      targetMarker: {type: "none"},
    },
    outline: {
      connection: true,
      strokeWidth: 10,
    },
    connector: "normal",
    bw: 0,
    in_bw: 0,
    out_bw: 0,
    method: "",
  },
});

/**
 * Cell namespace registry for custom shapes deserialization
 */
export const cellNamespace: CellNamespace = {
  noc: {
    FontIconElement,
    ImageIconElement,
    LinkElement,
  },
  ...shapes,
};
