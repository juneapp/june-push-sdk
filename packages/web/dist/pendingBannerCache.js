"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.readPendingBanner = readPendingBanner;
exports.writePendingBanner = writePendingBanner;
exports.clearPendingBanner = clearPendingBanner;
const DB_NAME = "june-push-sdk-banner";
const DB_VERSION = 1;
const STORE_NAME = "pending-banners";
function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
async function readPendingBanner(collectToken) {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const req = tx.objectStore(STORE_NAME).get(collectToken);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }
    catch (err) {
        // z. B. IndexedDB im privaten Modus deaktiviert - dann eben ohne Cache.
        console.warn("[JunePushSDK] IndexedDB-Lesezugriff fehlgeschlagen:", err);
        return null;
    }
}
async function writePendingBanner(collectToken, bannerHtml) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).put(bannerHtml, collectToken);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    catch (err) {
        // ignorieren - Cache ist reine Optimierung, kein Muss.
        console.warn("[JunePushSDK] IndexedDB-Schreibzugriff fehlgeschlagen:", err);
    }
}
async function clearPendingBanner(collectToken) {
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            tx.objectStore(STORE_NAME).delete(collectToken);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    catch (err) {
        // ignorieren
        console.warn("[JunePushSDK] IndexedDB-Löschzugriff fehlgeschlagen:", err);
    }
}
//# sourceMappingURL=pendingBannerCache.js.map