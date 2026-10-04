/**
 * Hält den `AbortController` aller API-Aufrufe; `reset` bricht laufende Requests ab und legt einen frischen an, damit spätere Aufrufe wieder möglich sind.
 */
class AbortControllerWrapper {
  controller: AbortController;
  signal: AbortSignal;

  /**
   * Legt den ersten `AbortController` samt `signal` an.
   */
  constructor() {
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }

  /**
   * Bricht alle Requests ab, die das aktuelle `signal` nutzen, und ersetzt Controller und `signal` durch neue.
   *
   * @param reason - Abbruchgrund, den die abgebrochenen Fetches als Ablehnung erhalten.
   */
  reset(reason: string = 'Unbekannt abgebrochen') {
    this.controller?.abort(reason);
    this.controller = new AbortController();
    this.signal = this.controller.signal;
  }
}
export const abortController = new AbortControllerWrapper();
