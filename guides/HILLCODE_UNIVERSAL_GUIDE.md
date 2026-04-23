# HillCode Universal Guide

**A step-by-step guide to recreate HillCode 1:1 for any Flutter project.**

> **Citron CRM (Vite + Module Federation):** a non-Flutter implementation lives in this repo — see [`instructions/CITRON_HILLCODE.md`](../instructions/CITRON_HILLCODE.md).

HillCode is a minimal, interactive Terminal User Interface (TUI) for Flutter development. It lets you run, build, and switch clients (white-label configs) without memorizing commands. This guide defines the **concept and requirements**; **implementation language (Dart, Bash, Python, Node, etc.) is up to each project.**

---

## 1. What HillCode Does

- **TUI mode**: Interactive menu to choose action + client, then run
- **CLI mode**: Non-interactive, scriptable (for CI / headless use)
- **Client selection**: Pick client when running/building (multi-tenant / white-label)
- **Inject step**: Runs `inject_client_config.sh` before build to set app name, icons, etc.
- **Platform builds**: Web, Android, iOS (with platform-specific behavior)

---

## 2. Implementation Choice

**Each project decides its own implementation:**

| Language | Pros | Cons |
|----------|------|------|
| **Bash** | No runtime, ubiquitous, simple for small TUIs | Less ergonomic for complex menus |
| **Python** | Readable, great CLI libs (click, questionary) | Requires Python on PATH |
| **Node.js** | Fits JS/TS projects, inquirer, yargs | Requires Node on PATH |
| **Dart** | Matches Flutter stack, args package | Requires Dart (Flutter brings it) |

Use whatever fits your project's stack and preferences. The rest of this guide defines the **interface and behavior**; implement it in your chosen language.

---

## 3. Project Structure

```
project_root/
├── devtools/                    # Or hillcode/, scripts/tui/, etc. – your choice
│   ├── [entrypoint]             # main.dart | main.py | hillcode.sh | index.js
│   └── [config/deps]            # pubspec.yaml, requirements.txt, package.json
├── app_name/                    # Main Flutter app (e.g. korvue_hr)
│   ├── lib/
│   ├── scripts/
│   │   ├── inject_client_config.sh
│   │   └── inject_ios_config.sh   # Optional, iOS-specific
│   └── .flutter_client           # Written by inject; gitignore it
├── build                        # Build script (calls inject + flutter build)
└── instructions/
    └── HILLCODE_UNIVERSAL_GUIDE.md
```

---

## 4. Required Interface

Whatever language you use, HillCode must support:

### TUI (interactive)

1. Clear screen, show banner: `hillcode · [PROJECT_NAME]`
2. Menu: `1 run`, `2 web`, `3 android`, `4 ios`, `q exit`
3. Prompt for client: `client (1-N):`
4. Run inject script: `scripts/inject_client_config.sh [client]`
5. Execute: `flutter run --dart-define=CLIENT=[client]` or `./build [platform] [client]`

### CLI (non-interactive)

```
./devtools/hillcode -c [client] --cmd run
./devtools/hillcode -c [client] --cmd web
./devtools/hillcode -c [client] --cmd android
./devtools/hillcode -c [client] --cmd ios
```

### Exit codes

- `0` on success
- `1` on error (unknown client, unknown cmd, inject failed, etc.)

---

## 5. Build Script & Inject Script

These are language-agnostic (Bash). See the original KorVue HR `build` and `scripts/inject_client_config.sh` for reference. They:

- Take `platform` and `client` as args
- Run inject before Flutter build
- Use `--dart-define=CLIENT=[client]` for Flutter

---

## 6. Flutter App: Multi-Client Setup

- `AppConfig.projectName = String.fromEnvironment('CLIENT', defaultValue: 'client1')`
- `ClientConfigs` for each client
- `.flutter_client` written by inject, gitignored

---

## 7. Placeholder Reference

| Placeholder | Example | Use |
|-------------|---------|-----|
| `[PROJECT_NAME]` | KorVue HR | Banner text |
| `[APP_DIR]` | korvue_hr | Flutter app directory |
| `[client1]`, `[client2]` | korvuehr, fitvue | Client IDs |
| `[Display Name 1]` | KORVUE Staff | App display name |

---

## 8. Adding New Clients

1. Add to client list in HillCode
2. Add case in `inject_client_config.sh`
3. Add config in `ClientConfigs`
4. Add asset folder and pubspec entry

---

## Appendix A: Dart Implementation (KorVue HR)

This project uses Dart. Full source in `hillcode/lib/main.dart`. Skeleton:

