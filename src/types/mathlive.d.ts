/* eslint-disable @typescript-eslint/no-namespace */
import type React from "react";

/** Élément DOM rendu par <math-field> */
export interface MathFieldElement extends HTMLElement {
  value: string;
  getValue(mode?: "latex" | "mathml"): string;
  executeCommand?(cmd: [string, ...unknown[]]): void;
  focus(): void;
}

/**
 * ✅ Augmentation pour TS 5 + "react-jsx"
 * On étend le module "react" (JSX nouvelle génération)
 */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathFieldElement>,
        MathFieldElement
      > &
        React.RefAttributes<MathFieldElement>;
    }
  }
}

/**
 * ✅ Par sûreté, on expose aussi au global (utile selon config/outils)
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "math-field": React.DetailedHTMLProps<
        React.HTMLAttributes<MathFieldElement>,
        MathFieldElement
      > &
        React.RefAttributes<MathFieldElement>;
    }
  }
}

export {};
