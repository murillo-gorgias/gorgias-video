"""
How far each interface sound stands out over the music around it. For each time given, the
peak of the interface stem in a 30 ms window against the music's RMS in the same window.

    python3 scripts/sfx-prominence.py <music.wav> <ui.wav> --gain 1.5 --at 9,9.25,10.75
    python3 scripts/sfx-prominence.py <music.wav> <ui.wav> --gain 1.5 --typing 6.5-8.8,14.5-15.8

--gain is the interface stem's level against the music in the final mix (the MIX.ui value
when both stems are written at the same peak). --typing reports the median key peak over a
stretch of typing.

What reads well, from scores that passed a listening review:
  checks and "connected" moments   +1 to +4 dB    calm, present, never a feature
  reveals (messages, chips, cards)  +2 to +8 dB    soft plucks
  clicks and sends                  +4 to +8 dB
  typing                            +2 to +4 dB median
In a quiet intro the numbers run high because the music is near silent; judge those by ear.

Needs numpy and scipy.
"""
import sys
from typing import List

import numpy as np
import scipy.io.wavfile as wavfile


def load(path: str) -> tuple:
    sr, x = wavfile.read(path)
    x = x.astype(np.float64)
    if np.abs(x).max() > 1.5:
        x = x / 32768
    return sr, (x.mean(1) if x.ndim == 2 else x)


def main(argv: List[str]) -> int:
    if len(argv) < 4:
        print(__doc__)
        return 1
    sr, music = load(argv[1])
    _, ui = load(argv[2])
    gain = float(argv[argv.index("--gain") + 1]) if "--gain" in argv else 1.0
    ui = ui * gain
    win = int(0.03 * sr)
    if "--at" in argv:
        for t in [float(v) for v in argv[argv.index("--at") + 1].split(",")]:
            a = int(t * sr)
            peak = np.abs(ui[a:a + win]).max()
            rms = np.sqrt((music[a:a + win] ** 2).mean())
            print(f"{t:7.3f} s  interface peak over music {20 * np.log10(peak / (rms + 1e-12) + 1e-12):+5.1f} dB")
    if "--typing" in argv:
        for span in argv[argv.index("--typing") + 1].split(","):
            t0, t1 = (float(v) for v in span.split("-"))
            seg_u, seg_m = ui[int(t0 * sr):int(t1 * sr)], music[int(t0 * sr):int(t1 * sr)]
            ratios = []
            for i in range(0, len(seg_u) - win, win):
                peak = np.abs(seg_u[i:i + win]).max()
                if peak > 0.02:
                    ratios.append(20 * np.log10(peak / (np.sqrt((seg_m[i:i + win] ** 2).mean()) + 1e-12)))
            print(f"typing {t0}-{t1} s  median key peak over music {np.median(ratios):+5.1f} dB  ({len(ratios)} windows)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
