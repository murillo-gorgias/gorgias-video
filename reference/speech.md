# Speech: captions and voiceover

Read this when a video has a voice, a recorded clip with speech, or captions. Most Gorgias social videos have none.

## Captions are timed data

A caption file is a list of words. Each word has a start time, an end time, the text, and a flag that says whether a new caption page starts after it. Nothing else. The look of the captions is decided once, in the scene, and applied to every word.

```json
[
  {"text": "Can't", "startMs": 120, "endMs": 380, "pageBreakAfter": false},
  {"text": "keep", "startMs": 380, "endMs": 560, "pageBreakAfter": false},
  {"text": "up", "startMs": 560, "endMs": 900, "pageBreakAfter": true}
]
```

- **Timestamps are relative to the original recording,** not to the edit. When the clip is trimmed, delayed or sped up, the captions move with it as one group. Keep the clip and its captions together, and apply the trim, the delay and the speed to the group.
- **Each clip has its own caption list.** Never merge captions from several clips into one overlay.
- **A page is a few words**, one line, under about 20 characters on a phone frame. Break pages on natural pauses.
- **Highlight the word being spoken** with the coral accent or a weight change, so the eye follows the voice.

## Caption placement

- **Width:** about half the frame wide, centred.
- **Position:** 120 px from the bottom on a 1080 px frame, above the safe area. On portrait formats for Stories and Reels, lift it above the interface bar: 250 px from the bottom.
- **Size:** at least 44 px, the supporting-text minimum from `brand.md`. Inter, semibold. Ink on a frosted paper pill, or paper on ink.
- **Never over a face or over the key element** of the scene.

## Transcribing

`transcribe.py` runs Whisper locally and writes the caption file above. It needs the `openai-whisper` Python package and ffmpeg. The script prints the install command if the package is missing.

- **Use `small.en` for English.** It is fast and accurate enough for clean speech. For other languages, use `small` and set the language.
- **Clean the audio first** if it is noisy: a highpass at 80 Hz and a light normalise.
- **Check the result against the script.** Whisper mishears product names. Replace "Gorgeous" with "Gorgias" before the captions go on screen. Keep the timing, change the text.

## Voiceover

When the video has a voice, the voice sets the scene lengths. The video follows the voice, never the other way round.

1. **Generate or record speech per scene**, one file per scene.
2. **Measure each file's length.** `ffprobe -v error -show_entries format=duration -of csv=p=0 scene-1.wav`.
3. **Size each scene to its audio** plus a short breath: 0.3 to 0.5 s before and after.
4. **Round each scene up to the beat grid** if there is music. The voice starts on a beat; the slack sits at the end of the scene.
5. **Write the lengths into the timing file**, and build the picture from there.

For generated speech, any text-to-speech service that writes an audio file works. The Mac's built-in `say` command makes a placeholder voice for timing checks: `say -o scene-1.aiff "Can't keep up with your DMs?"`. Replace it with a real voice before sharing.

## Ducking

Music drops under the voice. In the audio list, give the music clip `duckUnder` with the voice clip's name. `mix-audio.py` runs a sidechain compressor: the music ducks by about 8 dB with a 20 ms attack and a 300 ms release. Listen for pumping on short pauses; lengthen the release if the music breathes between words.

## Silence

`silence.sh` finds silent stretches in a recording, for trimming the start and the end of a clip or cutting dead air.

1. It measures the file's loudness first with `loudnorm` and reads the gating threshold.
2. It uses that threshold as the silence cut-off, so a quiet recording and a loud one both work.
3. Silences shorter than 0.5 s are ignored. Gaps under 0.2 s between two silences are merged.

It prints each silence's start, end and length, and flags the leading and trailing ones.
