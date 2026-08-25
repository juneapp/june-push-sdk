import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  deleteToken,
  onMessage,
  Messaging,
} from "firebase/messaging";

import {
  isTokenAlreadyRegisteredError,
  type JunePushConfig,
  type JunePushMessageData,
  type JunePushSubscriptionStatus,
} from "@juneapp/push-sdk-shared";

import {
  readUnsubscribeLink,
  writeUnsubscribeLink,
  deleteUnsubscribeLink,
} from "./unsubscribeLinkCache";

import { readPendingBanner, clearPendingBanner } from "./pendingBannerCache";

declare global {
  interface Window {
    __JUNE_PUSH_CONFIG__?: Record<string, any>;
    JunePushSDK?: typeof JunePushSDK;
  }
}

export interface JunePushSDKOptions extends Partial<JunePushConfig> {
  /** Nur Web: VAPID-Key für die Registrierung beim Push-Dienst des Browsers.
   *  Optional, wenn schon in window.__JUNE_PUSH_CONFIG__ gesetzt. */
  vapidKey?: string;
}

export class JunePushSDK {
  private app: FirebaseApp;
  private messaging: Messaging;
  private vapidKey: string;
  private serviceWorkerPath: string;
  private apiBaseUrl: string;
  private disablePushNotificationInForeground: boolean;
  private collectToken: string;

  constructor(options: JunePushSDKOptions = {}) {
    if (!window.__JUNE_PUSH_CONFIG__) {
      throw new Error("Firebase-Config wurde nicht geladen!");
    }

    const globalConfig = window.__JUNE_PUSH_CONFIG__;

    // collectToken/vapidKey kommen primär aus der zentralen junePushConfig.js,
    // können bei Bedarf per Options überschrieben werden - analog dazu, wie
    // die RN-Variante ihre Werte direkt als Konstruktor-Argument bekommt.
    this.vapidKey = options.vapidKey ?? globalConfig.vapidKey;
    this.collectToken = options.collectToken ?? globalConfig.collectToken;
    // Bewusst KEIN Standardwert mehr (früher ein hart codierter Fallback
    // auf eine reale Produktions-Domain) - das SDK ist öffentlich sichtbar,
    // da darf keine eigene Infrastruktur-URL im Quellcode stehen.
    this.apiBaseUrl = globalConfig.apiBaseUrl ?? options.apiBaseUrl;
    this.disablePushNotificationInForeground =
      options.disablePushNotificationInForeground ?? false;
    this.serviceWorkerPath = "/junePushSw.js";

    if (!this.vapidKey) {
      throw new Error(
        "Kein vapidKey gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__).",
      );
    }
    if (!this.collectToken) {
      throw new Error(
        "Kein collectToken gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__).",
      );
    }
    if (!this.apiBaseUrl) {
      throw new Error(
        "Kein apiBaseUrl gefunden (weder in Options noch in __JUNE_PUSH_CONFIG__) - Pflichtfeld, kein Standardwert vorhanden.",
      );
    }

    this.app = initializeApp(globalConfig);
    this.messaging = getMessaging(this.app);
  }

  async initWorker() {
    return this.register();
  }

  /**
   * Aktueller Subscription-Status, ohne Netzwerkaufruf - zum Rendern eines
   * "Anmelden"- oder "Abmelden"-Buttons in der eigenen UI. Sollte nach
   * register() bzw. unsubscribe() erneut abgefragt werden, um die UI zu
   * aktualisieren (kein automatisches Event dafür, bewusst simpel gehalten).
   */
  getSubscriptionStatus(): JunePushSubscriptionStatus {
    if (Notification.permission === "denied") {
      return "denied";
    }
    if (Notification.permission === "granted" && this.getCachedToken()) {
      return "subscribed";
    }
    return "unsubscribed";
  }

