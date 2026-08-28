import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CarClassificationErrorResponse, CarClassificationResponse } from '../models/car-classifier.model';

/** Cliente para la Cloud Function `predict` que clasifica autos a partir de una foto. */
@Injectable({ providedIn: 'root' })
export class CarClassifierService {
  private readonly http = inject(HttpClient);

  /**
   * @param base64Image Puede venir como data URL completa (`data:image/jpeg;base64,...`,
   * por ejemplo la salida de FileReader.readAsDataURL) o como base64 "pelado".
   * La Cloud Function hace `base64.b64decode` directo, así que aquí se quita el
   * prefijo `data:...;base64,` si viene incluido.
   */
  classify(base64Image: string): Observable<string> {
    const image = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    return this.http.post<CarClassificationResponse>(environment.carClassifierUrl, { image }).pipe(
      map((response) => response.prediction),
      catchError((error: HttpErrorResponse) => {
        const body = error.error as CarClassificationErrorResponse | null;
        return throwError(() => new Error(body?.error ?? 'No se pudo clasificar la imagen.'));
      }),
    );
  }
}
