//---------------------------------------------------------------------
// Link Hover Effects
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import { dia, highlighters } from "@joint/core";

/**
 * Setup link hover effects on paper using JointJS highlighters.stroke
 */
export function setupLinkHover(paper: dia.Paper): void {
  // ID used for the highlight instance on links
  const HIGHLIGHT_ID = "my-link-highlight";

  // Add highlight on enter
  paper.on("link:mouseenter", (linkView: dia.LinkView) => {
    try {
      highlighters.mask.add(linkView, "line", HIGHLIGHT_ID, {
        padding: 1,
        attrs: {
          stroke: "#3498db",
          "stroke-width": 3,
          opacity: 0.6,
        },
      });
      const paperEl = paper.el as HTMLElement;
      paperEl.style.cursor = "pointer";
    } catch (err) {
      // console warn but don't throw
      // eslint-disable-next-line no-console
      console.warn("link-hover: failed to add highlighter", err);
    }
  });

  // Remove highlight on leave
  paper.on("link:mouseleave", (linkView: dia.LinkView) => {
    try {
      highlighters.mask.remove(linkView, HIGHLIGHT_ID);
      const paperEl = paper.el as HTMLElement;
      paperEl.style.cursor = "grab";
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("link-hover: failed to remove highlighter", err);
    }
  });
}
