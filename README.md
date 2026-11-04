# gorgias-video

A Claude Code skill that makes Gorgias videos from brief to finished file. Claude writes the script and the beat sheet, builds the video as a web page, makes the music in code, photographs the page frame by frame, checks the result and exports it. Every tool it uses is free and open source.

This file covers everything needed to run the skill: what to install, how to check it works, how to make a video and what to do when something fails. The brand fonts and logos are the one thing it does not include. The brand team shares those separately.

## What you need

- **A Mac with Homebrew.** On Linux, install the same tools with the system's package manager.
- **Claude Code.**
- **Access to this repo.**
- **Access to the `context-factory` plugin** (`gorgias/context-factory` on GitHub). Step 4 installs Cortex's brand skills from it.
- **The Gorgias brand kit,** shared by the brand team. Step 5 below says where it goes.

## Set it up

Do these steps once per computer. They take about ten minutes. The commands were checked on 2026-11-04.

### 1. Install the tools

```sh
brew install ffmpeg node gifsicle
pip3 install numpy scipy pillow
```

| Tool | What the skill uses it for |
|---|---|
| ffmpeg | Joins the frames and the sound into a video, measures loudness, makes light copies and GIFs |
| Node 22.6 or newer | Runs the capture script, the preview and the music generator |
| Python 3 with numpy, scipy and Pillow | Runs the checks on frames and sound |
| gifsicle | Shrinks GIFs |

Check the versions with `ffmpeg -version`, `node --version` and `python3 -c "import numpy, scipy, PIL"`. Node must say 22.6 or higher.

### 2. Install the skill

Claude Code finds skills in `~/.claude/skills/`. Clone this repo there:

```sh
git clone https://github.com/murillo-gorgias/gorgias-video.git ~/.claude/skills/gorgias-video
```

To keep the clone somewhere else, link it into that folder instead: `ln -s /path/to/gorgias-video ~/.claude/skills/gorgias-video`. The scripts expect to find the skill at `~/.claude/skills/gorgias-video`. If it sits anywhere else, set `GORGIAS_VIDEO_SKILL` to its path.

### 3. Install the browser that photographs each frame

The capture script drives its own copy of Chromium through Playwright. Install both inside the skill's `scripts/` folder:

```sh
cd ~/.claude/skills/gorgias-video/scripts
npm i
npx playwright install chromium
```

### 4. Install the brand rules

The skill reads its colour, type and logo rules from the `brand:core` skill, which comes with the Gorgias brand plugin. In Claude Code, type:

```
/plugin marketplace add gorgias/context-factory
/plugin install brand@gorgias
```

Restart Claude Code afterwards.

### 5. Put the brand kit in place

The brand kit holds the fonts and logos. The brand team shares it separately. Video pages ask for these files at the address `/brand/`, the same address every Gorgias tool uses. On your computer, the skill serves that address from one folder:

- **Where it goes:** `~/gorgias-brand/`. To keep it somewhere else, set `GORGIAS_BRAND_KIT` to that folder's path.
- **How it is laid out:** exactly like `/brand/` in Gorgias tools. `/brand/2026/fonts/InterVariable.woff2` is read from `~/gorgias-brand/2026/fonts/InterVariable.woff2`.
- **What the starter video needs at least:**

  ```
  ~/gorgias-brand/
    primary-logo-white.svg
    2026/
      orbit-dark.svg
      fonts/
        FeatureDeck-Regular-Web.woff2
        InterVariable.woff2
        RedHatMono-VF.woff2
  ```

Keep one brand kit folder per computer, outside any video project and outside this skill. Never copy brand files into a project or into this repo. When the kit changes, replace the folder, and every video uses the new files on its next render.

### 6. Optional: captions from a voice recording

Install Whisper only if your videos have a voiceover: `pip3 install -U openai-whisper`.

### 7. Check that it works

Render the starter video, a 16-second example that uses every part of the skill. It takes about a minute.

