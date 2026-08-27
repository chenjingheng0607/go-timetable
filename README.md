# go-timetable — Auto-Roster

Cross-platform timetable / roster manager built with **Wails v3 `v3.0.0-beta.14`**, **Go 1.27**, **React 18**, **TypeScript 5.5+** and **Vite 5.4**.

Parses instructor availability Excel sheets, generates burnout-aware draft rosters, and exports to Excel / PNG / JSON. Runs identically on Linux desktop and Android (scoped-storage aware, touch-optimized).

---

## Prerequisites

All versions below were **verified on 2026-08-27** on Ubuntu 26.04 (amd64, fresh `git clone` on `dev` branch). `wails3 doctor` → `SUCCESS / Your system is ready`.

| Tool | Required version | Verify command | Notes |
|---|---|---|---|
| **Go** | `1.27+` (`go 1.27` in `go.mod`) | `go version` → `go1.27.0` | |
| **Node.js** | `20+` (tested `24.19.0` / npm `11.17.0`) | `node --version && npm --version` | Any `20+` works |
| **Wails v3 CLI** | `v3.0.0-beta.14` | `wails3 version` | `go install github.com/wailsapp/wails/v3/cmd/wails3@latest` — ensure `$(go env GOPATH)/bin` (`~/go/bin`) is on `PATH` |
| **OpenJDK** | `21` only | `java -version` → `openjdk 21.0.12` | Gradle **9.2.1** + AGP **8.7.3** require JDK 21. **JDK 26 fails** with `Unsupported class file major version 70` |
| **Android SDK** | API 35 (`platforms;android-35`, `build-tools;34.0.0` auto-provisioned as `35.0.0` if present), NDK `26.3.11579264`, `platform-tools`, `cmdline-tools` | `sdkmanager --list_installed` | `ANDROID_HOME` → SDK root. NDK at `$ANDROID_HOME/ndk/26.3.11579264` |
| **Linux desktop deps** | `gtk4`, `webkitgtk-6.0`, `pkg-config`, `gcc` | `wails3 doctor` | `sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev pkg-config gcc` — optional for headless CI / Android-only builds |
| **Task** | `3.x` (embedded via Wails) | `wails3 task --list` | No separate install needed; Wails vendors `go-task` |

> **Android SDK location note (verified):** On this fresh machine `ANDROID_HOME=/home/cjh` because the SDK is installed at `~/` directly (`~/cmdline-tools`, `~/ndk`, `~/platform-tools`, `~/platforms`, `~/build-tools`). The **standard** location is `~/Android/Sdk`. Both work — `build/android/Taskfile.yml` resolves it as `${ANDROID_HOME:-${ANDROID_SDK_ROOT:-~/Android/Sdk}}` (macOS fallback `~/Library/Android/sdk`). Set whichever matches your install.

---

## First-Time Setup

After a fresh clone — exact commands verified:

```bash
git clone <repo-url> go-timetable
cd go-timetable
git checkout dev          # if not already on dev

# 1. Frontend dependencies (also run automatically by wails tasks)
cd frontend && npm install && cd ..
# verified: added 74 packages, 2 vulnerabilities (moderate/high) — non-blocking

# 2. Frontend production build (standalone check)
cd frontend && npx vite build && cd ..
# verified: vite v5.4.21 built in ~880ms → frontend/dist/
# canonical task also does type-check: npm run build  (= tsc && vite build)

# 3. Go module sync
go mod tidy
# verified: no diff on go.mod/go.sum (idempotent)

# 4. (Optional) Regenerate Wails bindings after Go service changes
wails3 generate bindings -ts -clean=true
# verified: Processed 287 Packages, 1 Service, 9 Methods, 6 Models → frontend/bindings/
```

---

## Environment Variables

Add to `~/.bashrc` (or `~/.zshrc`) and `source` it. Verified values for this machine:

```bash
# Java — Gradle 9.2.1 requires JDK 21. Use the absolute path, not the symlink.
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
# On Homebrew systems: /home/linuxbrew/.linuxbrew/opt/openjdk@21

# Android SDK — point to wherever sdkmanager lives
export ANDROID_HOME=$HOME              # this machine: SDK at ~/
# Standard install: export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME  # legacy alias, kept for compatibility
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264  # optional; auto-detected from $ANDROID_HOME/ndk/*

export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/ndk/26.3.11579264
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$(go env GOPATH)/bin  # for wails3 binary

# Verify
java -version                          # openjdk 21
sdkmanager --list_installed            # build-tools;34.0.0, platforms;android-35, ndk;26.3.11579264, platform-tools
wails3 doctor                          # SUCCESS — No issues found
echo $JAVA_HOME $ANDROID_HOME
```

> **Without `JAVA_HOME`:** Gradle still found `java` via `PATH` (`/usr/bin/java` → `/usr/lib/jvm/java-21-openjdk-amd64/bin/java`) and built successfully. Setting `JAVA_HOME` explicitly is recommended for reproducibility and for tools that require it.

