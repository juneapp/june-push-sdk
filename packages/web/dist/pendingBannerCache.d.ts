/**
 * Speichert den zuletzt über eine HINTERGRUND-Nachricht empfangenen
 * banner_html-Wert in IndexedDB, damit er beim nächsten Öffnen des Tabs
 * einmalig angezeigt werden kann (siehe JunePushSDK.consumePendingBanner()).
 *
 * Gleicher Grund wie bei unsubscribeLinkCache.ts: der Service Worker
 * (verarbeitet Hintergrund-Nachrichten, siehe JunePushSw.ts) hat keinen
 * Zugriff auf localStorage, aber schon auf IndexedDB. Im Vordergrund
 * empfangene Nachrichten brauchen diesen Cache nicht - da zeigt die
 * aufrufende Seite den Banner ja direkt live an (siehe
 * listenToForegroundMessages()).
 *
 * Bewusst eine eigene, von unsubscribeLinkCache.ts komplett unabhängige
 * IndexedDB-Datenbank statt eines zusätzlichen Object Stores in derselben
 * DB - vermeidet, dass eine Versions-Migration der bestehenden DB nötig
 * wird, nur um einen neuen Store hinzuzufügen.
 */
export declare function readPendingBanner(collectToken: string): Promise<string | null>;
export declare function writePendingBanner(collectToken: string, bannerHtml: string): Promise<void>;
export declare function clearPendingBanner(collectToken: string): Promise<void>;
//# sourceMappingURL=pendingBannerCache.d.ts.map