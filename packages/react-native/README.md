# @juneapp/push-sdk-react-native

React-Native-SDK für June Push Notifications (`@react-native-firebase/messaging`).

## Voraussetzungen beim Kunden

Der Kunde muss selbst:

1. Ein Firebase-Projekt anlegen und die App dort registrieren.
2. `GoogleService-Info.plist` (iOS) bzw. `google-services.json` (Android) ins
   native Projekt einbinden.
3. `@react-native-firebase/app` und `@react-native-firebase/messaging`
   installieren (Peer-Dependencies dieses Pakets) und `pod install` /
   Gradle-Sync ausführen.
4. Auf iOS: Push-Notifications-Capability + APNs-Key in der Firebase Console
   hinterlegen (das ist erfahrungsgemäß der Teil mit dem meisten
   Setup-Aufwand – siehe die offizielle
   [@react-native-firebase/messaging-Doku](https://rnfirebase.io/messaging/usage)).

Dieses SDK übernimmt ab dem Punkt, an dem Firebase in der App initialisiert ist.

## Nutzung

```ts
import { JunePushSDK } from '@juneapp/push-sdk-react-native';

const sdk = new JunePushSDK({
  collectToken: 'DEIN_COLLECT_TOKEN', // gleicher Wert wie bei der Web-Integration
  apiBaseUrl: 'https://DEINE-BACKEND-URL', // Pflichtfeld, kein Standardwert
});

// z. B. in einem Onboarding-Screen
const token = await sdk.register();

// z. B. im App-Root, einmalig
useEffect(() => {
  const unsubscribeForeground = sdk.listenToForegroundMessages((data) => {
    if (data.banner_html) {
      // eigenes In-App-Banner mit data.banner_html anzeigen
    }
  });

  const unsubscribeOpened = sdk.listenToNotificationOpen();

  return () => {
    unsubscribeForeground();
    unsubscribeOpened();
  };
}, []);
```

## API

- `register(): Promise<string | null>` – Permission anfragen, FCM-Token holen, Token im Backend speichern.
- `unsubscribe(unsubscribeLink: string): Promise<boolean>` – meldet den Kontakt über den in der Nachricht mitgeschickten `data.unsubscribe_click_link` ab und meldet den FCM-Token auch lokal ab.
- `watchPermissionRevocation(): () => void` – prüft bei jedem App-Vordergrund-Wechsel, ob Push für die App deaktiviert wurde, und meldet dann automatisch über den zuletzt bekannten `unsubscribe_click_link` ab. Gibt eine Funktion zum Entfernen des Listeners zurück.
- `registerBackgroundHandler(): void` – muss in `index.js` auf Modul-Ebene stehen, vor `AppRegistry.registerComponent()` (Voraussetzung von `@react-native-firebase/messaging`). Cacht `unsubscribe_click_link` und `banner_html` aus Nachrichten, die eintreffen, während die App im Hintergrund oder beendet ist.
- `consumePendingBanner(): Promise<string | null>` – liest `banner_html` aus einer Hintergrund-Nachricht und löscht ihn danach aus dem Cache; für die einmalige Anzeige beim nächsten Vordergrund-Wechsel gedacht.
- `listenToForegroundMessages(callback)` – Nachrichten im Vordergrund abfangen (App ist offen). Feuert automatisch Open-Tracking.
- `listenToNotificationOpen(callback?)` – Tap auf die System-Notification abfangen (Hintergrund oder kalter Start). Feuert Open-Tracking und öffnet automatisch `tracking_click_link`.

## Was dieses SDK nicht übernimmt

Die Anzeige der System-Notification selbst (Title/Body/Bild) läuft über das
Betriebssystem, gesteuert durch den `notification`/`apns.alert`-Block eurer
Push-Payload – nicht über dieses SDK. Für "garantiertes" Tracking exakt beim
Anzeigen (statt beim Öffnen) wäre zusätzlich eine native Notification Service
Extension (iOS) bzw. eine Umstellung auf Data-Only-Messages (Android) nötig –
bewusst nicht Teil dieses SDKs.
