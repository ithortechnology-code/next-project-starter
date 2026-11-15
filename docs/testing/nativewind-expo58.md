# NativeWind on Expo 58 compatibility spike

Status: Task 4 compatibility spike complete. Broader component checks remain assigned to Task 5 and the auth UI tasks. Historical worktree isolation was not established by the recorded evidence.

Decision: NativeWind 4 is the selected mobile styling approach. Build and type compatibility passed; iOS and Android simulator/emulator layout and spacing rendering passed. The probe does not yet cover component colors, interaction states, accessibility, or keyboard behavior; verify those with the auth UI on iOS; Android runtime review is optional under the current project quick-check rule.

## Versions

- Expo 58.0.25, React Native 0.88.1, React 19.3.0 (unchanged).
- NativeWind 4.2.7 with app-local Tailwind CSS 3.4.17.
- Expo-selected Reanimated 4.7.1, Worklets 0.13.0, safe-area-context 5.11.1.
- Web retains Tailwind CSS 4 independently.

## Evidence

`npm run build --workspace=@starter/mobile` successfully exports Hermes bundles for iOS and Android. Workspace lint and typecheck pass. After reconciling the workspace installation, npm reports six advisories (two low, four moderate). `expo install --check` reports dependencies up to date, but warns that validation is unreliable offline.

The existing mobile content container now uses `flex-1 justify-center p-7` instead of its equivalent StyleSheet declaration. Babel and Metro use the NativeWind v4 configuration. Expo remains on SDK 58.

## Observed failure and fix

The first typecheck failed with TS2882 because TypeScript could not resolve the side-effect import of `global.css`. Adding a CSS module declaration alongside the NativeWind type reference fixed it; workspace typecheck now passes.

## Runtime checks and remaining work

The iOS 26.5 starter verification simulator successfully opened the app in Expo Go and rendered the NativeWind layout/spacing probe. Metro reported no NativeWind or Worklets errors; it emitted ImageBackground and SafeAreaView deprecation warnings. The screen displayed an API connection failure because the API was unavailable, independently of styling. Android API 36.1 (Medium_Phone_API_36.1) also rendered the probe successfully using Expo Go 58.0.5. Metro emitted the same deprecation warnings and no NativeWind/Worklets errors. The emulator was closed after verification. The probe checks layout and spacing only; it does not establish component colors, pressed/disabled states, accessibility behavior, or keyboard/focus behavior. During auth UI implementation, check those on iOS and confirm there are no Reanimated/Worklets runtime errors. Bundling alone does not establish correct rendering or native dependency behavior.

Run `npm run dev:mobile` and open it in an SDK 58 compatible runtime. If native packages require it, use a development build. Test physical devices with a reachable `EXPO_PUBLIC_API_URL`, not the host computer's localhost address.

## References

- [NativeWind v4 installation](https://www.nativewind.dev/docs/getting-started/installation)
- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)

The official NativeWind v4.2.7 installation guide explicitly adds Expo SDK 57 support. It does not claim SDK 58 support. This local spike checked the newer pinned Expo 58 stack without downgrading Expo; the iOS and Android rendering evidence is for layout and spacing only. No incompatibility has yet justified switching libraries. The `expo install --check` result reported dependencies up to date but warned that validation was unreliable offline, so it is not recorded as a reliable compatibility-check pass.

A root `npm install` was needed after Expo dependency installation to reconcile Tailwind v3 (mobile) and v4 (web). Before reconciliation the web build failed with an undefined `All` error from Tailwind. The web Webpack build compiles successfully after reconciliation; default Turbopack remains blocked by the environment port-binding restriction.

Android startup initially failed while ADB was offline and the package service was still booting. Waiting for `sys.boot_completed=1` resolved this. Expo then replaced the emulator’s Expo Go 54.0.7 with 58.0.5. Opening Metro through `10.0.2.2:8100` launched the probe. The API still used localhost:4000 and displayed its connection error; Android API requests need the host bridge address or a reachable LAN URL.
