# Brief to beat sheet

A video starts as a brief, becomes a script, then becomes a beat sheet. The beat sheet is the one document the picture, the sound and the checks all read. Write it before any animation.

## Step 1: ask three things before writing

1. **Where will it run?** The channel decides the format, the length and the file type. `export.md` holds the channel table. Ask even when the brief seems obvious.
2. **What is the one thing the viewer must take away?** One sentence. Every scene serves it or goes.
3. **What is the tone?** Plain, punchy, playful, calm. Name it in one line, such as "punchy and provocative, with a wink", and keep it in the beat sheet.

Then read the brief for anything it fixes: copy that is signed off, assets that must appear, a date, a call to action.

## Step 2: the script

Write what appears on screen, scene by scene, as the viewer reads it. A line per scene, in order. Headlines, sublines, labels, counters, chat messages.

- **Say one thing per scene.** A scene that says two things is two scenes.
- **The first line earns the rest.** Social viewers decide in two seconds. Open on the problem or the surprise, never on a logo.
- **Fewer words than feels safe.** A headline is five words or fewer on a phone. Supporting lines are a sentence.
- **Close with one action.** One sticker, one tag, one logo. No lists at the end.
- **Mark placeholder copy.** Names, numbers and replies that nobody signed off get a note in the beat sheet.

## Step 3: the beat grid

Pick a tempo before placing anything. The music, the cuts and every sound effect sit on this grid.

- **One tempo for the whole video.** 120 beats per minute is a good default: a beat is 0.5 s, a bar is 2 s.
- **Every scene is a whole number of bars.** A cut off the bar lands off the beat and feels wrong even to viewers who cannot say why.
- **Every cut lands on a downbeat.** The first beat of a bar.
- **Sound events sit on beats or on simple fractions of a beat.** Halves, quarters, eighths. A ping at 3.37 s sounds random; at 3.375 s it sounds placed.
- **The video's length is the sum of its scenes plus an optional tail** for the last chord to ring out. At 120 BPM, 12 bars plus a 1 s tail make 25 s.

## Step 4: the beat sheet

One table. Each row is a scene. Columns: time range, bars, scene name, what the viewer sees, the words on screen, what they hear. `examples/starter/STORYBOARD.md` is the model.

| Time | Bars | Scene | What you see | On screen | Sound |
|---|---|---|---|---|---|
| 0:00–0:04 | 1–2 | Hook | A giant unread badge counts up on each beat, then the camera pulls back. | "Can't keep up / with your DMs?" | Kick and a rising ping per count. |

Then a second list, the timing file: every moment a sound depends on, in seconds from the start of its scene. Badge counts, card landings, flashes, flips, chats, the final hit. This list is the single source of truth for sound and picture. The animation reads it. The music generator reads it. Nothing else may hold a copy of these numbers.

```
hook:   steps [0, 0.5, 1, 1.5], reveal 2
flood:  phone [0, 1, 1.5], storm 2, shouts [3, 3.5, 4, 4.5, 5, 5.5]
```

Purely visual timings, such as how long a headline takes to settle, stay in the scene. They do not go in the timing file.

## Step 4b: mark the moments that get a build

List every moment on screen that matters: scene changes, clicks, sends, a card landing, the close. Mark each one in the beat sheet as a **big build** (a scene change: 8 to 16 beats of riser, a roll that speeds up, the track thinning, then a drop), a **small lift** (a click or a send: a short fill and a reversed crash), or nothing. The build ends exactly on the moment's time in the timing file. Without builds, reviewers find the music flat. `sound.md` says how to build each kind.

## Step 5: pace the read

- **Give people time to read the first thing before speeding up.** Hold the first message at least 1.6 s. Reviewers often ask for a second more than the first draft gives.
- **Speed up as the story speeds up.** Cards every 0.25 s, then every 0.125 s, then three at once.
- **Stop dead once, at most.** A silence or a freeze before the turn, for about a quarter of a second.
- **Hold the last frame.** The final card stays long enough to read the call to action twice.

## Step 5b: shorten by whole bars, never by speeding up

When a video must get shorter, cut whole bars from its scenes and keep the tempo. Speeding up the whole video changes the music's feel and squeezes every pause by the same amount. Cutting bars keeps the groove and lets each scene lose what it can spare.

A 40 s video went to 30 s this way, at the same 120 BPM:

- **Every scene lost one bar.** The hook went from 6 s to 4 s, each interface scene lost 2 s, and the close went from 6 s to 4 s.
- **The fast parts got faster.** Letters typed at 36 a second instead of 28, and answers streamed in about a second.
- **The reading pauses got shorter, not gone.** Each answer held about 1.5 s after it finished. The macro card, the densest text, held 3 s.
- **The music folded the same way.** The intro went from three bars to two, the first groove from eight to six, and a two-bar build became one. Every build still ended exactly on its moment.

Make the cut cheap before it is needed: hang every camera move and every build off the timing file. A retime there then moves the picture and the music together. After the cut, re-level the interface sounds and recheck the drops (`sound.md`).

## Step 6: hand the beat sheet to the next steps

- `motion.md` reads the beat sheet for what enters and leaves, and when.
- `sound.md` reads the beat grid and the timing file.
- `checks.md` checks every cut the beat sheet names.
- `export.md` reads the channel.

Keep the beat sheet in the video's project folder as `STORYBOARD.md`, with a short "how to change things" section for the person who asked for it: change the words here, move a sound there, lengthen a scene like this.
