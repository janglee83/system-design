import type { JSX as ReactJSX } from "react";

// The generated node art (src/lab/canvas/art/NodeArt.tsx, copied byte for byte from the design
// assets) names the global JSX namespace, which React 19's types no longer declare.
declare global {
  namespace JSX {
    type Element = ReactJSX.Element;
  }
}
