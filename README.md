# june-push-sdk

Monorepo für die June Push SDKs. Ein Repo, mehrere npm-Pakete (npm Workspaces),
damit die gemeinsamen Typen/Konventionen zwischen Web und React Native nicht
auseinanderlaufen.

## Struktur

```
packages/
  shared/          @juneapp/push-sdk-shared       – gemeinsame TS-Interfaces
  web/             @juneapp/push-sdk-web          – Browser-SDK (Firebase JS SDK)
  react-native/    @juneapp/push-sdk-react-native – React-Native-SDK (@react-native-firebase)
```

`shared` enthält **nur Typen** (keine Laufzeit-Logik) – `JunePushConfig` und
`JunePushMessageData`. Beide anderen Pakete hängen davon ab.

## Setup & Build

```bash
npm install
npm run build   # baut alle Pakete (tsc) in der richtigen Reihenfolge
```

