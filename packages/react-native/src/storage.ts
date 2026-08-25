/**
 * Persistenter Key-Value-Speicher für die React-Native-Variante - Pendant
 * zu unsubscribeLinkCache.ts/pendingBannerCache.ts (IndexedDB) im Web-SDK.
 *
 * Warum überhaupt persistent statt einer einfachen JS-Variable: der
 * Hintergrund-Handler (siehe registerBackgroundHandler() in JunePushSDK.ts)
 * läuft in einem eigenen, kurzlebigen JS-Kontext (auf Android ein separater
 * Headless-JS-Task, auf iOS ein kurz hochgefahrener JS-Kontext für den
 * nativen Background-Fetch) - der wird direkt nach der Verarbeitung wieder
 * beendet. Eine normale In-Memory-Variable wäre beim nächsten App-Start
 * (oder sogar schon beim nächsten Foreground-Wechsel) wieder weg. Es gibt
 * kein RN-Äquivalent zu localStorage/IndexedDB im Kern, deshalb hier
 * @react-native-async-storage/async-storage als peerDependency.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const unsubscribeLinkKey = (collectToken: string) =>
  `june_push_unsubscribe_link:${collectToken}`;

const pendingBannerKey = (collectToken: string) =>
  `june_push_pending_banner:${collectToken}`;

export async function readUnsubscribeLink(
  collectToken: string,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(unsubscribeLinkKey(collectToken));
  } catch (err) {
    console.warn('[JunePushSDK] AsyncStorage-Lesezugriff fehlgeschlagen:', err);
    return null;
  }
}

export async function writeUnsubscribeLink(
  collectToken: string,
  link: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(unsubscribeLinkKey(collectToken), link);
  } catch (err) {
    // ignorieren - Cache ist reine Optimierung, kein Muss.
    console.warn(
      '[JunePushSDK] AsyncStorage-Schreibzugriff fehlgeschlagen:',
      err,
    );
  }
}

export async function deleteUnsubscribeLink(
  collectToken: string,
): Promise<void> {
  try {
    await AsyncStorage.removeItem(unsubscribeLinkKey(collectToken));
  } catch (err) {
    // ignorieren
    console.warn('[JunePushSDK] AsyncStorage-Löschzugriff fehlgeschlagen:', err);
  }
}

export async function readPendingBanner(
  collectToken: string,
): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(pendingBannerKey(collectToken));
  } catch (err) {
    console.warn('[JunePushSDK] AsyncStorage-Lesezugriff fehlgeschlagen:', err);
    return null;
  }
}

export async function writePendingBanner(
  collectToken: string,
  bannerHtml: string,
): Promise<void> {
  try {
    await AsyncStorage.setItem(pendingBannerKey(collectToken), bannerHtml);
  } catch (err) {
    console.warn(
      '[JunePushSDK] AsyncStorage-Schreibzugriff fehlgeschlagen:',
      err,
    );
  }
}

export async function clearPendingBanner(collectToken: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(pendingBannerKey(collectToken));
  } catch (err) {
    console.warn('[JunePushSDK] AsyncStorage-Löschzugriff fehlgeschlagen:', err);
  }
}
