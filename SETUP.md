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

The skill takes its brand rules from the `brand:core` skill and never stores its own copy. Make sure `brand:core` is installed. `reference/brand.md` lists what to take from it.

The fonts and logos come from the Gorgias brand kit. In Gorgias tools the kit sits at the address `/brand/`, and video pages use that same address. On this computer, the capture and the preview serve `/brand/` from one folder:

- **Where it goes:** `~/gorgias-brand/` by default. To keep it somewhere else, set `GORGIAS_BRAND_KIT` to that folder's path.
- **How it is laid out:** exactly like `/brand/` in Gorgias tools. `/brand/2026/fonts/InterVariable.woff2` is read from `~/gorgias-brand/2026/fonts/InterVariable.woff2`, and `/brand/primary-logo-white.svg` from `~/gorgias-brand/primary-logo-white.svg`.
- **Where to get it:** the brand team owns the kit and decides how people get it.

Keep one brand kit folder per computer, outside any video project and outside this skill. Every video reads from it, so a brand update reaches every video on its next render. If a video asks for a file the folder does not have, the capture stops and names the file.

## 4. Check that it works

Copy the starter template and render it. `examples/starter/README.md` has the steps. A finished `out/master.mp4` means every part is in place.
