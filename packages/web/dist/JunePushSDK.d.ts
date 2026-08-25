import { type JunePushConfig, type JunePushMessageData, type JunePushSubscriptionStatus } from "@juneapp/push-sdk-shared";
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
export declare class JunePushSDK {
    private app;
    private messaging;
    private vapidKey;
    private serviceWorkerPath;
    private apiBaseUrl;
    private disablePushNotificationInForeground;
    private collectToken;
    constructor(options?: JunePushSDKOptions);
    initWorker(): Promise<string | null>;
    /**
     * Aktueller Subscription-Status, ohne Netzwerkaufruf - zum Rendern eines
     * "Anmelden"- oder "Abmelden"-Buttons in der eigenen UI. Sollte nach
     * register() bzw. unsubscribe() erneut abgefragt werden, um die UI zu
     * aktualisieren (kein automatisches Event dafür, bewusst simpel gehalten).
     */
    getSubscriptionStatus(): JunePushSubscriptionStatus;
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
    register(): Promise<string | null>;
    private get cacheKey();
    private getCachedToken;
    private setCachedToken;
    private clearCachedToken;
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
    getUnsubscribeLink(): Promise<string | null>;
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
    consumePendingBanner(): Promise<string | null>;
    /**
     * Meldet den Kontakt über den in der Nachricht mitgeschickten Link ab
     * (data.unsubscribe_click_link - vollständige URL, Token ist darin schon
     * enthalten). Meldet den Push-Token danach auch lokal beim Browser ab
     * (deleteToken) und räumt den register()-Cache auf, damit ein späterer
     * register()-Aufruf nicht den jetzt ungültigen Token zurückgibt, sondern
     * neu registriert.
     */
    unsubscribe(unsubscribeLink: string): Promise<boolean>;
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
    watchPermissionRevocation(): Promise<void>;
    listenToForegroundMessages(callback: (data: JunePushMessageData) => void): void;
    /**
     * Speichert den Token im Backend. Gibt zurück, ob das Speichern
     * erfolgreich war (HTTP-Status ok) - so kann register() darauf reagieren,
     * statt blind anzunehmen, dass der Token gesetzt wurde.
     */
    private saveToken;
}
//# sourceMappingURL=JunePushSDK.d.ts.map