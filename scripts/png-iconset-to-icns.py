#!/usr/bin/env python3
import struct
import sys
from pathlib import Path


PNG_CHUNKS = [
    ("icp4", "icon_16x16.png"),
    ("icp5", "icon_32x32.png"),
    ("icp6", "icon_32x32@2x.png"),
    ("ic07", "icon_128x128.png"),
    ("ic08", "icon_256x256.png"),
    ("ic09", "icon_512x512.png"),
    ("ic10", "icon_512x512@2x.png"),
]


def chunk(kind, data):
    return kind.encode("ascii") + struct.pack(">I", len(data) + 8) + data


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: png-iconset-to-icns.py <iconset-dir> <output.icns>")

    iconset = Path(sys.argv[1])
    output = Path(sys.argv[2])
    chunks = []
    for kind, filename in PNG_CHUNKS:
        path = iconset / filename
        data = path.read_bytes()
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise SystemExit(f"{path} is not a PNG file")
        chunks.append(chunk(kind, data))

    body = b"".join(chunks)
    output.write_bytes(b"icns" + struct.pack(">I", len(body) + 8) + body)


if __name__ == "__main__":
    main()
