# App Icon

`melophile-metrics.png` is the canonical 1024px app icon source used at runtime.

`melophile-metrics.icns` is the macOS app icon asset for packaged builds.

Regenerate the icon assets from a square source image:

```sh
swift scripts/generate-app-icon.swift source.png assets/app-icon/melophile-metrics.png /tmp/melophile.iconset
python3 scripts/png-iconset-to-icns.py /tmp/melophile.iconset assets/app-icon/melophile-metrics.icns
```

Build the local macOS app bundle after updating the icon:

```sh
npm run build:mac
```
