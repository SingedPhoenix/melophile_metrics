import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count == 4 else {
  fputs("usage: generate-app-icon.swift <source-png> <png-output> <iconset-output>\n", stderr)
  exit(64)
}

let sourcePath = args[1]
let pngOutputPath = args[2]
let iconsetPath = args[3]

guard let source = NSImage(contentsOfFile: sourcePath) else {
  fputs("could not open source image: \(sourcePath)\n", stderr)
  exit(66)
}

try FileManager.default.createDirectory(
  atPath: iconsetPath,
  withIntermediateDirectories: true
)

func writePng(size: Int, to path: String) throws {
  guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: size,
    pixelsHigh: size,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    throw NSError(domain: "melophile.icon", code: 1)
  }

  rep.size = NSSize(width: size, height: size)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
  NSColor.clear.setFill()
  NSRect(x: 0, y: 0, width: size, height: size).fill()
  source.draw(
    in: NSRect(x: 0, y: 0, width: size, height: size),
    from: .zero,
    operation: .copy,
    fraction: 1.0
  )
  NSGraphicsContext.restoreGraphicsState()

  guard let data = rep.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "melophile.icon", code: 2)
  }
  try data.write(to: URL(fileURLWithPath: path))
}

try writePng(size: 1024, to: pngOutputPath)

let iconFiles: [(String, Int)] = [
  ("icon_16x16.png", 16),
  ("icon_16x16@2x.png", 32),
  ("icon_32x32.png", 32),
  ("icon_32x32@2x.png", 64),
  ("icon_128x128.png", 128),
  ("icon_128x128@2x.png", 256),
  ("icon_256x256.png", 256),
  ("icon_256x256@2x.png", 512),
  ("icon_512x512.png", 512),
  ("icon_512x512@2x.png", 1024)
]

for (filename, size) in iconFiles {
  try writePng(size: size, to: (iconsetPath as NSString).appendingPathComponent(filename))
}
