# @juneapp/push-sdk-web

Web-SDK für June Push Notifications (Firebase Cloud Messaging).

## Setup beim Kunden

### 1. Firebase-Config bereitstellen

Diese Datei gehört **nicht** zum Paket – sie enthält eure kundenspezifischen
Firebase-Zugangsdaten und muss vom Kunden selbst im Web-Root abgelegt werden
(z. B. `public/junePushConfig.js`):

```js
var config = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  vapidKey: "...",
  collectToken: "..."
};

if (typeof window !== "undefined") {
  window.__JUNE_PUSH_CONFIG__ = config;
}
if (typeof self !== "undefined") {
  self.__JUNE_PUSH_CONFIG__ = config;
}
```

Diese Datei muss sowohl im Hauptdokument (per `<script src="/junePushConfig.js">`)
als auch für den Service Worker erreichbar sein (`importScripts('/junePushConfig.js')`
passiert automatisch im SDK-eigenen Service Worker).

### 2. Service Worker bereitstellen

Der Kunde baut aus `JunePushSw.ts` (bzw. der kompilierten `dist/JunePushSw.js`
aus diesem Paket) seine eigene `public/junePushSw.js` – entweder durch direktes
Kopieren/Bundlen der Datei, oder durch einen Re-Export, falls der Build-Prozess
das erlaubt. Der Pfad `/junePushSw.js` ist im SDK fix hinterlegt.

### 3. SDK initialisieren

```ts
import { JunePushSDK } from '@juneapp/push-sdk-web';

const sdk = new JunePushSDK({});
// collectToken/vapidKey werden automatisch aus window.__JUNE_PUSH_CONFIG__ gelesen

const token = await sdk.register();

sdk.listenToForegroundMessages((data) => {
  console.log('Nachricht im Vordergrund:', data);
});
```

## API

- `register(): Promise<string | null>` – Service Worker registrieren, Permission/Token holen, Token im Backend speichern. Nutzt einen lokalen Cache, um bei bereits erfolgter Registrierung unnötige Backend-Aufrufe zu vermeiden.
- `getSubscriptionStatus(): "denied" | "subscribed" | "unsubscribed"` – aktueller Status ohne Netzwerk-Aufruf, z. B. um einen Anmelden-/Abmelden-Button zu rendern.
- `unsubscribe(unsubscribeLink: string): Promise<boolean>` – meldet den Kontakt über den in der Nachricht mitgeschickten `data.unsubscribe_click_link` ab und meldet den Push-Token auch lokal beim Browser ab.
- `watchPermissionRevocation(): Promise<void>` – meldet automatisch ab, wenn die Nutzer:in die Push-Berechtigung über die Browser-Einstellungen widerruft (nutzt den zuletzt über eine Nachricht empfangenen `unsubscribe_click_link`).
- `getUnsubscribeLink(): Promise<string | null>` – zuletzt gecachter Abmelde-Link, unabhängig vom aktuellen Seitenaufruf.
- `consumePendingBanner(): Promise<string | null>` – liest `banner_html` aus einer Hintergrund-Nachricht (Tab war beim Empfang nicht sichtbar) und löscht ihn danach aus dem Cache; für die einmalige Anzeige beim nächsten Öffnen/Fokussieren der Seite gedacht.
- `listenToForegroundMessages(callback)` – Nachrichten im Vordergrund abfangen, zeigt automatisch eine Browser-Notification (außer `disablePushNotificationInForeground: true`).
- `initWorker()` – Alias für `register()`.