  /**
   * Fragt Permission an, holt den FCM-Token und speichert ihn im Backend -
   * vermeidet dabei unnötige Backend-Aufrufe, falls z. B. auf jedem
   * Seitenaufruf register() aufgerufen wird:
   *
   * - Berechtigung bereits abgelehnt ("denied"): bricht sofort ab, ohne
   *   Service Worker, Firebase oder Backend überhaupt anzufassen.
   * - Bereits erfolgreich registriert (Token im localStorage gecacht) UND
   *   Berechtigung weiterhin erteilt: gibt den gecachten Token zurück, ohne
   *   erneut getToken()/saveToken() aufzurufen. navigator.serviceWorker.
   *   register() wird trotzdem aufgerufen (siehe Kommentar dort) - sonst
   *   bemerkt der Browser ein aktualisiertes SW-Skript unter Umständen erst
   *   nach bis zu 24h statt beim nächsten Seitenaufruf.
   */
  async register(): Promise<string | null> {
    if (Notification.permission === "denied") {
      console.warn(
        "[JunePushSDK] Push-Berechtigung wurde abgelehnt, register() abgebrochen.",
      );
      return null;
    }

    // Service Worker IMMER (neu) registrieren - auch wenn unten wegen eines
    // gecachten Tokens gleich früh zurückgesprungen wird. Grund: der
    // Browser prüft ein SW-Skript nur dann auf Änderungen (Byte-Diff), wenn
    // navigator.serviceWorker.register() tatsächlich aufgerufen wird - ohne
    // diesen Aufruf (z. B. weil der frühe Ausstieg unten ihn überspringt,
    // wie es hier vorher der Fall war) bleibt ein bereits aktiver, alter SW
    // bestehen und wird höchstens alle 24h automatisch neu geprüft. Der
    // `?v=`-Cache-Buster erzwingt dabei nur einen frischen Netzwerk-Fetch
    // (kein HTTP-Cache) - ob der SW wirklich neu installiert wird, hängt
    // trotzdem vom tatsächlichen Byte-Vergleich des Skriptinhalts ab, ein
    // unverändertes Skript löst also kein unnötiges Reinstall aus.
    const reg = await navigator.serviceWorker.register(
      `${this.serviceWorkerPath}?v=${Date.now()}`,
    );

    const cachedToken = this.getCachedToken();
    if (cachedToken && Notification.permission === "granted") {
      // Berechtigung ist erteilt UND ein Token ist gecacht - das reicht
      // aber nicht als Beweis, dass der Token noch gültig ist: wird die
      // Berechtigung widerrufen und später erneut erteilt, verwirft der
      // Browser die alte Push-Subscription (unabhängig von unserem Cache),
      // der zugehörige FCM-Token wird bei Google zu "NotRegistered" -
      // unser Cache weiß davon nichts und würde ohne diese Prüfung den
      // toten Token immer wieder zurückgeben, ohne dass er je neu im
      // Backend gespeichert wird. Deshalb zusätzlich prüfen, ob tatsächlich
      // noch eine aktive Push-Subscription existiert (rein lokale Prüfung,
      // kein Netzwerk-Aufruf) - nur dann gilt der gecachte Token als sicher
      // gültig.
      const existingSubscription = await reg.pushManager.getSubscription();
      if (existingSubscription) {
        console.log(
          "[JunePushSDK] Bereits erfolgreich registriert, nutze gecachten Token.",
        );
        return cachedToken;
      }

      console.log(
        "[JunePushSDK] Gecachter Token ohne aktive Push-Subscription (z. B. nach Widerruf+Neuerteilung der Berechtigung) - hole neuen Token.",
      );
      this.clearCachedToken();
    }

    try {
      const token = await getToken(this.messaging, {
        vapidKey: this.vapidKey,
        serviceWorkerRegistration: reg,
      });

      if (token) {
        const saved = await this.saveToken(token);
        if (saved) {
          this.setCachedToken(token);
        } else {
          console.warn(
            "[JunePushSDK] Token erhalten, aber im Backend nicht gespeichert.",
          );
        }
      }

      return token;
    } catch (err) {
      console.error("[JunePushSDK] Registrierung fehlgeschlagen:", err);
      return null;
    }
  }

  private get cacheKey(): string {
    return `june_push_token:${this.collectToken}`;
  }

  private getCachedToken(): string | null {
    try {
      return localStorage.getItem(this.cacheKey);
    } catch {
      // z. B. Privater Modus / localStorage deaktiviert - dann eben ohne Cache.
      return null;
    }
  }