```dart
#!/usr/bin/env dart
/// HillCode – [PROJECT_NAME] dev TUI
/// Run, build. Client is picked when you run/build.

import 'dart:io';
import 'package:args/args.dart';
import 'package:path/path.dart' as path;

void main(List<String> args) async {
  final parser = ArgParser()
    ..addFlag('help', abbr: 'h', help: 'Show help')
    ..addOption('client', abbr: 'c', help: 'Client: [client1] | [client2]')
    ..addOption('cmd', help: 'Command: run | web | android | ios');

  try {
    final r = parser.parse(args);

    if (r['help'] as bool) {
      _help();
      exit(0);
    }

    final root = _findProjectRoot();
    if (root == null) {
      stderr.writeln('[APP_DIR] not found');
      exit(1);
    }

    final h = HillCode(root);

    if (r['cmd'] != null) {
      await h.cmd(r['cmd'] as String, r['client'] as String?);
      exit(0);
    }

    await h.tui();
  } on FormatException catch (e) {
    stderr.writeln(e.message);
    _help();
    exit(1);
  } catch (e) {
    stderr.writeln('$e');
    exit(1);
  }
}

/// Finds the Flutter app directory (containing pubspec.yaml).
/// Looks for [APP_DIR]/pubspec.yaml or pubspec.yaml in current tree.
String? _findProjectRoot() {
  var dir = Directory.current;
  while (dir.path != dir.parent.path) {
    final k = Directory(path.join(dir.path, '[APP_DIR]'));
    if (File(path.join(k.path, 'pubspec.yaml')).existsSync()) return k.path;
    if (File(path.join(dir.path, 'pubspec.yaml')).existsSync()) return dir.path;
    dir = dir.parent;
  }
  return null;
}

void _help() {
  print('''
hillcode – [PROJECT_NAME] dev tool

  dart hillcode/lib/main.dart                    # TUI
  dart hillcode/lib/main.dart -c [client1] --cmd run
  dart hillcode/lib/main.dart -c [client2] --cmd web
  dart hillcode/lib/main.dart -c [client1] --cmd android
  dart hillcode/lib/main.dart -c [client2] --cmd ios

  -c, --client   [client1] | [client2]
  --cmd          run | web | android | ios
''');
}

const _clients = ['[client1]', '[client2]'];

class HillCode {
  final String root;

  HillCode(this.root);

  String get _projRoot => path.dirname(root);

  Future<void> tui() async {
    _cls();
    _out('');
    _out('  hillcode · [PROJECT_NAME]', dim: true);
    _out('  ─────────────────────────');
    _out('');
    _out('  1  run      Start app');
    _out('  2  web      Build web → deploy/');
    _out('  3  android  Build APK → dist/');
    _out('  4  ios      Build iOS (open in Xcode)');
    _out('  q  exit');
    _out('');

    final choice = _ask('  > ').trim().toLowerCase();

    if (choice == 'q' || choice.isEmpty) exit(0);

    final client = _pickClient();
    if (client == null) return;

    switch (choice) {
      case '1':
        await _run(client);
        break;
      case '2':
        await _buildWeb(client);
        break;
      case '3':
        await _buildAndroid(client);
        break;
      case '4':
        await _buildIos(client);
        break;
      default:
        _out('  unknown', red: true);
    }

    _out('');
    _ask('  [Enter]');
    await tui();
  }

  Future<void> cmd(String c, String? client) async {
    final cl = client ?? _pickClient();
    if (cl == null) {
      stderr.writeln('client required (-c [client1] | [client2])');
      exit(1);
    }

    switch (c) {
      case 'run':
        await _run(cl);
        break;
      case 'web':
        await _buildWeb(cl);
        break;
      case 'android':
        await _buildAndroid(cl);
        break;
      case 'ios':
        await _buildIos(cl);
        break;
      default:
        stderr.writeln('unknown cmd: $c');
        exit(1);
    }
  }

  String? _pickClient() {
    _out('');
    for (var i = 0; i < _clients.length; i++) {
      _out('  ${i + 1} ${_clients[i]}');
    }
    final c = _ask('  client (1-${_clients.length}): ').trim();
    final i = int.tryParse(c);
    if (i == null || i < 1 || i > _clients.length) return null;
    return _clients[i - 1];
  }

  Future<bool> _runInject(String client) async {
    final injectScript = path.join(root, 'scripts', 'inject_client_config.sh');
    if (!File(injectScript).existsSync()) {
      _out('  inject script not found: $injectScript', red: true);
      return false;
    }
    _out('  Running inject_client_config.sh $client', dim: true);
    final r = await Process.run('bash', [injectScript, client], workingDirectory: root);
    if (r.exitCode != 0) {
      _out(r.stderr as String, red: true);
      return false;
    }
    return true;
  }

  Future<void> _run(String client) async {
    _out('');
    if (!await _runInject(client)) exit(1);
    _out('  flutter run --dart-define=CLIENT=$client', dim: true);
    _out('');
    final p = await Process.start(
      'flutter',
      ['run', '--dart-define=CLIENT=$client'],
      workingDirectory: root,
      mode: ProcessStartMode.inheritStdio,
    );
    exit(await p.exitCode);
  }

  Future<bool> _runBuild(String platform, String client) async {
    final buildScript = File(path.join(_projRoot, 'build'));
    if (!buildScript.existsSync()) {
      _out('  ./build not found (run from project root)', red: true);
      return false;
    }
    _out('  ./build $platform $client', dim: true);
    final p = await Process.run('./build', [platform, client],
        workingDirectory: _projRoot, runInShell: true);
    _out(p.stdout as String);
    if ((p.stderr as String).isNotEmpty) _out(p.stderr as String, red: true);
    return p.exitCode == 0;
  }

  Future<void> _buildWeb(String client) async {
    _out('');
    await _runBuild('web', client);
  }

  Future<void> _buildAndroid(String client) async {
    _out('');
    await _runBuild('android', client);
  }

  bool _hasIosBuild() {
    final buildDir = Directory(path.join(root, 'build', 'ios'));
    return buildDir.existsSync();
  }

  bool get _interactive => stdin.hasTerminal;

  Future<void> _buildIos(String client) async {
    _out('');
    // Add platform-specific overrides here (e.g. iOS for client1 only)
    final iosClient = client; // or override: client == 'client2' ? 'client1' : client

    if (_hasIosBuild() && _interactive) {
      _out('  iOS build already exists.', dim: true);
      final action = _ask('  Open Xcode (o) or Rebuild (r)? [o]: ').trim().toLowerCase();
      if (action != 'r' && action != 'rebuild') {
        _out('  Opening Xcode...', dim: true);
        await Process.run('open', [path.join(root, 'ios', 'Runner.xcworkspace')]);
        return;
      }
      _out('  Rebuilding...', dim: true);
    }

    await _runBuild('ios', iosClient);
  }

  void _out(String s, {bool dim = false, bool green = false, bool red = false}) {
    if (stdout.supportsAnsiEscapes && Platform.environment['NO_COLOR'] == null) {
      if (dim) stdout.write('\x1B[2m');
      if (green) stdout.write('\x1B[32m');
      if (red) stdout.write('\x1B[31m');
    }
    print(s);
    if (stdout.supportsAnsiEscapes && (dim || green || red)) stdout.write('\x1B[0m');
  }

  String _ask(String prompt) {
    stdout.write(prompt);
    return stdin.readLineSync() ?? '';
  }

  void _cls() { ... }
}
```

