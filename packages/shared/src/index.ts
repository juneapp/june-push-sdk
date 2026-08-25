/**
 * Gemeinsame Typen für Web- und React-Native-Variante des June Push SDK.
 * Ziel: beide Plattform-Pakete sprechen dieselbe "Sprache" (gleiche
 * Konfigurationsfelder, gleicher Nachrichten-Datenvertrag), auch wenn der
 * jeweilige Code plattformbedingt unterschiedlich implementiert ist.
 */

/**
 * Plattformübergreifende Basis-Konfiguration.
 * Web ergänzt zusätzlich `vapidKey` (siehe @juneapp/push-sdk-web), RN braucht
 * das nicht, weil die native Firebase-Registrierung das selbst übernimmt.
 */
export interface JunePushConfig {
  /** Collection-Token aus eurem Backend – identisch auf allen Plattformen. */
  collectToken: string;
  /**
   * Basis-URL eures Backends. Pflichtfeld, bewusst ohne Standardwert - ein
   * SDK, das öffentlich (z. B. auf GitHub) sichtbar ist, sollte keine
   * eigene Produktions-Domain hart codiert enthalten. Muss von der
   * einbindenden App übergeben werden.
   */
  apiBaseUrl: string;
  /**
   * Wenn true: Im Vordergrund empfangene Nachrichten werden nicht sichtbar
   * angezeigt (kein Browser-Notification bzw. kein In-App-Banner-Callback).
   * Das Open-Tracking feuert in beiden Fällen trotzdem.
   */
  disablePushNotificationInForeground?: boolean;
}

/**
 * Der Datenvertrag, den euer Backend im `data`-Feld jeder Push-Nachricht
 * mitschickt. Gilt für Web (dort Quelle für die selbst gebaute Notification)
 * und für RN (dort Quelle für das In-App-Banner + Tracking).
 */
export interface JunePushMessageData {
  title?: string;
  body?: string;
  /** Web: Icon-URL für die Browser-Notification. */
  icon?: string;
  /** Bild-URL, z. B. für die Service-Worker-Notification unter Web. */
  image?: string;
  /** HTML-Inhalt für das In-App-Banner (aktuell nur RN, optional für Web nutzbar). */
  banner_html?: string;
  /** Ziel-URL beim Klick auf die Notification bzw. den Banner-Link. */
  tracking_click_link?: string;
  /** URL, die als "Öffnungspixel" beim Empfang/Anzeigen der Nachricht abgerufen wird. */
  tracking_open_link?: string;
  /**
   * Vollständiger Link, mit dem sich der Kontakt (identifiziert über seinen
   * Push-Token, ist im Link bereits enthalten) beim Backend abmelden kann.
   * Wird NICHT automatisch aufgerufen (anders als tracking_open_link) -
   * sondern erst, wenn der Nutzer aktiv "Abmelden" wählt (z. B. ein Link im
   * eigenen banner_html, oder eine eigene UI). Dafür in beiden SDKs
   * `unsubscribe(data.unsubscribe_click_link)` aufrufen.
   */
  unsubscribe_click_link?: string;
}

/**
 * Subscription-Status, den getSubscriptionStatus() zurückgibt - gedacht,
 * um in der eigenen UI zwischen "Anmelden"- und "Abmelden"-Button zu
 * entscheiden, ohne dafür einen Netzwerkaufruf zu brauchen.
 *
 * - "denied": Push-Berechtigung wurde abgelehnt.
 * - "subscribed": Berechtigung erteilt UND erfolgreich registriert.
 * - "unsubscribed": alles andere (Berechtigung noch nicht angefragt, oder
 *   erteilt aber noch nicht/nicht mehr registriert).
 */
export type JunePushSubscriptionStatus = "denied" | "subscribed" | "unsubscribed";

/**
 * Der collects-Endpunkt liefert bei einem bereits hinterlegten Token einen
 * Fehler-Status statt einfach "ok" - inhaltlich ist das aber kein Fehler,
 * sondern bedeutet "bereits erfolgreich registriert":
 *
 *   {"errors":{"push_device_token":["push_device_token already exists"]}}
 *
 * Beide SDKs werten das in saveToken() deshalb als Erfolg statt als
 * fehlgeschlagenes Speichern.
 */
export function isTokenAlreadyRegisteredError(data: unknown): boolean {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  const messages = (data as { errors?: { push_device_token?: unknown } }).errors
    ?.push_device_token;
  if (!Array.isArray(messages)) {
    return false;
  }
  return messages.some(
    msg => typeof msg === "string" && /already exists/i.test(msg),
  );
}
