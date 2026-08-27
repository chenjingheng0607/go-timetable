# go-timetable — Auto-Roster

Cross-platform timetable / roster manager built with **Wails v3 `v3.0.0-beta.14`**, **Go 1.27**, **React 18**, **TypeScript 5.5+** and **Vite 5.4**.

Parses instructor availability Excel sheets, generates draft rosters with burnout-aware scheduling, and exports to Excel / PNG / JSON. Runs identically on Linux desktop and Android (scoped-storage aware, touch-optimized).

---

## Supported Platforms

| Platform | Target | Status |
|---|---|---|
| **Linux Desktop** | `x86_64` (GTK4 / WebKitGTK 6.0) | ✅ Production `bin/go-timetable` |
| **Android** | API 24+ (Android 7.0) • `compileSdk 35` • `targetSdk 35` • NDK `26.3.11579264` | ✅ `bin/go-timetable.apk` (arm64) & `bin/go-timetable.aab` (Play Bundle) |
| Windows / macOS | via Wails v3 cross-compile | Scaffold present (`build/windows/`, `build/darwin/`) |

---

## Key Features

- **Auto timetable parsing** — reads `Name` / `Instrument` / `FPH` / `Week*` columns from `Aug Unavailability.xlsx` (or any matching sheet), extracts Life-Group cleanup groups, builds `AvailabilityMap`.
- **Mobile-optimized touch responsive grid** — 44px tap targets, `touch-action: manipulation`, safe-area insets (`env(safe-area-inset-*)`), `-webkit-overflow-scrolling: touch`, horizontal `overflow-x: auto` for 18-column roster, responsive `Dashboard` category columns.
- **Draft generation** — burnout + consecutive-week penalties, shuffled candidates, band-mode inference (`FULL BAND` / `ACOUSTIC SET` / `INCOMPLETE`).
- **`.ics` / Excel calendar export** — `ExportExcel` writes `roster.xlsx` with `Week` + `Band Mode` + roles (via `excelize/v2` pure Go, no CGO).
- **Base64 image export to `/Download/`** — `useImageExport` clones DOM + `html2canvas` at `scale:2`, `ExportImage(base64)` saves `roster_YYYYMMDD_HHMM.png` to `/storage/emulated/0/Download/` on Android (fallback `UserCacheDir` `/data/user/0/com.example.gotimetable/cache/`) and triggers `am broadcast MEDIA_SCANNER_SCAN_FILE` so image appears instantly in Gallery / Files. Desktop uses native `SaveFileDialog`.
- **Cross-device `.json` state sync via `/Download/`** — `SaveState` writes `roster_state.json` to Download on Android (desktop via dialog), `LoadFile`/`LoadState` resolve `content://` SAF URIs (Wails copies to cache) and fall back to `Download/<basename>` for transferred files; `RoleCat` / `CategoryConfig` / `Themes` round-trip.

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Go** | `1.27+` (`go 1.27` in `go.mod`) | `go version` |
| **Node.js** | `20+` (tested 26.8) / npm 12 | `node --version && npm --version` |
| **Wails v3 CLI** | `v3.0.0-beta.14` | `go install github.com/wailsapp/wails/v3/cmd/wails3@latest` |
| **OpenJDK** | `21` (`JAVA_HOME=/home/linuxbrew/.linuxbrew/opt/openjdk@21` or `/usr/lib/jvm/java-21-openjdk-amd64`) | `java -version` — Gradle 9.2.1 + AGP 8.7.3 require 21 (26 → major 70 unsupported) |
| **Android SDK** | API 35 (`platforms;android-35` `build-tools;35.0.0`), NDK `26.3.11579264`, `platform-tools` (adb), `emulator`, `system-images;android-35;google_apis;x86_64` | `sdkmanager --list_installed` — `ANDROID_HOME` / `ANDROID_SDK_ROOT` → SDK root, `PATH` must include `platform-tools`, `build-tools/35.0.0`, `cmdline-tools/latest/bin`, `ndk/26.3.11579264` |
| **Linux desktop deps** | `gtk4` `webkitgtk-6.0` `pkg-config` | `wails3 doctor` — optional for headless CI |

Verify:

```bash
go version # go1.27.0
wails3 doctor # SUCCESS
java -version # openjdk 21.0.12
sdkmanager --list_installed # build-tools;35.0.0, platforms;android-35, ndk;26.3.11579264, platform-tools, emulator
```

Environment (add to `~/.bashrc`):

```bash
export JAVA_HOME=/home/linuxbrew/.linuxbrew/opt/openjdk@21
export ANDROID_HOME=$HOME   # or $HOME/Android/Sdk — wherever sdkmanager lives
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/35.0.0:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/ndk/26.3.11579264:$ANDROID_HOME/emulator
```

---

## Build & Package

All tasks are defined in `Taskfile.yml` (`build/` includes per-platform `Taskfile.yml`). `wails.json` (v2) is kept for reference; v3 uses `build/config.yml` (`productIdentifier: com.example.gotimetable`).