Full source: `hillcode/lib/main.dart` in this repo.

---

## Appendix B: Build Script (Bash)

Create `build` at project root:

```bash
#!/usr/bin/env bash
# Build [PROJECT]: web | android | ios. Client: [client1] | [client2]
set -e

CLIENT="${2:-[client1]}"
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

case "$1" in
  web)
    cd [APP_DIR] && bash scripts/inject_client_config.sh "$CLIENT" && cd ..
    # Docker or flutter build web
    flutter build web --dart-define=CLIENT="$CLIENT"
    echo "→ build/web/"
    ;;
  android)
    V=$(grep '^version:' [APP_DIR]/pubspec.yaml | sed 's/version: //' | cut -d+ -f1)
    cd [APP_DIR] && bash scripts/inject_client_config.sh "$CLIENT" && flutter pub get && flutter build apk --release --dart-define=CLIENT="$CLIENT"
    mkdir -p "$ROOT/dist"
    cp [APP_DIR]/build/app/outputs/flutter-apk/app-release.apk "$ROOT/dist/${CLIENT}-${V}.apk"
    echo "→ dist/${CLIENT}-${V}.apk"
    ;;
  ios)
    if [ -d "[APP_DIR]/build/ios" ]; then
      echo "iOS build already exists."
      [ -t 0 ] && read -p "Open Xcode (o) or Rebuild (r)? [o]: " action || action="r"
      action="${action:-o}"
      if [[ "$action" != "r" && "$action" != "rebuild" ]]; then
        open [APP_DIR]/ios/Runner.xcworkspace
        exit 0
      fi
    fi
    cd [APP_DIR] && bash scripts/inject_client_config.sh "$CLIENT" && flutter pub get && flutter build ios --release --dart-define=CLIENT="$CLIENT"
    echo "→ [APP_DIR]/ios/"
    open [APP_DIR]/ios/Runner.xcworkspace
    ;;
  *)
    echo "Usage: ./build web|android|ios [[client1]|[client2]]"
    exit 1
    ;;
esac
```

