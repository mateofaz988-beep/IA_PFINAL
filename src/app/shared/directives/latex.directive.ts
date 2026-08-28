import { Directive, ElementRef, Input, inject } from '@angular/core';
import renderMathInElement from 'katex/contrib/auto-render';

/**
 * Renderiza texto mixto (prosa + LaTeX) en el elemento host.
 * Soporta los delimitadores $...$, $$...$$, \(...\) y \[...\].
 * Uso: <div [appLatex]="enunciado"></div>
 */
@Directive({
  selector: '[appLatex]',
  standalone: true,
})
export class LatexDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  @Input('appLatex') set content(value: string | null | undefined) {
    const host = this.el.nativeElement;
    host.textContent = value ?? '';

    if (!value) {
      return;
    }

    try {
      renderMathInElement(host, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    } catch {
      // Si el LaTeX es inválido, se deja el texto plano visible.
    }
  }
}
