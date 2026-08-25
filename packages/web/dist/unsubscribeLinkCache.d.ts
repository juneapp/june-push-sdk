/**
 * Speichert den zuletzt empfangenen unsubscribe_click_link in IndexedDB
 * statt localStorage.
 *
 * Grund: der Service Worker (der Hintergrund-Nachrichten verarbeitet, siehe
 * JunePushSw.ts) hat keinen Zugriff auf localStorage - das ist eine reine
 * Hauptthread-API. IndexedDB ist dagegen sowohl im Hauptthread
 * (JunePushSDK.ts) als auch im Service Worker verfügbar. Nur so lässt sich
 * der Abmelde-Link auch dann cachen, wenn beim Eintreffen der Nachricht kein
 * Tab offen war (Hintergrund-Push) - vorher ging das nur, solange die Seite
 * beim Empfang der Nachricht offen war.
 *
 * Bewusst ein eigenes, minimales Modul statt einer Bibliothek - ein Store
 * pro collectToken (Key = collectToken, Value = Link), keine Historie,
 * keine weiteren Felder.
 */
export declare function readUnsubscribeLink(collectToken: string): Promise<string | null>;
export declare function writeUnsubscribeLink(collectToken: string, link: string): Promise<void>;
export declare function deleteUnsubscribeLink(collectToken: string): Promise<void>;
//# sourceMappingURL=unsubscribeLinkCache.d.ts.map