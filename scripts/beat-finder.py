#!/usr/bin/env python3
"""Report a music track's tempo, where its beats fall, and its energy per bar.

    python3 scripts/beat-finder.py <track.wav|mp3|mp4> [--bpm 120]

Use it on an AI-made or licensed track before cutting to it: the model lands on the asked
tempo but picks its own bar start. The script prints the tempo it hears, the offset of the
first downbeat, the level of each bar in dB, and the brightness, so the lift and the drop
show at a glance. With --bpm it skips the tempo guess and uses yours.

Needs numpy and scipy (both on this Mac). Needs ffmpeg for anything that is not a WAV.
"""
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from scipy.signal import stft

HOP_S_TARGET = 0.0116  # about 512 samples at 44.1 kHz


def load(path: Path) -> tuple[np.ndarray, int]:
    if path.suffix.lower() != ".wav":
        tmp = Path(tempfile.mkdtemp()) / "track.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", "44100", str(tmp)], check=True)
        path = tmp
    with wave.open(str(path)) as w:
        sr, ch, width, n = w.getframerate(), w.getnchannels(), w.getsampwidth(), w.getnframes()
        raw = w.readframes(n)
    dtype = {2: np.int16, 4: np.int32}[width]
    x = np.frombuffer(raw, dtype=dtype).astype(np.float64) / np.iinfo(dtype).max
    return x.reshape(-1, ch).mean(axis=1), sr


def onset_strength(x: np.ndarray, sr: int) -> tuple[np.ndarray, float]:
    f, t, z = stft(x, sr, nperseg=2048, noverlap=1536)
    mag = np.log1p(np.abs(z) * 100)
    flux = np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)
    return flux, float(t[1] - t[0])


def tempo(flux: np.ndarray, hop_s: float) -> float:
    o = flux - flux.mean()
    ac = np.correlate(o, o, "full")[len(o) - 1:]
    lags = np.arange(len(ac)) * hop_s
    ok = (lags > 60 / 180) & (lags < 60 / 70)
    return 60 / lags[ok][np.argmax(ac[ok])]


def downbeat_offset(flux: np.ndarray, hop_s: float, bpm: float) -> float:
    """The phase, within one bar, where the onsets are strongest."""
    bar_s = 4 * 60 / bpm
    best, best_score = 0.0, -1.0
    for phase in np.arange(0, bar_s, hop_s):
        times = np.arange(phase, len(flux) * hop_s, bar_s)
        idx = (times / hop_s).astype(int)
        idx = idx[idx < len(flux)]
        score = flux[idx].mean() if len(idx) else 0
        if score > best_score:
            best, best_score = float(phase), float(score)
    return best


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        return 2
    path = Path(args[0])
    if not path.exists():
        print(f"not found: {path}")
        return 2
    x, sr = load(path)
    flux, hop_s = onset_strength(x, sr)
    bpm = float(argv[argv.index("--bpm") + 1]) if "--bpm" in argv else tempo(flux, hop_s)
    offset = downbeat_offset(flux, hop_s, bpm)
    bar_s = 4 * 60 / bpm

    f, t, z = stft(x, sr, nperseg=2048, noverlap=1024)
    mag = np.abs(z)
    centroid = (f[:, None] * mag).sum(0) / (mag.sum(0) + 1e-9)

    print(f"{path.name}: {len(x) / sr:.1f} s, tempo {bpm:.1f} bpm, first downbeat at {offset:.3f} s, a bar is {bar_s:.2f} s")
    print("  bar   starts   level   brightness")
    bar = 0
    start = offset
    while start + bar_s <= len(x) / sr + 1e-6:
        seg = x[int(start * sr):int((start + bar_s) * sr)]
        level = 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9)
        sel = (t >= start) & (t < start + bar_s)
        bright = np.median(centroid[sel]) if sel.any() else 0
        marks = "#" * max(0, int((level + 40) / 2))
        print(f"  {bar + 1:3d}  {start:6.2f}  {level:6.1f}  {bright:6.0f} Hz  {marks}")
        bar += 1
        start += bar_s
    print("Cut on a bar start. A jump in level or brightness between bars is the lift or the drop.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
