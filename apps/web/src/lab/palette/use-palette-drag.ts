"use client";
import { useEffect, useState } from "react";
import { DRAG_MIME } from "./PaletteDrawer";

/** True while a component is dragged from the palette: overlays step aside so the drop reaches the canvas. */
export function usePaletteDrag(): boolean {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const on = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes(DRAG_MIME)) setDragging(true);
    };
    const off = () => setDragging(false);
    window.addEventListener("dragstart", on);
    window.addEventListener("dragend", off);
    window.addEventListener("drop", off);
    return () => {
      window.removeEventListener("dragstart", on);
      window.removeEventListener("dragend", off);
      window.removeEventListener("drop", off);
    };
  }, []);
  return dragging;
}
