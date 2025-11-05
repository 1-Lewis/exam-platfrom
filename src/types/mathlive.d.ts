/* eslint-disable @typescript-eslint/no-namespace */
import type React from "react"

export interface MathFieldElement extends HTMLElement {
  getValue(mode?: "latex" | "mathml"): string
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathFieldElement>,
        MathFieldElement
      >
    }
  }
}
export {}
