#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_APP="$ROOT_DIR/node_modules/electron/dist/Electron.app"
DIST_DIR="$ROOT_DIR/dist"
APP_NAME="melophile metrics"
APP_BUNDLE="$DIST_DIR/$APP_NAME.app"
APP_RESOURCES="$APP_BUNDLE/Contents/Resources"
APP_DIR="$APP_RESOURCES/app"
EXECUTABLE="$APP_BUNDLE/Contents/MacOS/$APP_NAME"
SOURCE_EXECUTABLE="$APP_BUNDLE/Contents/MacOS/Electron"
PLIST="$APP_BUNDLE/Contents/Info.plist"
ICON_SOURCE="$ROOT_DIR/assets/app-icon/melophile-metrics.icns"
ICON_TARGET="$APP_RESOURCES/melophile-metrics.icns"

if [[ ! -d "$SOURCE_APP" ]]; then
  echo "Electron.app was not found. Run npm install first." >&2
  exit 1
fi

rm -rf "$APP_BUNDLE"
mkdir -p "$DIST_DIR"
cp -R "$SOURCE_APP" "$APP_BUNDLE"

if [[ -f "$SOURCE_EXECUTABLE" ]]; then
  mv "$SOURCE_EXECUTABLE" "$EXECUTABLE"
fi

cp "$ICON_SOURCE" "$ICON_TARGET"

rm -rf "$APP_DIR"
mkdir -p "$APP_DIR"

rsync -a \
  --exclude '.git' \
  --exclude 'dist' \
  --exclude 'node_modules/electron/dist' \
  --exclude 'private' \
  --exclude 'exports' \
  --exclude '*.local.json' \
  --exclude '.env' \
  --exclude '.env.*' \
  "$ROOT_DIR/" "$APP_DIR/"

/usr/libexec/PlistBuddy -c "Set :CFBundleName $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable $APP_NAME" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.singedphoenix.melophilemetrics" "$PLIST"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile melophile-metrics.icns" "$PLIST"

xattr -cr "$APP_BUNDLE" || true

echo "$APP_BUNDLE"