`chmod +x build`

---

## Appendix C: Inject Script (Bash)

Create `[APP_DIR]/scripts/inject_client_config.sh`:

```bash
#!/usr/bin/env bash
# Inject client config: app name, icons. Usage: ./inject_client_config.sh [client1|client2]
set -e

CLIENT="${1:-[client1]}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

case "$CLIENT" in
  [client1]) APP_NAME="[Display Name 1]" ;;
  [client2]) APP_NAME="[Display Name 2]" ;;
  *)        echo "Unknown client: $CLIENT" >&2; exit 1 ;;
esac

echo "Injecting client config: $CLIENT ($APP_NAME)"

# Persist for build phases
echo -n "$CLIENT" > "$APP_ROOT/.flutter_client"

# Android strings
ANDROID_RES="$APP_ROOT/android/app/src/main/res"
mkdir -p "$ANDROID_RES/values"
cat > "$ANDROID_RES/values/strings.xml" << EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">$APP_NAME</string>
</resources>
EOF

# Sync icons, inject iOS config, etc. (adapt to your project)
# bash "$SCRIPT_DIR/sync_icons.sh" "$CLIENT" 2>/dev/null || true
# [ "$CLIENT" = "[client1]" ] && bash "$SCRIPT_DIR/inject_ios_config.sh" "$CLIENT"

echo "Client config injected: $CLIENT"
```

`chmod +x [APP_DIR]/scripts/inject_client_config.sh`

---

## Appendix D: Flutter App Config

```dart
// lib/config/app_config.dart
class AppConfig {
  static const String projectName = String.fromEnvironment(
    'CLIENT',
    defaultValue: '[client1]',
  );
}
```

```dart
// lib/config/client_configs.dart
class ClientConfigs {
  static const client1 = ClientConfig(
    projectName: '[client1]',
    displayName: '[Display Name 1]',
    apiUrl: 'https://...',
    // ...
  );
  static const client2 = ClientConfig(/* ... */);
}
```

Add to `.gitignore`:
```
.flutter_client
build/
```

---

## 9. Usage (example: Dart)

```bash
# TUI (interactive)
dart hillcode/lib/main.dart

# CLI (headless / CI)
dart hillcode/lib/main.dart -c [client1] --cmd run
dart hillcode/lib/main.dart -c [client2] --cmd web
dart hillcode/lib/main.dart -c [client1] --cmd android
dart hillcode/lib/main.dart -c [client2] --cmd ios
```

---

## 10. Adding New Clients

1. Add to client list in your HillCode implementation.
2. Add case in `inject_client_config.sh`.
3. Add config in `lib/config/client_configs.dart`.
4. Add asset folder: `assets/images/clients/[newclient]/`.
5. Declare in `pubspec.yaml` assets.
6. Extend `AssetHelper` / `ClientConfig` if needed.

---

## 11. Optional Extensions

- **switch command**: runs inject only (persists `.flutter_client`).
- **clean / pub-get / analyze / test**: Add more menu options and `cmd` cases.
- **Platform overrides**: e.g. iOS always uses `client1` – add logic in `_buildIos`.
- **Server/Docker builds**: Separate script like `hillcode/server-run.sh` for CI.

---

## Appendix E: Ionic/Angular Adaptation (FitVue Concierge)

This project uses **Node.js** for HillCode (fits the npm/angular stack). Key adaptations:

- **Run**: `npm run start` (ng serve) instead of `flutter run`
- **Web build**: `ng build --configuration production`
- **Native**: `npx ionic cordova build android|ios`
- **Config injection**: Writes `src/environments/client-config.generated.ts` read by `ConfigService`
- **Clients**: `eastbank`, `fitvue`

```
npm run hillcode                    # TUI
npm run hillcode -c eastbank --cmd run
./build web eastbank
```

See `devtools/hillcode.js`, `scripts/inject_client_config.sh`, and `build`.

---

## 12. Checklist for New Project

- [ ] Choose implementation language (Bash, Python, Node, Dart, etc.)
- [ ] Implement HillCode meeting the interface in §4
- [ ] Create `build` script (Bash)
- [ ] Create `scripts/inject_client_config.sh` (Bash)
- [ ] Add `.flutter_client` to gitignore
- [ ] Configure `AppConfig` / `ClientConfigs` with `CLIENT` env
- [ ] Test TUI and CLI