```sh
SKILL=~/.claude/skills/gorgias-video
cp -R $SKILL/examples/starter ~/Desktop/starter-test
cd ~/Desktop/starter-test
cp $SKILL/scripts/page/runtime.js .
npm run score
node $SKILL/scripts/capture.js index.html out/frames
$SKILL/scripts/assemble.sh out/frames 30 out/mix.wav out/video.mp4
open out/video.mp4
```

A video that plays with music and shows the Gorgias logo at the end means every part is in place. If a command fails, read "When something goes wrong" below. Delete `~/Desktop/starter-test` afterwards.

## Make a video

Make an empty folder for the video, open Claude Code in it, and ask for the video you want.

**Share high-fidelity designs and flows for better results.** Give Claude the screens and steps the video should show, as Figma links or as images. Claude then rebuilds those designs in the video. Without them, it invents generic interfaces. Figma links need the Figma plugin in Claude Code. Images work without it.

Example requests:

- "Use the gorgias-video skill to make a 20-second LinkedIn video about our new order tracking."
- "Make an animated GIF for an email header that shows AI Agent answering a question."
- "Turn this brief into a beat sheet for a 30-second YouTube video." Then paste the brief.

Claude follows the workflow in `SKILL.md`:

1. It asks where the video will run and in what format.
2. It writes a script and a beat sheet: what each scene says, and the second it lands. Approve the beat sheet before it builds anything.
3. It copies the starter, rebuilds it as your video and shows you single frames and a contact sheet to check.
4. It writes the music and the interface sounds, and measures them. Claude cannot listen, so it tells you when nobody has heard the sound yet. Listen before you share.
5. It renders the full video, checks every frame and the loudness, and exports the format the channel needs.

**Watch the video in a browser while it is being built.** Run `npm run preview` in the video's folder and open http://127.0.0.1:8787/?play. Click once to start the sound. Add `?frame=120` to see one frame. The preview can drop frames on heavy scenes. Judge the rendered file, never the preview.

**Collect notes on exact frames.** The skill has a review page where people pause the video and pin notes to a frame. Claude reads the notes and makes the changes. Ask Claude to set it up, or follow `review/README.md`.

## When something goes wrong

| What you see | What to do |
|---|---|
| `Playwright is not installed` | Run step 3. |
| `Could not start Chromium` | Run `npx playwright install chromium` in the skill's `scripts/` folder. |
| `The brand kit folder ... does not have:` or `There is no brand kit folder` | The message lists the missing files. Add them to the brand kit folder (step 5), or set `GORGIAS_BRAND_KIT` to the folder that has them. |
| `frame N was not ready after 20 s. Still loading: ...` | Something on the page never finished loading. The message names it. Ask Claude to fix it. |
| `Port 8787 is busy` | Another preview is running. Stop it, or run `node <skill>/scripts/preview.js . --port 8788`. |
| `npm run score` says `Cannot find module` with a path ending in `scripts/synth/dsp.ts` | The skill is not at `~/.claude/skills/gorgias-video`. Set `GORGIAS_VIDEO_SKILL` to its path (step 2). |
| The preview shows a plain system font and no logo | The folder is being served some other way, such as `python3 -m http.server`. Use `npm run preview`. |
| Claude does not seem to know the skill | Check that `~/.claude/skills/gorgias-video/SKILL.md` exists, then restart Claude Code. |

## What is in this repo

- `SKILL.md`: the workflow. Claude reads this first.
- `reference/`: one file per step, with the craft and brand rules.
- `reference/tools/capture-pipeline.md`: how a video is built as a web page and photographed frame by frame.
- `scripts/`: the repeatable jobs as ffmpeg, Python and Node scripts: capture, preview, music, mixing, checks and exports. `scripts/README.md` lists each one.
- `examples/starter/`: the starter video. Copy it for each new video.
- `review/`: the review page for notes pinned to exact frames.
