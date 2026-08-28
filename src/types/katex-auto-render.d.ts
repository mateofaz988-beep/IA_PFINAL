declare module 'katex/contrib/auto-render' {
  import type { KatexOptions } from 'katex';

  export interface AutoRenderOptions extends KatexOptions {
    delimiters?: { left: string; right: string; display: boolean }[];
    ignoredTags?: string[];
    ignoredClasses?: string[];
    errorCallback?: (msg: string, err: unknown) => void;
  }

  export default function renderMathInElement(elem: HTMLElement, options?: AutoRenderOptions): void;
}
