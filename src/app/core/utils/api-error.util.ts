import { HttpErrorResponse } from '@angular/common/http';
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const detail = error.error?.detail;
    if (typeof detail === 'string') return detail;
    if (error.status === 0 || error.status === 503) return 'No pudimos conectar con el servicio. Inténtalo nuevamente.';
    if (error.status === 422) return 'Revisa los campos del formulario y vuelve a intentarlo.';
  }
  return 'No pudimos completar la operación. Inténtalo nuevamente.';
}
