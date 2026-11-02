#!/usr/bin/env python3
"""Lay frames side by side in one image, labelled, for checking cuts and pacing.

    python3 scripts/contact-sheet.py <out.png> <frame.png> <frame.png> ...
    python3 scripts/contact-sheet.py <out.png> --video <video.mp4> --at 0,3.97,4,9.97,10
    python3 scripts/contact-sheet.py <out.png> --dir <frames-dir> [--columns 8]

With PNGs, each one becomes a tile. With --video and --at, it pulls a frame at each time
in seconds. With --dir, it tiles every PNG in the folder (use capture.js --every 0.5 first).
Tiles wrap after --columns (default 6). Each tile carries its file name or time.

Needs Pillow. Needs ffmpeg for --video.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

TILE = (360, 450)
GAP = 8
LABEL_H = 20


def pull_frame(video: Path, seconds: float, out: Path) -> Path:
    target = out / f"t{seconds:07.3f}.png"
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", str(seconds), "-i", str(video), "-frames:v", "1", str(target)],
        check=True,
    )
    return target


def tile(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGB")
    im.thumbnail(TILE)
    d = ImageDraw.Draw(im)
    label = path.stem
    d.rectangle((0, 0, 8 + 7 * len(label), LABEL_H - 2), fill=(255, 235, 0))
    d.text((4, 3), label, fill=(0, 0, 0))
    return im


def sheet(paths: list[Path], columns: int) -> Image.Image:
    tiles = [tile(p) for p in paths]
    w = max(t.width for t in tiles)
    h = max(t.height for t in tiles)
    rows = (len(tiles) + columns - 1) // columns
    cols = min(columns, len(tiles))
    out = Image.new("RGB", (cols * w + (cols - 1) * GAP, rows * h + (rows - 1) * GAP), (60, 60, 60))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % columns) * (w + GAP), (i // columns) * (h + GAP)))
    return out


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 2
    out = Path(argv[1])
    args = argv[2:]
    columns = 6
    if "--columns" in args:
        i = args.index("--columns")
        columns = int(args[i + 1])
        args = args[:i] + args[i + 2:]
    with tempfile.TemporaryDirectory() as tmp:
        if args and args[0] == "--video":
            video = Path(args[1])
            if "--at" not in args:
                print("--video needs --at with comma-separated seconds")
                return 2
            times = [float(t) for t in args[args.index("--at") + 1].split(",")]
            paths = [pull_frame(video, t, Path(tmp)) for t in times]
        elif args and args[0] == "--dir":
            paths = sorted(Path(args[1]).glob("*.png"))
        else:
            paths = [Path(a) for a in args]
        if not paths:
            print("no frames given")
            return 2
        sheet(paths, columns).save(out)
    print(f"Wrote {out}: {len(paths)} frames, {min(columns, len(paths))} per row")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
