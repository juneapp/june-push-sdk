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

## Vor dem ersten Release: Platzhalter ersetzen

In jedem `packages/*/package.json` steht unter `publishConfig.registry` aktuell
ein Platzhalter (`https://YOUR-PRIVATE-REGISTRY/`) – durch eure tatsächliche
private npm-Registry-URL ersetzen (z. B. GitHub Packages, Verdaccio, o. ä.).
Der npm-Scope `@juneapp` ist eine Annahme basierend auf eurem Firmennamen –
falls euer tatsächlicher Scope anders lautet, in allen `package.json`-Dateien
(`name`-Feld und gegenseitige `dependencies`) austauschen.

Außerdem gehört in die `.npmrc` (nicht Teil dieses Repos, da meist Secrets
enthält) ein Eintrag, der den Scope auf eure Registry mappt, z. B.:

```
@juneapp:registry=https://YOUR-PRIVATE-REGISTRY/
//YOUR-PRIVATE-REGISTRY/:_authToken=${NPM_TOKEN}
```

## Setup & Build

```bash
npm install
npm run build   # baut alle Pakete (tsc) in der richtigen Reihenfolge
```

## Neue Version veröffentlichen

Am einfachsten mit [changesets](https://github.com/changesets/changesets) für
koordinierte Versionierung über mehrere Pakete hinweg (noch nicht
eingerichtet, aber empfehlenswert, sobald mehr als eine Person daran
arbeitet). Ohne changesets manuell:

```bash
# Version in packages/<paket>/package.json hochzählen, dann:
npm run build
npm publish --workspace packages/shared
npm publish --workspace packages/web
npm publish --workspace packages/react-native
```

## Was NICHT Teil der Pakete ist

Kundenspezifische Werte (Firebase-Projekt-Config, `collectToken`, `vapidKey`)
gehören nicht in die Pakete – die bleiben Sache der Kunden-App. Für Web
dokumentiert `packages/web/README.md` das Konfigurations-Muster
(`window.__JUNE_PUSH_CONFIG__`), für React Native übergibt der Kunde die
Config einfach direkt an den `JunePushSDK`-Konstruktor.
