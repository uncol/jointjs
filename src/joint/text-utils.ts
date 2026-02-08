//---------------------------------------------------------------------
// JointJS Text Utilities
//---------------------------------------------------------------------
// Copyright (C) 2007-2026 The NOC Project
// See LICENSE for details
//---------------------------------------------------------------------

import {util, V} from "@joint/core";
import type {BreakTextOptions, BreakTextSize, BreakTextStyles} from "./types.ts";

/**
 * Text breaking utility for SVG
 * Breaks text to fit within width/height constraints
 */
export function breakText(
  text: string, 
  size: BreakTextSize, 
  styles: BreakTextStyles = {}, 
  opt: BreakTextOptions = {},
): string{
  const width = size.width;
  const height = size.height;
  const svgDocument = opt.svgDocument || V("svg").node as SVGSVGElement;
  const textElement = V("<text><tspan></tspan></text>").attr(styles).node as SVGTextElement;
  const textSpan = textElement.firstChild as SVGTSpanElement;
  const textNode = document.createTextNode("");

  // Prevent flickering
  textElement.style.opacity = "0";
  // Prevent FF from throwing an uncaught exception when `getBBox()`
  // called on element that is not in the render tree (is not measurable).
  textElement.style.display = "block";
  textSpan.style.display = "block";
  textSpan.appendChild(textNode);
  svgDocument.appendChild(textElement);
  if(!opt.svgDocument){
    document.body.appendChild(svgDocument);
  }

  const words = text.split(/(\W+)/);
  const full: boolean[] = [];
  const lines: string[] = [];
  let p = 0;
  let lineHeight: number | undefined;

  for(let i = 0, l = 0, len = words.length; i < len; i++){
    const word = words[i];

    textNode.data = lines[l] ? lines[l] + word : word;
    if(textSpan.getComputedTextLength() <= width){
      // the current line fits
      lines[l] = textNode.data;
      if(p){
        // We were partitioning. Put rest of the word onto next line
        full[l++] = true;
        // cancel partitioning
        p = 0;
      }
    } else{
      if(!lines[l] || p){
        const partition = !!p;
        p = word.length - 1;
        if(partition || !p){
          // word has only one character.
          if(!p){
            if(!lines[l]){
              // we won't fit this text within our rect
              lines.length = 0;
              break;
            }
            // partitioning didn't help on the non-empty line
            // try again, but this time start with a new line
            // cancel partitions created
            words.splice(i, 2, word + words[i + 1]);
            // adjust word length
            len--;
            full[l++] = true;
            i--;
            continue;
          }
          // move last letter to the beginning of the next word
          words[i] = word.substring(0, p);
          words[i + 1] = word.substring(p) + words[i + 1];
        } else{
          // We initiate partitioning
          // split the long word into two words
          words.splice(i, 1, word.substring(0, p), word.substring(p));
          // adjust words length
          len++;
          if(l && !full[l - 1]){
            // if the previous line is not full, try to fit max part of
            // the current word there
            l--;
          }
        }
        i--;
        continue;
      }
      l++;
      i--;
    }
    // if size.height is defined we have to check whether the height of the entire
    // text exceeds the rect height
    if(height !== undefined){
      if(lineHeight === undefined){
        let heightValue: {value: number; unit: string};
        // use the same defaults as in V.prototype.text
        if(styles.lineHeight === "auto"){
          heightValue = {value: 1.5, unit: "em"};
        } else{
          const parsed = util.parseCssNumeric(styles.lineHeight as string, ["em"]);
          heightValue = parsed ? {value: parsed.value, unit: parsed.unit || "em"} : {value: 1, unit: "em"};
        }
        lineHeight = heightValue.value;
        if(heightValue.unit === "em"){
          lineHeight *= textElement.getBBox().height;
        }
      }
      if(lineHeight * lines.length > height){
        // remove overflowing lines
        lines.splice(Math.floor(height / lineHeight));
        break;
      }
    }
  }
  if(opt.svgDocument){
    // svg document was provided, remove the text element only
    svgDocument.removeChild(textElement);
  } else{
    // clean svg document
    document.body.removeChild(svgDocument);
  }
  return lines.join("\n");
}
