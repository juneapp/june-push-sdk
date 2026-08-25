/**
 * JUNE Push SDK – React Native Variante
 *
 * Spiegelt bewusst die API der Web-Variante (@juneapp/push-sdk-web):
 * gleiche Methodennamen, gleiche Datenfelder (siehe @juneapp/push-sdk-shared),
 * gleicher Backend-Vertrag (POST {apiBaseUrl}/v2/public/collection/{collectToken}/collects).
 *
 * Intern läuft es über @react-native-firebase/messaging statt firebase/messaging,
 * weil auf iOS/Android die native Firebase-Integration (GoogleService-Info.plist /
 * google-services.json) genutzt wird statt eines Web-Configs + Service Workers.
 */

import { AppState, Linking } from 'react-native';
import {
  getMessaging,
  getToken,
  deleteToken,
  requestPermission,
  hasPermission,
  AuthorizationStatus,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

import {
  isTokenAlreadyRegisteredError,
  type JunePushConfig,
  type JunePushMessageData,
} from '@juneapp/push-sdk-shared';

import {
  readUnsubscribeLink,
  writeUnsubscribeLink,
  deleteUnsubscribeLink,
  readPendingBanner,
  writePendingBanner,
  clearPendingBanner,
} from './storage';

export class JunePushSDK {
  private _messaging: ReturnType<typeof getMessaging> | undefined;
  private collectToken: string;
  private apiBaseUrl: string;
  private disablePushNotificationInForeground: boolean;

  constructor(config: JunePushConfig) {
    if (!config.collectToken) {
      throw new Error('Kein collectToken übergeben - Pflichtfeld.');
    }
    if (!config.apiBaseUrl) {
      // Bewusst KEIN Standardwert mehr (früher ein hart codierter Fallback
      // auf eine reale Produktions-Domain) - das SDK ist öffentlich
      // sichtbar, da darf keine eigene Infrastruktur-URL im Quellcode
      // stehen.
      throw new Error(
        'Kein apiBaseUrl übergeben - Pflichtfeld, kein Standardwert vorhanden.',
      );
    }

    this.collectToken = config.collectToken;
    this.apiBaseUrl = config.apiBaseUrl;
    this.disablePushNotificationInForeground =
      config.disablePushNotificationInForeground ?? false;
  }

  /**
   * getMessaging() erst bei tatsächlicher Nutzung aufrufen (lazy), nicht im
   * Konstruktor. Grund: ruft man getApp()/getMessaging() ganz am Anfang der
   * JS-Ausführung auf (z. B. weil die SDK-Instanz auf Modul-Ebene in App.tsx
   * erzeugt wird), kann es sein, dass das native Modul noch nicht mitgeteilt
   * hat, dass die native Firebase-App bereits konfiguriert ist - Ergebnis:
   * "No Firebase App '[DEFAULT]' has been created", obwohl FirebaseApp.configure()
   * nativ längst gelaufen ist. Bei tatsächlicher Nutzung (register(), erster
   * Listener) ist die App immer schon vollständig hochgefahren.
   */
  private get messaging() {
    if (!this._messaging) {
      this._messaging = getMessaging();
    }
    return this._messaging;
  }

  /**
   * Permission anfragen, FCM-Token holen und im Backend speichern.
   * Entspricht register() in der Web-Variante.
   */
  async register(): Promise<string | null> {
    try {
      await requestPermission(this.messaging);
      const token = await getToken(this.messaging);

      if (token) {
        const saved = await this.saveToken(token);
        if (!saved) {
          console.warn(
            '[JunePushSDK] Token erhalten, aber im Backend nicht gespeichert.',
          );
        }
      }

      return token;
    } catch (err) {
      console.error('[JunePushSDK] Registrierung fehlgeschlagen:', err);
      return null;
    }
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
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ push_device_token: token }),
        },
      );
      const data = await response.json();
      console.log('[JunePushSDK] Backend-Antwort:', data);

      if (response.ok) {
        return true;
      }

      // z. B. HTTP 406 mit {"errors":{"push_device_token":["push_device_token
      // already exists"]}} - kein echter Fehler, Token ist schon hinterlegt.
      if (isTokenAlreadyRegisteredError(data)) {
        console.log(
          '[JunePushSDK] Token war bereits im Backend hinterlegt, werte als Erfolg.',
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('[JunePushSDK] saveToken fehlgeschlagen:', err);
      return false;
    }
  }

  /**
   * Meldet den Kontakt über den in der Nachricht mitgeschickten Link ab
   * (data.unsubscribe_click_link - vollständige URL, Token ist darin schon
   * enthalten). Meldet den FCM-Token danach auch lokal ab (deleteToken),
   * damit das Gerät nicht mehr für Push registriert ist.
   */
  async unsubscribe(unsubscribeLink: string): Promise<boolean> {
    try {
      const response = await fetch(unsubscribeLink, { method: 'GET' });

      if (response.ok) {
        await deleteUnsubscribeLink(this.collectToken);
        await deleteToken(this.messaging).catch((err: unknown) => {
          console.warn(
            '[JunePushSDK] Lokales Abmelden des Tokens fehlgeschlagen:',
            err,
          );
        });
      } else {
        console.warn(
          '[JunePushSDK] Abmelden im Backend fehlgeschlagen, Status:',
          response.status,
        );
      }

      return response.ok;
    } catch (err) {
      console.error('[JunePushSDK] Abmelden fehlgeschlagen:', err);
      return false;
    }
  }

  private fireOpenTracking(data: JunePushMessageData | undefined) {
    const trackingOpenLink = data?.tracking_open_link;
    if (typeof trackingOpenLink === 'string' && trackingOpenLink.length > 0) {
      fetch(trackingOpenLink, { method: 'GET' }).catch(() => {});
    }
  }

  private openClickLink(data: JunePushMessageData | undefined) {
    const clickLink = data?.tracking_click_link;
    if (typeof clickLink === 'string' && clickLink.length > 0) {
      Linking.openURL(clickLink).catch((err: unknown) =>
        console.error('[JunePushSDK] Konnte Click-Link nicht öffnen:', err),
      );
    }
  }

  /**
   * Nachrichten im Vordergrund (App ist offen) abfangen.
   * Feuert automatisch das Open-Tracking (immer, wie im Web-SDK) und übergibt
   * die Nachricht an den callback - z. B. um data.banner_html als eigenes
   * In-App-Banner anzuzeigen. Gibt eine unsubscribe-Funktion zurück.
   *
   * Cacht data.unsubscribe_click_link (falls vorhanden) genau wie im
   * Web-SDK - für watchPermissionRevocation(), das den zuletzt bekannten
   * Link nutzt, wenn Push für die App deaktiviert wird.
   */
  listenToForegroundMessages(callback: (data: JunePushMessageData) => void) {
    return onMessage(this.messaging, async remoteMessage => {
      const data = remoteMessage?.data as JunePushMessageData | undefined;
      this.fireOpenTracking(data);

      if (data?.unsubscribe_click_link) {
        await writeUnsubscribeLink(
          this.collectToken,
          data.unsubscribe_click_link,
        );
      }

      if (!this.disablePushNotificationInForeground && data) {
        callback(data);
      }
    });
  }

  /**
   * Registriert den Hintergrund-Handler für Nachrichten, die eintreffen,
   * während die App im Hintergrund oder komplett beendet ist. MUSS in
   * index.js auf Modul-Ebene aufgerufen werden - also außerhalb jeder
   * Komponente und VOR AppRegistry.registerComponent(...) - so verlangt es
   * @react-native-firebase/messaging selbst (siehe deren Dokumentation zu
   * setBackgroundMessageHandler). Ein Aufruf aus App.tsx/einem
   * useEffect heraus kommt zu spät bzw. wird von RN beim Neustart der App
   * (Android Headless-JS-Task, iOS Background Fetch) gar nicht mehr
   * ausgeführt.
   *
   * Die System-Notification selbst zeigt RNFB auf beiden Plattformen schon
   * automatisch an (anders als im Web, wo das SW-Skript sie manuell per
   * showNotification() erzeugen muss) - hier geht es nur um das, was die
   * App selbst nachträglich braucht: Open-Tracking, sowie das
   * Zwischenspeichern von unsubscribe_click_link und banner_html für den
   * nächsten Vordergrund-Aufruf (siehe watchPermissionRevocation() bzw.
   * consumePendingBanner()).
   */
  registerBackgroundHandler(): void {
    setBackgroundMessageHandler(this.messaging, async remoteMessage => {
      const data = remoteMessage?.data as JunePushMessageData | undefined;
      if (!data) return;

      this.fireOpenTracking(data);

      if (data.unsubscribe_click_link) {
        await writeUnsubscribeLink(this.collectToken, data.unsubscribe_click_link);
      }

      if (data.banner_html) {
        await writePendingBanner(this.collectToken, data.banner_html);
      }
    });
  }

  /**
   * Liest den zuletzt über eine Hintergrund-Nachricht empfangenen
   * banner_html-Wert (siehe registerBackgroundHandler()) und löscht ihn
   * danach - Pendant zu consumePendingBanner() im Web-SDK. Gedacht für
   * einen einmaligen Aufruf, wenn die App in den Vordergrund kommt (z. B.
   * über AppState, siehe Testapp), nicht für wiederholte Aufrufe.
   *
   * Im Vordergrund empfangene Nachrichten brauchen diesen Cache nicht - die
   * App ist ja schon offen und zeigt den Banner über
   * listenToForegroundMessages() direkt an.
   */
  async consumePendingBanner(): Promise<string | null> {
    const bannerHtml = await readPendingBanner(this.collectToken);
    if (bannerHtml) {
      await clearPendingBanner(this.collectToken);
    }
    return bannerHtml;
  }

  /**
   * Reagiert, wenn Push für die App deaktiviert wird (z. B. über die
   * System-Einstellungen), und meldet den Kontakt dann über den zuletzt
   * zwischengespeicherten unsubscribe_click_link ab - Pendant zu
   * watchPermissionRevocation() im Web-SDK.
   *
   * RN hat kein Event für Berechtigungsänderungen. Stattdessen wird bei
   * jedem Wechsel der App in den Vordergrund (AppState) der aktuelle
   * Berechtigungsstatus per hasPermission() erneut abgefragt - das zeigt
   * KEINEN System-Dialog (reine Abfrage, kein requestPermission()), sondern
   * liefert nur den aktuellen Stand zurück.
   *
   * Einschränkung Android: auf Android < 13 gibt es keine granulare
   * Notification-Permission, hasPermission() liefert dort laut RNFB immer
   * AUTHORIZED zurück - ein Widerruf lässt sich auf diesen Versionen also
   * nicht erkennen. Auf Android 13+ (POST_NOTIFICATIONS) und iOS sollte es
   * greifen, aber unbedingt auf echten Geräten testen.
   *
   * Gibt eine Funktion zurück, mit der der AppState-Listener wieder
   * entfernt werden kann (z. B. in einem useEffect-Cleanup).
   */
  watchPermissionRevocation(): () => void {
    const checkPermission = async () => {
      const authStatus = await hasPermission(this.messaging);
      const authorized =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (authorized) return;

      const link = await readUnsubscribeLink(this.collectToken);
      if (!link) return;

      console.log(
        '[JunePushSDK] Berechtigung widerrufen, melde über zwischengespeicherten Link ab.',
      );
      await this.unsubscribe(link);
    };

    checkPermission();

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        checkPermission();
      }
    });

    return () => subscription.remove();
  }

  /**
   * Tap auf die System-Notification abfangen - sowohl aus dem Hintergrund
   * als auch bei komplett geschlossener App (kalter Start über
   * getInitialNotification). Feuert Open-Tracking und öffnet automatisch
   * den tracking_click_link im Browser. Gibt eine unsubscribe-Funktion zurück.
   */
  listenToNotificationOpen(callback?: (data: JunePushMessageData) => void) {
    const handleTap = (remoteMessage: any) => {
      const data = remoteMessage?.data as JunePushMessageData | undefined;
      this.fireOpenTracking(data);
      this.openClickLink(data);
      if (data) {
        callback?.(data);
      }
    };

    const unsubscribe = onNotificationOpenedApp(this.messaging, handleTap);

    getInitialNotification(this.messaging).then(remoteMessage => {
      if (remoteMessage) {
        handleTap(remoteMessage);
      }
    });

    return unsubscribe;
  }
}
