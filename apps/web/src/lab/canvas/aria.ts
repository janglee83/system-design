import type { AriaLabelConfig } from "@xyflow/react";
import type { Translate } from "../labels";

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
