import type { AriaLabelConfig } from "@xyflow/react";
import type { Translate } from "../labels";
import type { NodeState } from "./rf-adapter";

type Labels = { [K in keyof AriaLabelConfig]-?: NonNullable<AriaLabelConfig[K]> };

/** React Flow's built-in screen-reader text, from our catalogs (every key, checked by the type). */
export function flowAriaLabels(t: Translate): Labels {
  return {
    "node.a11yDescription.default": t("canvasA11y.nodeDescription"),
    "node.a11yDescription.keyboardDisabled": t("canvasA11y.nodeDescriptionKeyboard"),
    "node.a11yDescription.ariaLiveMessage": ({ direction, x, y }) =>
      t("canvasA11y.nodeMoved", { direction: t(`canvasA11y.direction.${direction}`), x: Math.round(x), y: Math.round(y) }),
    "edge.a11yDescription.default": t("canvasA11y.edgeDescription"),
    "controls.ariaLabel": t("canvasA11y.controls"),
    "controls.zoomIn.ariaLabel": t("canvasA11y.zoomIn"),
    "controls.zoomOut.ariaLabel": t("canvasA11y.zoomOut"),
    "controls.fitView.ariaLabel": t("canvasA11y.fitView"),
    "controls.interactive.ariaLabel": t("canvasA11y.interactive"),
    "minimap.ariaLabel": t("canvasA11y.minimap"),
    "handle.ariaLabel": t("canvasA11y.handle"),
  };
}

/**
 * A node's accessible name (design-system §5): "Máy chủ web 1, Máy chủ web, Bận, đang chọn, đã khoá,
 * 2 vấn đề", with only the parts that apply.
 */
export function nodeAccessibleName(
  p: { label: string; kind: string; state?: NodeState; selected: boolean; locked: boolean; issues: number },
  t: Translate,
): string {
  const parts = [t("canvasA11y.node", { label: p.label, kind: p.kind })];
  if (p.state && p.state !== "normal") parts.push(t(`canvasA11y.state.${p.state}`));
  if (p.selected) parts.push(t("canvasA11y.selected"));
  if (p.locked) parts.push(t("canvasA11y.locked"));
  if (p.issues > 0) parts.push(t("canvasA11y.issues", { count: p.issues }));
  return parts.join(", ");
}
