"""
Check a mix by measurement, for when nobody can listen yet. Each check prints numbers and
what to aim for. It has caught a muddy first mix, a drop quieter than its build, and
interface sounds buried under the music.

    python3 scripts/audio-check.py balance <mix.wav> [<reference.wav> ...]
    python3 scripts/audio-check.py bars <mix.wav> [--bar 2]
    python3 scripts/audio-check.py drops <mix.wav> --at 6,22,34
    python3 scripts/audio-check.py gap <mix.wav> --from 21.75 --to 22
    python3 scripts/audio-check.py width <mix.wav> [<reference.wav> ...]

balance  Share of the total power in eight bands, in dB. Compare against a reference track
         the brief points to; within about 2 dB per band reads as the same tonal balance.
bars     Loudness per bar (default 2 s, 120 BPM). Builds should rise, drops should jump.
drops    Loudness of the first second after each drop against the second before it.
         A drop should come out at least 1 dB louder than its build.
gap      The peak inside a planned silence. Anything above -60 dBFS leaks.
width    Correlation and side level per band. The low band should be mono; above 600 Hz a
         correlation near 0.3 to 0.5 reads as wide.

Needs numpy and scipy. Loudness uses an approximate K-weighting, close enough to compare
sections and versions; use loudness.sh for the delivery number.
"""
import sys
from typing import List

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal


def load(path: str) -> tuple:
    sr, x = wavfile.read(path)
    x = x.astype(np.float64)
    if np.abs(x).max() > 1.5:
        x = x / 32768
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    return sr, x


def kweight(x: np.ndarray, sr: int) -> np.ndarray:
    b1, a1 = signal.iirfilter(2, 1681 / (sr / 2), btype="highpass", ftype="butter")
    shelf = x + 0.585 * signal.lfilter(b1, a1, x, axis=0)
    b2, a2 = signal.butter(2, 38 / (sr / 2), "highpass")
    return signal.lfilter(b2, a2, shelf, axis=0)


def loudness(x: np.ndarray, sr: int, t0: float, t1: float) -> float:
    seg = kweight(x[int(t0 * sr):int(t1 * sr)], sr)
    return -0.691 + 10 * np.log10((seg ** 2).sum(1).mean() + 1e-12)


def option(argv: List[str], name: str, default: object = None) -> object:
    return argv[argv.index(name) + 1] if name in argv else default


def paths(argv: List[str]) -> List[str]:
    skip = {argv.index(f) + 1 for f in ("--bar", "--at", "--from", "--to") if f in argv}
    return [a for i, a in enumerate(argv) if i not in skip and not a.startswith("--")]


BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 2000), (2000, 6000), (6000, 12000), (12000, 18000)]


def balance(files: List[str]) -> None:
    print("Share of total power per band, dB. Within about 2 dB of the reference reads as the same balance.")
    print(" " * 22 + "".join(f"{lo}-{hi}".rjust(12) for lo, hi in BANDS))
    for p in files:
        sr, x = load(p)
        f, P = signal.welch(x.mean(1), sr, nperseg=8192)
        total = P.sum()
        row = [10 * np.log10(P[(f >= lo) & (f < hi)].sum() / total + 1e-12) for lo, hi in BANDS]
        print(p.split("/")[-1][:22].ljust(22) + "".join(f"{v:12.1f}" for v in row))


def bars(p: str, bar: float) -> None:
    sr, x = load(p)
    n = int(len(x) / sr / bar)
    print(f"Loudness per bar of {bar} s. Builds should rise into each drop; drops should jump.")
    for i in range(n):
        l = loudness(x, sr, i * bar, (i + 1) * bar)
        print(f"bar {i + 1:2d}  {i * bar:5.1f} s  {l:6.1f} LUFS  " + "#" * max(0, int(l + 40)))


def drops(p: str, times: List[float]) -> None:
    sr, x = load(p)
    print("Each drop against the second before it. Aim for the drop at least 1 dB louder.")
    for t in times:
        before, after = loudness(x, sr, t - 1, t), loudness(x, sr, t, t + 1)
        verdict = "ok" if after - before >= 1 else "weak: the build is as loud as the drop"
        print(f"{t:6.2f} s  before {before:6.1f}  drop {after:6.1f}  difference {after - before:+5.1f} dB  {verdict}")


def gap(p: str, t0: float, t1: float) -> None:
    sr, x = load(p)
    seg = x[int(t0 * sr):int(t1 * sr)]
    peak = 20 * np.log10(np.abs(seg).max() + 1e-12)
    print(f"Gap {t0}-{t1} s: peak {peak:.1f} dBFS. " + ("Silent." if peak < -60 else "Leaks: silence every stem, reverb tails included."))


def width(files: List[str]) -> None:
    print("Correlation and side level per band. Low band mono; above 600 Hz, 0.3 to 0.5 reads as wide.")
    for p in files:
        sr, x = load(p)
        row = []
        for lo, hi in [(30, 150), (150, 600), (600, 3000), (3000, 12000)]:
            b, a = signal.butter(4, [lo / (sr / 2), hi / (sr / 2)], "band")
            y = signal.filtfilt(b, a, x, axis=0)
            corr = np.corrcoef(y[:, 0], y[:, 1])[0, 1] if np.std(y[:, 0] - y[:, 1]) > 1e-9 else 1.0
            diff = ((y[:, 0] - y[:, 1]) ** 2).sum()
            side = f"{10 * np.log10(diff / ((y[:, 0] + y[:, 1]) ** 2).sum()):6.1f}" if diff > 1e-12 else "  mono"
            row.append(f"{lo}-{hi} Hz corr {corr:4.2f} side {side}")
        print(p.split("/")[-1][:22].ljust(22) + " | ".join(row))


def main(argv: List[str]) -> int:
    if len(argv) < 3:
        print(__doc__)
        return 1
    mode, rest = argv[1], argv[2:]
    files = paths(rest)
    if mode == "balance":
        balance(files)
    elif mode == "bars":
        bars(files[0], float(option(rest, "--bar", 2)))
    elif mode == "drops":
        drops(files[0], [float(t) for t in option(rest, "--at").split(",")])
    elif mode == "gap":
        gap(files[0], float(option(rest, "--from")), float(option(rest, "--to")))
    elif mode == "width":
        width(files)
    else:
        print(__doc__)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
