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

const DB_NAME = "june-push-sdk";
const DB_VERSION = 1;
const STORE_NAME = "unsubscribe-links";

function openDb(): Promise<IDBDatabase> {
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

export async function readUnsubscribeLink(
  collectToken: string,
): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(collectToken);
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // z. B. IndexedDB im privaten Modus deaktiviert - dann eben ohne Cache.
    console.warn("[JunePushSDK] IndexedDB-Lesezugriff fehlgeschlagen:", err);
    return null;
  }
}

export async function writeUnsubscribeLink(
  collectToken: string,
  link: string,
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(link, collectToken);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // ignorieren - Cache ist reine Optimierung, kein Muss.
    console.warn("[JunePushSDK] IndexedDB-Schreibzugriff fehlgeschlagen:", err);
  }
}

export async function deleteUnsubscribeLink(collectToken: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(collectToken);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // ignorieren
    console.warn("[JunePushSDK] IndexedDB-Löschzugriff fehlgeschlagen:", err);
  }
}
