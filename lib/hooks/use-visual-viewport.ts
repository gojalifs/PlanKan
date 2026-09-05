"use client";

import { useEffect, useState } from "react";

export interface VisualViewportState {
  height: number;
  offsetTop: number;
  offsetLeft: number;
}

/**
 * Tracks the browser's live visual viewport.
 *
 * The visual viewport is the actually-visible area: it shrinks when the
 * on-screen keyboard opens and pans/scales when the browser scrolls to a
 * focused input. Anchoring fixed UI to it (instead of the layout viewport)
 * is the web equivalent of Compose's `imePadding()` — content stays in the
 * area above the keyboard, never hidden behind it.
 *
 * Returns `null` when visualViewport is unavailable (older browsers).
 */
export function useVisualViewport(): VisualViewportState | null {
  const [state, setState] = useState<VisualViewportState | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) {
      setState(null);
      return;
    }

    const update = () =>
      setState({
        height: vv.height,
        offsetTop: vv.offsetTop,
        offsetLeft: vv.offsetLeft,
      });

    update();

    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return state;
}