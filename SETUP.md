# Setup

Run these steps once per computer before the first video. Each step says what it is for. The commands assume a Mac with Homebrew. On Linux, use the system's package manager for the same tools.

## 1. The tools

| Tool | What it does in the skill | Install |
|---|---|---|
| ffmpeg | Joins frames and sound, measures loudness, makes light copies and GIFs | `brew install ffmpeg` |
| Node 22.6 or newer | Runs the capture script and the music generator | `brew install node` |
| Python 3 with numpy, scipy and Pillow | Runs the checks: frames, contact sheets, sound measurements | `pip3 install numpy scipy pillow` |
| gifsicle | Shrinks GIFs | `brew install gifsicle` |
| Whisper (optional) | Writes captions from a voice recording | `pip3 install -U openai-whisper` |

Check the versions with `ffmpeg -version`, `node --version` and `python3 -c "import numpy, scipy, PIL"`.

## 2. The browser that photographs each frame

The capture script drives its own copy of Chromium through Playwright. Install both inside the skill's `scripts/` folder:

```
cd <skill>/scripts
npm i
npx playwright install chromium
```

`<skill>` is the folder that holds this file. In Claude Code it is usually `~/.claude/skills/gorgias-video`.

## 3. The brand

The skill reads colours, fonts and logos from the `brand:core` skill and never stores its own copy. Make sure `brand:core` is installed. `reference/brand.md` lists what to take from it.

## 4. Check that it works

Copy the starter template and render it. `examples/starter/README.md` has the steps. A finished `out/master.mp4` means every part is in place.
