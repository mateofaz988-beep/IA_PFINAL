/** Adaptador de fechas ISO de la API para las vistas existentes. */
export class Fecha {
  private constructor(private readonly milliseconds: number) {}
  static fromMillis(value: number): Fecha { return new Fecha(value); }
  static fromIso(value: string): Fecha { return new Fecha(Date.parse(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z')); }
  static now(): Fecha { return new Fecha(Date.now()); }
  toMillis(): number { return this.milliseconds; }
  toDate(): Date { return new Date(this.milliseconds); }
}
