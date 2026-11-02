#!/usr/bin/env python3
"""Mix an audio list into one WAV with ffmpeg: cut, position, fade, loop, duck, normalise.

    python3 scripts/mix-audio.py <audio.json> <out.wav> [--target -12] [--peak -1] [--dry-run]

The list is JSON. Every clip has a file and a start; the rest is optional:

    {
      "duration": 25,
      "clips": [
        {"name": "music", "file": "out/music.wav", "start": 0, "gain": 0},
        {"name": "dms", "file": "out/dms.wav", "start": 0, "gain": -2.5},
        {"name": "whoosh", "file": "sfx/whoosh.wav", "start": 2, "gain": -6, "fadeOut": 0.1},
        {"name": "voice", "file": "vo.wav", "start": 1, "trim": 0.2, "duration": 8},
        {"name": "bed", "file": "loop.wav", "start": 0, "duration": 25, "loop": true, "duckUnder": "voice"}
      ]
    }

Fields: name, file, start (s), trim (s skipped at the file's start), duration (s used),
gain (dB), fadeIn and fadeOut (s), loop (true to repeat up to duration), duckUnder (the
name of a clip this one drops under). Paths are relative to the JSON file.

The result is normalised to the target loudness (default -12 LUFS) with the true peak
capped (default -1.5 dBTP, so the finished AAC lands under -1), then written as 16-bit stereo WAV at 48 kHz. With --dry-run
it prints the ffmpeg command and stops.
"""
import json
import subprocess
import sys
from pathlib import Path

DUCK_THRESHOLD = 0.02   # the voice level that starts ducking
DUCK_RATIO = 6
DUCK_ATTACK_MS = 20
DUCK_RELEASE_MS = 300
SAMPLE_RATE = 48000
# The AAC encode in assemble.sh raises the true peak by about 0.3 to 0.5 dB, so the WAV
# aims lower than the -1 dBTP the finished file must meet.
DEFAULT_PEAK = -1.5


def clip_chain(clip: dict, index: int, base: Path) -> tuple[list[str], str, str]:
    """Build the input arguments and the filter for one clip. Returns (inputs, filter, label)."""
    path = base / clip["file"]
    if not path.exists():
        raise FileNotFoundError(f"clip '{clip.get('name', index)}': {path} not found")
    inputs = ["-i", str(path)]
    steps = [f"aformat=sample_rates={SAMPLE_RATE}:channel_layouts=stereo"]
    trim = float(clip.get("trim", 0))
    duration = clip.get("duration")
    if clip.get("loop"):
        if duration is None:
            raise ValueError(f"clip '{clip.get('name', index)}': loop needs a duration")
        steps.append(f"atrim=start={trim}")
        steps.append("aloop=loop=-1:size=2e9")
        steps.append(f"atrim=duration={duration}")
    elif trim or duration is not None:
        end = f":end={trim + float(duration)}" if duration is not None else ""
        steps.append(f"atrim=start={trim}{end}")
    steps.append("asetpts=PTS-STARTPTS")
    fade_in = float(clip.get("fadeIn", 0))
    fade_out = float(clip.get("fadeOut", 0))
    if fade_in:
        steps.append(f"afade=t=in:st=0:d={fade_in}")
    if fade_out:
        if duration is None:
            probe = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                capture_output=True, text=True, check=True,
            )
            duration = float(probe.stdout.strip()) - trim
        steps.append(f"afade=t=out:st={float(duration) - fade_out}:d={fade_out}")
    gain = float(clip.get("gain", 0))
    if gain:
        steps.append(f"volume={gain}dB")
    delay_ms = int(round(float(clip["start"]) * 1000))
    steps.append(f"adelay={delay_ms}|{delay_ms}")
    label = f"c{index}"
    return inputs, f"[{index}:a]{','.join(steps)}[{label}]", label


def build(spec: dict, base: Path, out: Path, target: float, peak: float) -> list[str]:
    clips = spec["clips"]
    names = {c.get("name", str(i)): i for i, c in enumerate(clips)}
    inputs: list[str] = []
    filters: list[str] = []
    labels: dict[int, str] = {}
    for i, clip in enumerate(clips):
        ins, flt, label = clip_chain(clip, i, base)
        inputs += ins
        filters.append(flt)
        labels[i] = label

    # Ducking: a clip that must drop under a voice is compressed with the voice as the key.
    # The voice label is split so it can both key the compressor and still play.
    split_count: dict[int, int] = {}
    for i, clip in enumerate(clips):
        key_name = clip.get("duckUnder")
        if not key_name:
            continue
        if key_name not in names:
            raise ValueError(f"clip '{clip.get('name', i)}': duckUnder '{key_name}' is not a clip name")
        k = names[key_name]
        split_count[k] = split_count.get(k, 0) + 1
    for k, n in split_count.items():
        outs = "".join(f"[{labels[k]}s{j}]" for j in range(n + 1))
        filters.append(f"[{labels[k]}]asplit={n + 1}{outs}")
        labels[k] = f"{labels[k]}s0"
    used: dict[int, int] = {}
    for i, clip in enumerate(clips):
        key_name = clip.get("duckUnder")
        if not key_name:
            continue
        k = names[key_name]
        used[k] = used.get(k, 0) + 1
        key_label = f"{labels[k].rsplit('s', 1)[0]}s{used[k]}"
        filters.append(
            f"[{labels[i]}][{key_label}]sidechaincompress=threshold={DUCK_THRESHOLD}:ratio={DUCK_RATIO}"
            f":attack={DUCK_ATTACK_MS}:release={DUCK_RELEASE_MS}:level_sc=1[d{i}]"
        )
        labels[i] = f"d{i}"

    mix_in = "".join(f"[{labels[i]}]" for i in range(len(clips)))
    total = spec.get("duration")
    tail = f",atrim=duration={total}" if total is not None else ""
    filters.append(
        f"{mix_in}amix=inputs={len(clips)}:normalize=0:duration=longest{tail},"
        f"loudnorm=I={target}:TP={peak}:LRA=11:linear=true[mix]"
    )
    return [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
        "-filter_complex", ";".join(filters), "-map", "[mix]",
        "-ar", str(SAMPLE_RATE), "-c:a", "pcm_s16le", str(out),
    ]


def main(argv: list[str]) -> int:
    # Values of --target and --peak are negative numbers, so they must not count as paths.
    target = float(argv[argv.index("--target") + 1]) if "--target" in argv else -12.0
    peak = float(argv[argv.index("--peak") + 1]) if "--peak" in argv else DEFAULT_PEAK
    skip = {argv.index(flag) + 1 for flag in ("--target", "--peak") if flag in argv}
    args = [a for i, a in enumerate(argv) if i > 0 and i not in skip and not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 2
    spec_path, out = Path(args[0]), Path(args[1])
    spec = json.loads(spec_path.read_text())
    if "clips" not in spec or not spec["clips"]:
        print(f"{spec_path}: no clips")
        return 2
    try:
        cmd = build(spec, spec_path.parent, out, target, peak)
    except (FileNotFoundError, ValueError, KeyError) as e:
        print(f"audio list error: {e}")
        return 1
    if "--dry-run" in argv:
        print(" ".join(f"'{c}'" if " " in c or ";" in c else c for c in cmd))
        return 0
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("ffmpeg failed:")
        print(result.stderr.strip())
        return 1
    print(f"Wrote {out}: {len(spec['clips'])} clips, normalised to {target} LUFS, peak {peak} dBTP")
    print("Measure it with scripts/loudness.sh. loudnorm in one pass can land a little off target.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
