# @juneapp/push-sdk-web

Web SDK for JUNE Push Notifications (Firebase Cloud Messaging).

## Setup on the customer side

### 1. Provide the Firebase config

This file is **not** part of the package – it contains your customer-specific
Firebase credentials and must be placed by the customer themselves in the
web root (e.g. `public/junePushConfig.js`):

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

This file must be reachable both from the main document (via
`<script src="/junePushConfig.js">`) and from the service worker
(`importScripts('/junePushConfig.js')` happens automatically inside the
SDK's own service worker).

### 2. Provide a service worker

From `JunePushSw.ts` (or the compiled `dist/JunePushSw.js` in this package),
the customer builds their own `public/junePushSw.js` – either by directly
copying/bundling the file, or by re-exporting it if the build process allows
that. The path `/junePushSw.js` is fixed in the SDK.

### 3. Initialize the SDK

```ts
import { JunePushSDK } from '@juneapp/push-sdk-web';

const sdk = new JunePushSDK({});
// collectToken/vapidKey are read automatically from window.__JUNE_PUSH_CONFIG__

const token = await sdk.register();

sdk.listenToForegroundMessages((data) => {
  console.log('Foreground message:', data);
});
```

## API

- `register(): Promise<string | null>` – registers the service worker, requests permission/token, and stores the token in the backend. Uses a local cache to avoid unnecessary backend calls once registration has already succeeded.
- `getSubscriptionStatus(): "denied" | "subscribed" | "unsubscribed"` – current status without a network call, e.g. to render a subscribe/unsubscribe button.
- `unsubscribe(unsubscribeLink: string): Promise<boolean>` – unsubscribes the contact via the `data.unsubscribe_click_link` included in the message, and also unsubscribes the push token locally in the browser.
- `watchPermissionRevocation(): Promise<void>` – automatically unsubscribes when the user revokes push permission via the browser settings (uses the `unsubscribe_click_link` most recently received in a message).
- `getUnsubscribeLink(): Promise<string | null>` – the most recently cached unsubscribe link, independent of the current page load.
- `consumePendingBanner(): Promise<string | null>` – reads `banner_html` from a background message (the tab wasn't visible when it arrived) and then clears it from the cache; intended to be shown once the next time the page is opened/focused.
- `listenToForegroundMessages(callback)` – intercepts messages received in the foreground and automatically shows a browser notification (unless `disablePushNotificationInForeground: true`).
- `initWorker()` – alias for `register()`.