> **Missing SDK components:** If `platforms;android-35` or `build-tools` are not installed, `wails3 task android:package` auto-provisions them via Gradle on first run (verified: Gradle downloaded `build-tools 34.0.0` and `platforms android-35 rev 2` after accepting licenses). To pre-install manually:
> ```bash
> sdkmanager --install "platforms;android-35" "build-tools;35.0.0" "ndk;26.3.11579264" "platform-tools" "emulator" "system-images;android-35;google_apis;x86_64"
> sdkmanager --licenses  # accept all
> ```

---

## Verified Build Commands

All tasks are defined in `Taskfile.yml` (includes per-platform `Taskfile.yml` under `build/`). `build/config.yml` sets `productIdentifier: com.example.gotimetable`.

| Command | Output | Verified size / type |
|---|---|---|
| `wails3 task android:package` | `bin/go-timetable.apk` | **23 MB** — `Android package (APK)`, `arm64-v8a/libwails.so` (18 MB) — covers 99% of devices |
| `wails3 task android:package:fat` | `bin/go-timetable.apk` (universal) | `arm64-v8a` + `x86_64` — also builds `libwails.so` for `x86_64` |
| `wails3 task android:bundle` | `bin/go-timetable.aab` | **13 MB** — `Zip archive` (Play Store bundle) |
| `wails3 task android:bundle:fat` | `bin/go-timetable.aab` (universal) | Universal AAB |
| `wails3 task linux:build` | `bin/go-timetable` | **13 MB** — `ELF 64-bit LSB executable, x86-64, stripped` |
| `wails3 task windows:build` | `bin/go-timetable.exe` | **13 MB** — `PE32+ executable for MS Windows 10.00 (GUI), x86-64` |
| `wails3 dev` | Live dev server | Vite on `:9245` (Taskfile `VITE_PORT`) + Go `--tags debug` |

### Run each build (exact output from fresh clone)

```bash
# Android release APK (default arm64)
wails3 task android:package
# → bin/go-timetable.apk  (23M, sdkVersion 24, targetSdk 35, compileSdk 35)

# Android App Bundle (Play Store)
wails3 task android:bundle
# → bin/go-timetable.aab  (13M)

# Linux desktop (requires gtk4/webkitgtk-6.0 on host)
wails3 task linux:build
# → bin/go-timetable  (ELF, stripped, -tags production -trimpath -ldflags="-w -s")

# Windows cross-compile from Linux (CGO_ENABLED=0, no Docker needed)
wails3 task windows:build
# → bin/go-timetable.exe  (PE32+, -ldflags="-w -s -H windowsgui")

# Check outputs
ls -lh bin/ && file bin/*
# bin/go-timetable:     ELF 64-bit LSB executable, x86-64
# bin/go-timetable.aab: Zip archive data
# bin/go-timetable.apk: Android package (APK)
# bin/go-timetable.exe: PE32+ executable for MS Windows 10.00 (GUI), x86-64

# Hot-reload dev (desktop + Android WebView)
wails3 dev
# Vite on :9245 (Taskfile VITE_PORT), Go --tags debug

# Android live streaming — proxy Vite HMR into WebView
# vite.config.ts hardcodes 5173, Taskfile defaults to 9245 — use whichever port Vite actually binds to:
adb reverse tcp:5173 tcp:5173   # if Vite shows 5173
# or
adb reverse tcp:9245 tcp:9245   # if wails3 dev shows 9245
adb devices
adb install -r bin/go-timetable.apk
# Emulator / device helpers:
wails3 task android:run              # build + install + launch in emulator
wails3 task android:run:device       # build + install + launch on USB device (arm64)
wails3 task android:device:list      # adb devices -l
```

> **Gradle first-run:** Expect a one-time download of `gradle-9.2.1-bin.zip` (~100 MB) and SDK components if missing. Subsequent builds are ~2–3 s (`BUILD SUCCESSFUL in 2s, 45 tasks` for AAB).

### Artifacts are gitignored

`bin/`, `*.apk`, `*.aab`, `*.so`, `.gradle/`, `app/build/`, `overlay.json`, `node_modules/`, `frontend/dist/`, `.task/` are in `.gitignore`. Rebuild cleanly after `rm -rf bin/ build/android/app/build build/android/.gradle`.

---

## Project Structure

