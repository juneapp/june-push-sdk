import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import esbuild from 'rollup-plugin-esbuild';

/**
 * Baut zwei vollständig eigenständige Browser-Bundles (Firebase inklusive)
 * statt der reinen tsc-Ausgabe - so lassen sich beide Dateien direkt per
 * <script src="..."> bzw. importScripts() einbinden, ganz ohne eigenen
 * Bundler beim Kunden. Die .d.ts-Dateien für npm/TypeScript-Konsumenten
 * werden weiterhin separat per `tsc --emitDeclarationOnly` erzeugt (siehe
 * package.json "build"-Script) - dieselbe dist/JunePushSDK.js dient damit
 * sowohl als npm "main"-Entry als auch als direkt einbindbare Datei.
 *
 * Bewusste Konsequenz: Firebase wird in JunePushSDK.js mit eingebündelt
 * (keine peerDependency mehr). Kunden, die in derselben Seite noch eine
 * eigene, separate Firebase-Instanz für andere Zwecke laden, bekommen dann
 * zwei unabhängige Firebase-Kopien - das ist für die hier gewählte
 * "komplett eigenständig" Variante ein akzeptierter Trade-off.
 */
const shared = {
  plugins: [
    nodeResolve({ browser: true }),
    commonjs(),
    esbuild({ target: 'es2020' }),
  ],
  onwarn(warning, warn) {
    // THIS_IS_UNDEFINED kommt von Firebase-internem UMD-Interop-Code -
    // harmlos, betrifft nicht unseren eigenen Code.
    if (warning.code === 'THIS_IS_UNDEFINED') return;
    warn(warning);
  },
};

export default [
  {
    ...shared,
    input: 'src/JunePushSDK.ts',
    output: {
      file: 'dist/JunePushSDK.js',
      format: 'umd',
      name: 'JunePushSDKModule',
      sourcemap: true,
    },
  },
  {
    ...shared,
    input: 'src/JunePushSw.ts',
    output: {
      file: 'dist/JunePushSw.js',
      format: 'iife',
      sourcemap: true,
    },
  },
];
