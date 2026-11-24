const MIN_READABLE_ZOOM = 0.5;

/**
 * The viewport for "Hỏng ở đâu?": the failing node, its direct neighbours and the callout under it,
 * fitted into the canvas area below the verdict strip, at most 100 %. If that needs less than 50 %,
 * the failing node is centred in that area at 100 % instead.
 */
export function focusViewport(s: {
  nodes: readonly { id: string; position: { x: number; y: number } }[];
  edges: readonly { from: string; to: string }[];
  failingId: string;
  nodeSize: { width: number; height: number };
  canvas: { width: number; height: number };
  /** Free space to keep: below the strip (top), at the sides and at the bottom, in screen px. */
  area: { top: number; side: number; bottom: number };
  calloutHeight: number;
}): { x: number; y: number; zoom: number } {
  const ids = new Set([s.failingId]);
  for (const e of s.edges) {
    if (e.from === s.failingId) ids.add(e.to);
    if (e.to === s.failingId) ids.add(e.from);
  }
  const focus = s.nodes.filter((n) => ids.has(n.id));
  const failing = s.nodes.find((n) => n.id === s.failingId);
  if (!failing) return { x: 0, y: 0, zoom: 1 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of focus) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + s.nodeSize.width);
    maxY = Math.max(maxY, n.position.y + s.nodeSize.height + (n.id === s.failingId ? s.calloutHeight : 0));
  }
  const aw = s.canvas.width - 2 * s.area.side;
  const ah = s.canvas.height - s.area.top - s.area.bottom;
  const zoom = Math.min(1, aw / (maxX - minX), ah / (maxY - minY));
  if (zoom >= MIN_READABLE_ZOOM) {
    return {
      zoom,
      x: s.area.side + (aw - (maxX - minX) * zoom) / 2 - minX * zoom,
      y: s.area.top + (ah - (maxY - minY) * zoom) / 2 - minY * zoom,
    };
  }
  // Too spread out to read: centre the failing node (and its callout) in the area below the strip.
  const cx = failing.position.x + s.nodeSize.width / 2;
  const top = failing.position.y;
  const h = s.nodeSize.height + s.calloutHeight;
  return { zoom: 1, x: s.canvas.width / 2 - cx, y: s.area.top + Math.max(0, (ah - h) / 2) - top };
}