```bash
# 1. Frontend production assets (also invoked by Go builds)
npx vite build          # → frontend/dist/ (index.html viewport-fit=cover)

# 2. Native Linux binary (GTK4)
wails3 task linux:build # → bin/go-timetable (ELF 64-bit, stripped, -tags production -trimpath -ldflags="-w -s")
# alias: wails3 build -platform linux

# 3. Android release APK (arm64 default, covers 99% devices)
wails3 task android:package        # → bin/go-timetable.apk (23M, sdkVersion 24, targetSdk 35, compileSdk 35, lib/arm64-v8a/libwails.so)
wails3 task android:package:fat    # universal arm64+x86_64
# alias: wails3 build -platform android

# 4. Android App Bundle (Play Store)
wails3 task android:bundle         # → bin/go-timetable.aab (13M)
wails3 task android:bundle:fat

# 5. Hot-reload dev (desktop + Android WebView)
wails3 dev                         # Vite on :9245 (Taskfile VITE_PORT), Go --tags debug
# Android live: wails3 task android:run (emulator) / android:run:device (USB)
adb reverse tcp:5173 tcp:5173      # or tcp:9245 per VITE_PORT — proxies Vite HMR into WebView
adb devices && adb install -r bin/go-timetable.apk
```

Artifacts are ignored by `.gitignore` (`bin/`, `*.apk`, `*.aab`, `*.so`, `.gradle/`, `app/build/`, `overlay.json`, `node_modules/`, `frontend/dist/`, `.task/`). Rebuild cleanly after `rm -rf bin/`.

---

## Project Structure

```
.
├── main.go                # application.New(Options{ Services: NewService(NewApp()), Assets: AssetFileServerFS })
├── app.go                 # App service: LoadFile/SaveState/LoadState/GenerateDraft/ClearSelections/ExportExcel/ExportImage + Android SAF/sandbox (Download → cache fallback, timestamped roster_*.png + media scan)
├── helpers.go             # excelize, saveBase64PNG, isContentURI, writeToDialogPath (MkdirAll, SEAndroid guard)
├── config.go / engine.go  # RoleCat, CategoryConfig, RosterEngine (burnout, availability)
├── frontend/
│   ├── index.html         # viewport-fit=cover
│   ├── vite.config.ts     # server.host 0.0.0.0:5173
│   ├── tsconfig.json      # include: ["src","bindings"], skipLibCheck
│   ├── bindings/          # wails3 generate bindings -ts (app.ts, models.ts)
│   └── src/
│       ├── App.tsx        # useRosterActions + useImageExport (go removed)
│       ├── App.css/style.css # 44px, touch-action:manipulation, safe-area, -webkit-overflow-scrolling
│       ├── hooks/useRosterActions.ts # LoadFile/SaveState/GenerateDraft/ClearSelections + console.error + Download toast
│       └── hooks/useImageExport.ts   # html2canvas → ExportImage(base64) → Download/roster_*.png
├── build/
│   ├── config.yml         # info.productIdentifier com.example.gotimetable
│   ├── Taskfile.yml       # common: generate:bindings, build:frontend
│   └── android/           # gradle 9.2.1 / AGP 8.7.3, compileSdk 35, minSdk 24, ndkVersion 26.3.11579264, usesCleartextTraffic, configChanges screenLayout
└── Taskfile.yml           # includes android, linux, windows, darwin, ios
```

---

## Android Notes

- **Save dialogs unsupported** (`dialogs_android.go:111`): `SaveState`/`ExportExcel`/`ExportImage` bypass `Dialog.SaveFile()` when `GOOS==android` and write directly to `sandboxSavePath` → `/storage/emulated/0/Download/` (test `.wails_write_test`, then `UserCacheDir` `/data/user/0/.../cache`, then explicit fallback). `saveBase64PNG` also guards `strings.HasPrefix(path,"/data/local/tmp")` → redirect to cache.
- **Open dialogs** use SAF: Wails copies picked document to app cache and returns real fs path; `resolveFilePath` rejects stray `content://` and falls back to `Download/<basename>` for cross-device JSON.
- **Permissions** `build/android/app/src/main/AndroidManifest.xml`: `WRITE_EXTERNAL_STORAGE`/`READ_EXTERNAL_STORAGE` (maxSdk 32) + `READ_MEDIA_IMAGES/VIDEO`, `usesCleartextTraffic="true"` for `0.0.0.0:5173`, `configChanges="orientation|screenSize|keyboardHidden|screenLayout"` to avoid WebView recreate on rotation.
- **Emulator**: `system-images;android-35;google_apis;x86_64` + `avdmanager create avd --name wails --device pixel_7`; KVM (`/dev/kvm`) required for hardware accel (`emulator -accel-check`).

---

## Development

```bash
wails3 generate bindings -ts  # after Go service changes → frontend/bindings/
npx tsc --noEmit && npx vite build # typecheck + production frontend
GOOS=windows CGO_ENABLED=0 go test -run TestLoadFile -v # roster parsing without GTK
```

---

## License

MIT — see `LICENSE` (if present).
