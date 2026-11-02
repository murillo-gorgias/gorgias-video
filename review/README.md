# Review player

A page for reviewing a rendered video with notes pinned to exact frames. Reviewers pause, press N, optionally click a spot on the picture, and write what should change. Claude reads the notes and makes the changes.

## What it shows

- The video, with frame-by-frame stepping and slow playback.
- A timeline with the musical bars, the scenes and the key moments from the timing file.
- Every note as a marker on the timeline and as a numbered pin on the picture.
- A notes list that can hide resolved notes, and a copy button that copies every note as text.

## Ask first: local or shared

The first time a video reaches review, ask which the person prefers:

- **Local (the default).** The page runs on this computer, and notes save to `review/notes.json` in the video's project folder. The notes stay with the project as context for later sessions. Only people at this computer can add notes.
- **Shared.** The page is published on claude.ai, and notes live in the page's own database. Colleagues can add notes from anywhere. Claude reads them with the `ArtifactData` tool.

Use their answer for every later version of that video.

## Set it up

1. Make a `review/` folder in the video's project folder.
2. Copy `player.html` in as `index.html`. Change its `<title>` to the video's name plus "Review".
3. Copy in the master MP4 as `video.mp4`, and frame 0 as `poster.jpg`. Add `review/video.mp4` to the project's `.gitignore`; keep `notes.json`.
4. Write `review.json`. Take the scenes and moments from the timing file:

```json
{
  "title": "Spring launch, LinkedIn",
  "version": "v2",
  "video": "video.mp4",
  "poster": "poster.jpg",
  "size": "1920×1080",
  "fps": 30,
  "duration": 16,
  "bpm": 120,
  "scenes": [{"name": "Hook", "start": 0, "end": 4}],
  "moments": [{"label": "Click Run", "t": 7}]
}
```

5. **Local:** start the server and open the page it prints.

   ```
   python3 <skill>/scripts/review-server.py review
   ```

   It serves the page at http://localhost:8790/ and writes every note to `review/notes.json` the moment it is saved. Stop it with Ctrl+C when the review is done.

   **Shared:** publish `index.html` as an Artifact. Send `video.mp4`, `poster.jpg` and `review.json` as its files, and declare `capabilities: {db: {}, user: {scopes: ["profile"]}}`. Reviewers need Contributor access from the Share menu to add notes.

6. **Write the page's address in the video's `STORYBOARD.md`,** under a `## Review` heading: the claude.ai link for a shared page, or the server command and `review/notes.json` for a local one. A later session finds the notes from there.

For the next version, replace `video.mp4`, set a new `version` in `review.json`, and republish or reload. The notes stay. Resolve the ones the new version answers.

## Where notes live

| Where the page runs | Where notes save |
|---|---|
| Through `review-server.py` | `review/notes.json` in the project folder |
| Published on claude.ai | The page's database, collection `notes` |
| Opened any other way, such as straight from the folder | This browser only. The page says so. Use the copy button to hand the notes to Claude. |

Each note holds its time in seconds, its frame, an optional spot (`x` and `y` from 0 to 1), the text, the author and `open` or `done`.

## Reading the notes back

Read `review/notes.json`, or list the `notes` collection on a shared page. Sort by time and work through the open ones. Name each fix by its note number and frame. Mark a note `done` only after a person has seen the fix.
