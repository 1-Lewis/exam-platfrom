// src/types/mammoth.d.ts
declare module "mammoth" {
  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options?: unknown,
  ): Promise<{ value: string }>;
}