```
.
├── main.go                # application.New(Options{ Services: NewService(NewApp()), Assets: AssetFileServerFS })
├── app.go                 # App service: LoadFile/SaveState/LoadState/GenerateDraft/ClearSelections/ExportExcel/ExportImage
├── helpers.go             # excelize, saveBase64PNG, isContentURI, writeToDialogPath
├── config.go / engine.go  # RoleCat, CategoryConfig, RosterEngine (burnout, availability)
├── frontend/
│   ├── index.html         # viewport-fit=cover
│   ├── vite.config.ts     # server.host 0.0.0.0:5173 (Taskfile dev port is 9245 via --port)
│   ├── tsconfig.json      # include: ["src","bindings"]
│   ├── bindings/          # wails3 generate bindings -ts (app.ts, models.ts) — committed
│   └── src/
│       ├── App.tsx
│       ├── hooks/useRosterActions.ts
│       └── hooks/useImageExport.ts  # html2canvas scale:2 → ExportImage(base64)
├── build/
│   ├── config.yml         # info.productIdentifier com.example.gotimetable
│   ├── Taskfile.yml       # common: generate:bindings, build:frontend
│   ├── android/           # gradle 9.2.1 / AGP 8.7.3, compileSdk 35, minSdk 24, ndkVersion 26.3.11579264
│   ├── linux/             # native CGO build (gtk4/webkitgtk-6.0)
│   ├── windows/           # syso + PE cross-compile
│   └── darwin/ / ios/
└── Taskfile.yml           # includes android, linux, windows, darwin, ios; VITE_PORT 9245
```

---

## Troubleshooting

### 1. `Unsupported class file major version 70` / Gradle fails with Java

**Cause:** JDK 26 (or any JDK >21) — Gradle 9.2.1 + AGP 8.7.3 only support JDK 21.
```
java -version  # if shows 26.x → wrong
```
**Fix:**
```bash
sudo apt install openjdk-21-jdk
sudo update-alternatives --config java   # select java-21
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
java -version  # must show 21.0.x
./build/android/gradlew --stop  # kill daemon that cached old JDK
wails3 task android:package
```

### 2. `Android NDK not found` / `jni.h: No such file or directory`

**Cause:** `ANDROID_NDK_HOME` unset and no NDK under `$ANDROID_HOME/ndk/*`, or NDK not installed.
```
sdkmanager --list_installed  # check ndk;26.3.11579264 present
ls $ANDROID_HOME/ndk/26.3.11579264/toolchains/llvm/prebuilt/linux-x86_64/bin/aarch64-linux-android24-clang
```
**Fix:**
```bash
sdkmanager --install "ndk;26.3.11579264"
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.3.11579264
# or just ensure ANDROID_HOME is correct — Taskfile auto-picks newest ndk/*
```

### 3. `SDK XML versions up to 3 but SDK XML file of version 4 was encountered`

**Cause:** `cmdline-tools` newer than Gradle's expected SDK XML schema. **Harmless warning** — observed on every verified Android build; APK/AAB still produced correctly. No fix needed. Update `cmdline-tools` or suppress with `android.suppressUnsupportedSdkXmlVersionWarning` if desired.

### 4. Bindings missing / `Could not resolve "./bindings/..."` / stale frontend after Go changes

**Cause:** Forgot to regenerate bindings after editing Go services (`app.go`, `config.go`, etc.).
**Fix:**
```bash
wails3 generate bindings -ts -clean=true
# or
wails3 generate bindings -ts -f '-tags android' -clean=true  # Android-specific
npm run build   # tsc && vite build — type-checks bindings
```
Verified warnings `jni.h: No such file or directory` and `cannot use _Ctype_size_t` during `wails3 generate bindings -f '-tags production,android ...'` are **expected** (CGO headers absent during binding generation) and do not affect output.

### 5. `frontend/dist` missing or Vite build fails

```bash
cd frontend && npm install && npx tsc --noEmit && npx vite build && cd ..
# or
wails3 task common:build:frontend  # does install + bindings + vite build
```

### 6. Linux build fails: `gtk4` / `webkitgtk-6.0` / `pkg-config` not found

```bash
wails3 doctor  # shows missing deps
sudo apt install libgtk-4-dev libwebkitgtk-6.0-dev pkg-config gcc
wails3 task linux:build
# Headless CI: skip linux:build — Android/Windows do not need GTK
```

### 7. `adb reverse` / HMR not reaching Android WebView

`vite.config.ts` hardcodes `port: 5173` but `Taskfile.yml` defaults `VITE_PORT=9245` (`wails3 dev -port 9245`). Check which port Vite actually prints on startup, then reverse that exact port:
```bash
adb reverse tcp:5173 tcp:5173   # or 9245
adb reverse --list
# Ensure usesCleartextTraffic="true" is in AndroidManifest.xml (verified present)
```

### 8. `No .so files available to package in the APK for x86_64`

Informational — default `android:package` only builds `arm64-v8a/libwails.so`. Use `wails3 task android:package:fat` for universal APK with both ABIs.

### 9. `go mod tidy` shows diff or `go mod tidy` race

Run `go mod tidy` once; second run should be no-op (verified idempotent). If concurrent `wails3 task` invocations corrupt `go.mod`, the Taskfile uses `run: once` for `go:mod:tidy` — avoid running parallel `go mod tidy` manually.

---

## Development

```bash
wails3 generate bindings -ts              # after Go service changes → frontend/bindings/
npx tsc --noEmit && npx vite build        # typecheck + production frontend
GOOS=windows CGO_ENABLED=0 go test -run TestLoadFile -v  # roster parsing without GTK
wails3 task android:logs                  # adb logcat filtered to app
wails3 doctor                             # full toolchain diagnosis
```

---

## License

MIT — see `LICENSE` (if present).