  private setCachedToken(token: string) {
    try {
      localStorage.setItem(this.cacheKey, token);
    } catch {
      // ignorieren - Cache ist reine Optimierung, kein Muss.
    }
  }

  private clearCachedToken() {
    try {
      localStorage.removeItem(this.cacheKey);
    } catch {
      // ignorieren
    }
  }

  /**
   * Zuletzt zwischengespeicherter Abmelde-Link (siehe unsubscribe_click_link),
   * unabhängig vom aktuellen Seitenaufruf - auch dann vorhanden, wenn der
   * Link nur über eine Hintergrund-Nachricht ankam (Tab war beim Empfang
   * geschlossen). Gecacht wird in IndexedDB statt localStorage, weil der
   * Service Worker (JunePushSw.ts, verarbeitet Hintergrund-Nachrichten)
   * localStorage nicht nutzen kann, IndexedDB aber schon - siehe
   * unsubscribeLinkCache.ts. Ohne diesen Aufruf kennt die eigene UI den Link
   * erst, sobald im laufenden Tab tatsächlich eine Nachricht ankommt.
   */
  async getUnsubscribeLink(): Promise<string | null> {
    return readUnsubscribeLink(this.collectToken);
  }

  /**
   * Liest den zuletzt über eine Hintergrund-Nachricht empfangenen
   * banner_html-Wert (siehe JunePushSw.ts, cacht ihn in IndexedDB, weil der
   * Service Worker kein localStorage nutzen kann) und löscht ihn danach aus
   * dem Cache. Gedacht für einen einmaligen Aufruf beim Laden der Seite
   * (z. B. direkt nach dem SDK-Setup), um den Banner aus einer Nachricht
   * anzuzeigen, die eintraf, während kein Tab offen war - nicht für
   * wiederholte Aufrufe, sonst würde der Banner beim zweiten Aufruf einfach
   * als "nichts Neues" (null) zurückkommen, selbst wenn er noch nicht
   * angezeigt wurde.
   *
   * Im Vordergrund empfangene Nachrichten laufen weiterhin direkt über
   * listenToForegroundMessages() - die brauchen diesen Cache nicht, die
   * Seite ist ja schon offen und zeigt den Banner live an.
   */
  async consumePendingBanner(): Promise<string | null> {
    const bannerHtml = await readPendingBanner(this.collectToken);
    if (bannerHtml) {
      await clearPendingBanner(this.collectToken);
    }
    return bannerHtml;
  }

  /**
   * Meldet den Kontakt über den in der Nachricht mitgeschickten Link ab
   * (data.unsubscribe_click_link - vollständige URL, Token ist darin schon
   * enthalten). Meldet den Push-Token danach auch lokal beim Browser ab
   * (deleteToken) und räumt den register()-Cache auf, damit ein späterer
   * register()-Aufruf nicht den jetzt ungültigen Token zurückgibt, sondern
   * neu registriert.
   */
  async unsubscribe(unsubscribeLink: string): Promise<boolean> {
    try {
      const response = await fetch(unsubscribeLink, { method: "GET" });

      if (response.ok) {
        this.clearCachedToken();
        await deleteUnsubscribeLink(this.collectToken);
        await deleteToken(this.messaging).catch(err => {
          console.warn(
            "[JunePushSDK] Lokales Abmelden des Tokens fehlgeschlagen:",
            err,
          );
        });
      } else {
        console.warn(
          "[JunePushSDK] Abmelden im Backend fehlgeschlagen, Status:",
          response.status,
        );
      }

      return response.ok;
    } catch (err) {
      console.error("[JunePushSDK] Abmelden fehlgeschlagen:", err);
      return false;
    }
  }

