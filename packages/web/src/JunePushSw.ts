import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

import type { JunePushMessageData } from "@juneapp/push-sdk-shared";

import { writeUnsubscribeLink } from "./unsubscribeLinkCache";
import { writePendingBanner } from "./pendingBannerCache";

/**
 * Eigene, minimale Typisierung von `self` statt des TypeScript-Bordmittel-
 * Typs `ServiceWorkerGlobalScope`. Grund: ob (und wie vollständig)
 * `ServiceWorkerGlobalScope` in lib.webworker.d.ts enthalten ist, hat sich
 * zwischen TypeScript-Versionen unterschieden - bei einem Build kam das als
 * "TS2304: Cannot find name 'ServiceWorkerGlobalScope'" durch, obwohl "lib":
 * ["ES2020", "WebWorker"] gesetzt war. Hier werden deshalb nur die paar
 * Mitglieder deklariert, die diese Datei tatsächlich braucht - unabhängig
 * von der genauen installierten TypeScript-Version.
 */
interface JuneNotificationOptions {
  body?: string;
  icon?: string;
  image?: string;
  data?: unknown;
}

declare const self: {
  __JUNE_PUSH_CONFIG__?: Record<string, any>;
  registration: {
    showNotification(
      title: string,
      options?: JuneNotificationOptions,
    ): Promise<void>;
  };
  clients: {
    claim(): Promise<void>;
    openWindow(url: string): Promise<unknown>;
  };
  addEventListener(type: string, listener: (event: any) => void): void;
  skipWaiting(): Promise<void>;
};

importScripts('/junePushConfig.js');

if (!self.__JUNE_PUSH_CONFIG__) {
  console.error("Keine Firebase-Config in SW gefunden!");
}

const app = initializeApp(self.__JUNE_PUSH_CONFIG__!);
const messaging = getMessaging(app);

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// Hintergrundnachrichten empfangen. Async, weil Firebase den Rückgabewert
// dieses Handlers selbst per event.waitUntil() abwartet (siehe onPush() im
// @firebase/messaging-sw-Paket) - so bleibt der Service Worker am Leben, bis
// auch der IndexedDB-Schreibzugriff unten abgeschlossen ist, statt vorzeitig
// beendet zu werden.
onBackgroundMessage(messaging, async payload => {
  const data = (payload.data ?? {}) as JunePushMessageData & {
    click_action?: string;
  };
  const {
    title,
    body,
    icon,
    image,
    click_action,
    tracking_click_link,
    tracking_open_link,
    unsubscribe_click_link,
    banner_html,
  } = data;
  const messageId = payload.messageId;

  console.log('onBackgroundMessage', data);

  // Open-Tracking - feuert, sobald tatsächlich ein Link vorhanden ist.
  if (tracking_open_link) {
    await fetch(tracking_open_link, { method: "GET" }).catch(() => {});
  }

  // Zwischenspeichern für watchPermissionRevocation() im Hauptthread - damit
  // ein Abmelde-Link auch verfügbar ist, wenn er nur über eine Hintergrund-
  // Nachricht ankam (kein Tab offen). collectToken kommt aus derselben
  // Config wie initializeApp() oben (siehe /junePushConfig.js).
  if (unsubscribe_click_link && self.__JUNE_PUSH_CONFIG__?.collectToken) {
    await writeUnsubscribeLink(
      self.__JUNE_PUSH_CONFIG__.collectToken,
      unsubscribe_click_link,
    );
  }

  // Zwischenspeichern für consumePendingBanner() im Hauptthread - damit der
  // Banner beim nächsten Öffnen der Seite einmalig angezeigt werden kann,
  // auch wenn die Nachricht nur im Hintergrund ankam (kein Tab offen).
  if (banner_html && self.__JUNE_PUSH_CONFIG__?.collectToken) {
    await writePendingBanner(self.__JUNE_PUSH_CONFIG__.collectToken, banner_html);
  }

  await self.registration.showNotification(title ?? "Neue Nachricht", {
    body,
    icon,
    image, // Bild in der Notification
    data: { click_action, tracking_click_link, tracking_open_link, messageId },
  });
});

// Klick-Events abfangen
self.addEventListener("notificationclick", (event: any) => {
  const url = event.notification.data?.tracking_click_link || "/";

  console.log('notificationclick', event);

  event.notification.close();
  event.waitUntil(self.clients.openWindow(url));
});
