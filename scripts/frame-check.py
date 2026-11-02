#!/usr/bin/env python3
"""Find frames that were not ready when captured: duplicates in a row, near-blank frames, glitches.

    python3 scripts/frame-check.py <frames-dir | video.mp4>
    python3 scripts/frame-check.py --diff a.png b.png      how different two frames are

For a folder it reads the PNGs capture.js wrote. For a video it extracts every frame at
a quarter size first. It prints each flagged frame with the reason, and a summary.
Exit code 1 when anything is flagged, so a build script can stop on it.

Needs numpy and Pillow (both on this Mac). Needs ffmpeg for video input.
"""
import hashlib
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

BLANK_STD = 4.0        # a frame whose pixels barely vary from their mean is blank
GLITCH_DIFF = 60.0     # mean absolute difference that counts as a jump
THUMB = (270, 338)     # compare on small copies: fast, and tolerant of grain


def load(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    im.thumbnail(THUMB)
    return np.asarray(im, dtype=np.float32)


def frames_from_video(video: Path, out: Path) -> list[Path]:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-vf", "scale=iw/4:-1", str(out / "f%05d.png")],
        check=True,
    )
    return sorted(out.glob("f*.png"))


def diff(a: np.ndarray, b: np.ndarray) -> float:
    if a.shape != b.shape:
        return 255.0
    return float(np.abs(a - b).mean())


def report_run(run: list[str]) -> None:
    """Print a run of consecutive identical frames as one line."""
    if len(run) == 1:
        print(f"  {run[0]}: identical to the previous frame")
    else:
        print(f"  {run[0]} to {run[-1]}: {len(run)} frames identical to the one before them")


def check(paths: list[Path]) -> int:
    flagged = 0
    prev = None
    prev_hash = None
    prev_diff = None
    same_run: list[str] = []
    for p in paths:
        img = load(p)
        h = hashlib.md5(img.tobytes()).hexdigest()
        reasons = []
        if img.std() < BLANK_STD:
            reasons.append(f"near-blank (mean {img.mean():.0f}, spread {img.std():.1f})")
        d = diff(prev, img) if prev is not None else None
        if prev_diff is not None and d is not None and d > GLITCH_DIFF and prev_diff > GLITCH_DIFF:
            reasons.append(f"differs from both neighbours ({prev_diff:.0f} / {d:.0f})")
        if prev_hash is not None and h == prev_hash:
            same_run.append(p.name)
            flagged += 1
        elif same_run:
            report_run(same_run)
            same_run = []
        if reasons:
            flagged += 1
            print(f"  {p.name}: {'; '.join(reasons)}")
        prev, prev_hash, prev_diff = img, h, d
    if same_run:
        report_run(same_run)
    return flagged


def main(argv: list[str]) -> int:
    if len(argv) == 4 and argv[1] == "--diff":
        a, b = load(Path(argv[2])), load(Path(argv[3]))
        d = diff(a, b)
        print(f"mean difference {d:.2f} of 255 ({'same' if d < 1 else 'different'})")
        return 0
    if len(argv) != 2:
        print(__doc__)
        return 2
    src = Path(argv[1])
    with tempfile.TemporaryDirectory() as tmp:
        if src.is_dir():
            paths = sorted(src.glob("f*.png"))
        elif src.is_file():
            paths = frames_from_video(src, Path(tmp))
        else:
            print(f"not found: {src}")
            return 2
        if not paths:
            print(f"no frames in {src}")
            return 2
        print(f"Checking {len(paths)} frames from {src}")
        flagged = check(paths)
    if flagged:
        print(f"{flagged} frame{'s' if flagged != 1 else ''} flagged. A deliberate freeze or flash is fine; anything else was not ready.")
        return 1
    print("No duplicates, blanks or glitches.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
