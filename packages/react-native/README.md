# @juneapp/push-sdk-react-native

React Native SDK for JUNE Push Notifications (`@react-native-firebase/messaging`).

## Prerequisites on the customer side

The customer needs to:

1. Create a Firebase project and register the app there.
2. Add `GoogleService-Info.plist` (iOS) or `google-services.json` (Android)
   to the native project.
3. Install `@react-native-firebase/app` and `@react-native-firebase/messaging`
   (peer dependencies of this package) and run `pod install` / a Gradle
   sync.
4. On iOS: enable the Push Notifications capability and add an APNs key in
   the Firebase console (in practice this is usually the part with the most
   setup effort – see the official
   [@react-native-firebase/messaging docs](https://rnfirebase.io/messaging/usage)).

This SDK takes over from the point where Firebase has been initialized in the app.

## Usage

```ts
import { JunePushSDK } from '@juneapp/push-sdk-react-native';

const sdk = new JunePushSDK({
  collectToken: 'YOUR_COLLECT_TOKEN', // same value as in the web integration
  apiBaseUrl: 'https://YOUR-BACKEND-URL', // required, no default value
});

// e.g. in an onboarding screen
const token = await sdk.register();

// e.g. once, at the app root
useEffect(() => {
  const unsubscribeForeground = sdk.listenToForegroundMessages((data) => {
    if (data.banner_html) {
      // show your own in-app banner using data.banner_html
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

- `register(): Promise<string | null>` – requests permission, gets an FCM token, stores the token in the backend.
- `unsubscribe(unsubscribeLink: string): Promise<boolean>` – unsubscribes the contact via the `data.unsubscribe_click_link` included in the message, and also unsubscribes the FCM token locally.
- `watchPermissionRevocation(): () => void` – checks, every time the app comes to the foreground, whether push has been disabled for the app, and if so automatically unsubscribes via the most recently known `unsubscribe_click_link`. Returns a function to remove the listener.
- `registerBackgroundHandler(): void` – must be called at module scope in `index.js`, before `AppRegistry.registerComponent()` (a requirement of `@react-native-firebase/messaging`). Caches `unsubscribe_click_link` and `banner_html` from messages that arrive while the app is backgrounded or terminated.
- `consumePendingBanner(): Promise<string | null>` – reads `banner_html` from a background message and then clears it from the cache; intended to be shown once the next time the app comes to the foreground.
- `listenToForegroundMessages(callback)` – intercepts messages received in the foreground (app is open). Automatically fires open tracking.
- `listenToNotificationOpen(callback?)` – intercepts taps on the system notification (from the background or a cold start). Fires open tracking and automatically opens `tracking_click_link`.

## What this SDK doesn't handle

Rendering the system notification itself (title/body/image) is handled by
the operating system, driven by the `notification`/`apns.alert` block of
your push payload – not by this SDK. "Guaranteed" tracking exactly at
display time (rather than at open time) would additionally require a
native Notification Service Extension (iOS) or a switch to data-only
messages (Android) – deliberately not part of this SDK.
