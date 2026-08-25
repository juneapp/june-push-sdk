# june-push-sdk

SDKs for JUNE Push Notifications – for Web and React Native.

## Purpose

Anyone sending push notifications through JUNE needs a consistent way on
the client side to register push tokens, handle incoming messages, and
report interactions (open, click, unsubscribe) back to the backend. That's
exactly what these SDKs take care of – for Web (Firebase Cloud Messaging in
the browser) and React Native (`@react-native-firebase`) – using the same
configuration and data structure, so both platforms behave and feel as
similar as possible.

## Features

- **Token registration**: request permission, get an FCM token, and store
  it in the JUNE backend (`register()`).
- **Tracking happens automatically**: open and click tracking, without the
  integrating app having to implement it itself.
- **Unsubscribe**: unsubscribes the contact and the local push token via
  the `unsubscribe_click_link` included in every message (`unsubscribe()`).
- **Automatic unsubscribe on permission revocation**: detects when users
  disable push in their system/browser settings and unsubscribes on their
  behalf (`watchPermissionRevocation()`).
- **Foreground messages**: a browser notification (Web) or a callback for
  an in-app banner (React Native) via `listenToForegroundMessages()`.
- **Background messages (React Native)**: `registerBackgroundHandler()`
  caches the banner content and unsubscribe link even from messages that
  arrive while the app is backgrounded or terminated;
  `consumePendingBanner()` shows it once, the next time the app opens.
- **Status check without a network call (Web)**: `getSubscriptionStatus()`
  immediately returns "denied" / "subscribed" / "unsubscribed", e.g. to
  decide between a subscribe and an unsubscribe button.
- **Shared data contract**: `@juneapp/push-sdk-shared` provides the
  TypeScript types for configuration and message format, so Web and React
  Native speak the same contract with the backend.

What the SDKs deliberately **don't** handle: rendering the system
notification itself (that's the operating system's job, driven by the
`notification`/`apns.alert` block of the push payload), and customer-specific
values such as the Firebase project config or `collectToken` – those remain
the integrating app's responsibility.

Setup and the full API per platform:
[`packages/web/README.md`](packages/web/README.md) ·
[`packages/react-native/README.md`](packages/react-native/README.md).

## Structure

```
packages/
  shared/          @juneapp/push-sdk-shared       – shared TS interfaces
  web/             @juneapp/push-sdk-web          – browser SDK (Firebase JS SDK)
  react-native/    @juneapp/push-sdk-react-native – React Native SDK (@react-native-firebase)
```

`shared` contains **types only** (no runtime logic) – `JunePushConfig` and
`JunePushMessageData`. Both other packages depend on it.

## Setup & Build

```bash
npm install
npm run build   # builds all packages (tsc) in the right order
```