  /**
   * Reagiert automatisch, wenn die Notification-Berechtigung widerrufen wird
   * (z. B. über die Browser-Einstellungen, nicht über unseren "Abmelden"-
   * Button) - meldet den Kontakt dann über den zuletzt zwischengespeicherten
   * unsubscribe_click_link ab (siehe listenToForegroundMessages(), das
   * cacht ihn bei jeder Nachricht mit diesem Feld).
   *
   * Prüft sowohl den aktuellen Stand direkt beim Aufruf (falls die
   * Berechtigung schon vor dem Öffnen der Seite widerrufen wurde) als auch
   * laufend während die Seite offen ist. Setzt die Permissions API voraus
   * (fehlt z. B. in älteren Safari-Versionen) - ohne die passiert nichts,
   * bricht aber nicht ab.
   *
   * Einschränkung: greift nur, solange die Seite offen ist bzw. beim
   * nächsten Aufruf - es gibt keinen Browser-Mechanismus, der uns über einen
   * Widerruf informiert, während die Seite geschlossen ist. Der zwischen-
   * gespeicherte Link selbst liegt aber in IndexedDB und wird auch vom
   * Service Worker bei Hintergrund-Nachrichten befüllt (siehe JunePushSw.ts)
   * - kam der letzte unsubscribe_click_link nur im Hintergrund an, ist er
   * hier trotzdem bekannt.
   */
  async watchPermissionRevocation(): Promise<void> {
    if (!("permissions" in navigator)) {
      return;
    }

    const reactToState = async (state: PermissionState) => {
      if (state !== "denied") return;

      const link = await readUnsubscribeLink(this.collectToken);
      if (!link) return;

      console.log(
        "[JunePushSDK] Berechtigung widerrufen, melde über zwischengespeicherten Link ab.",
      );
      await this.unsubscribe(link);
    };

    try {
      const status = await navigator.permissions.query({
        name: "notifications" as PermissionName,
      });

      await reactToState(status.state);
      status.onchange = () => reactToState(status.state);
    } catch (err) {
      console.warn("[JunePushSDK] Permissions API nicht verfügbar:", err);
    }
  }

  listenToForegroundMessages(callback: (data: JunePushMessageData) => void) {
    onMessage(this.messaging, async payload => {
      const data = (payload.data ?? {}) as JunePushMessageData;

      // Open-Tracking sofort beim Empfang - auf allen Plattformen gleich.
      if (data.tracking_open_link) {
        fetch(data.tracking_open_link, { method: "GET" });
      }

      // Zwischenspeichern für watchPermissionRevocation() - falls der Nutzer
      // die Berechtigung widerruft, ohne aktiv auf "Abmelden" zu klicken,
      // nutzen wir den zuletzt bekannten Link, um trotzdem abzumelden. Wird
      // auch vom Service Worker befüllt (Hintergrund-Nachrichten), deshalb
      // hier derselbe IndexedDB-Store statt localStorage.
      if (data.unsubscribe_click_link) {
        await writeUnsubscribeLink(this.collectToken, data.unsubscribe_click_link);
      }

      if (
        data.title &&
        Notification.permission === "granted" &&
        !this.disablePushNotificationInForeground
      ) {
        const n = new Notification(data.title, {
          body: data.body,
          icon: data.icon,
          data,
        } as NotificationOptions);

        n.onclick = event => {
          event.preventDefault();
          if (data.tracking_click_link) {
            window.open(data.tracking_click_link, "_blank");
          }
        };
      }

      callback(data);
    });
  }

  /**
   * Speichert den Token im Backend. Gibt zurück, ob das Speichern
   * erfolgreich war (HTTP-Status ok) - so kann register() darauf reagieren,
   * statt blind anzunehmen, dass der Token gesetzt wurde.
   */
  private async saveToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/v2/public/collection/${this.collectToken}/collects`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ push_device_token: token }),
        },
      );
      const data = await response.json();
      console.log("[JunePushSDK] Backend-Antwort:", data);

      if (response.ok) {
        return true;
      }

      // z. B. HTTP 406 mit {"errors":{"push_device_token":["push_device_token
      // already exists"]}} - kein echter Fehler, Token ist schon hinterlegt.
      if (isTokenAlreadyRegisteredError(data)) {
        console.log(
          "[JunePushSDK] Token war bereits im Backend hinterlegt, werte als Erfolg.",
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error("[JunePushSDK] saveToken fehlgeschlagen:", err);
      return false;
    }
  }
}

window.JunePushSDK = JunePushSDK;
