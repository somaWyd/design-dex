#!/bin/bash
# DesignDex.app を作る（Intel と Apple Silicon の両方で動くユニバーサル版）。
#   bash mac/build_app.sh            → mac/build/DesignDex.app（公開データのみ同梱）
#   bash mac/build_app.sh --install  → 上に加えて /Applications に置く（同名があれば置き換え）
# 必要なもの: macOS 14 以降、Xcode Command Line Tools（xcode-select --install）、python3
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
BUILD="$HERE/build"
APP="$BUILD/DesignDex.app"
MIN_OS="14.0"

python3 "$ROOT/tools/build.py" --public

mkdir -p "$BUILD"
[ -d "$APP" ] && mv "$APP" "$BUILD/.old-$(date +%s).app"  # 前回の成果物は消さずに退避する
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
for arch in arm64 x86_64; do
  xcrun swiftc -parse-as-library -swift-version 5 -O -target "$arch-apple-macos$MIN_OS" "$HERE/DesignDex.swift" -o "$BUILD/DesignDex-$arch"
done
lipo -create "$BUILD/DesignDex-arm64" "$BUILD/DesignDex-x86_64" -output "$APP/Contents/MacOS/DesignDex"

cp "$HERE/Info.plist" "$APP/Contents/Info.plist"
cp "$HERE/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
cp -R "$HERE/en.lproj" "$HERE/ja.lproj" "$APP/Contents/Resources/"
rsync -a --exclude ".DS_Store" "$ROOT/web/" "$APP/Contents/Resources/web/"
codesign --force --sign - "$APP"  # 署名なし配布のための ad-hoc 署名（README の「初回の開き方」を参照）

python3 "$ROOT/tools/build.py" >/dev/null  # 手元の web/dist を個人データ込みに戻す
echo "OK: $APP"
if [ "${1:-}" = "--install" ]; then
  ditto "$APP" "/Applications/DesignDex.app"
  echo "OK: /Applications/DesignDex.app"
fi
