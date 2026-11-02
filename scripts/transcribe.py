#!/usr/bin/env python3
"""Transcribe speech with Whisper, locally, into timed words for captions.

    python3 scripts/transcribe.py <audio-or-video> <captions.json> [--model small.en] [--language en]

Writes a JSON list of words, each with text, startMs, endMs and pageBreakAfter, the
caption format in reference/speech.md. Pages break on sentence ends and on gaps over 0.6 s.

Needs the openai-whisper package. It is not on this Mac by default:
    pip3 install -U openai-whisper
The first run downloads the model (small.en is about 470 MB). Use `small.en` for English
and `small` with --language for anything else.
"""
import json
import sys
from pathlib import Path

PAGE_GAP_S = 0.6
PAGE_MAX_WORDS = 5


def main(argv: list[str]) -> int:
    args = [a for a in argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 2
    model_name = argv[argv.index("--model") + 1] if "--model" in argv else "small.en"
    language = argv[argv.index("--language") + 1] if "--language" in argv else None
    src, out = Path(args[0]), Path(args[1])
    if not src.exists():
        print(f"not found: {src}")
        return 2
    try:
        import whisper  # noqa: WPS433
    except ImportError:
        print("The openai-whisper package is not installed. Run:  pip3 install -U openai-whisper")
        return 1

    model = whisper.load_model(model_name)
    result = model.transcribe(str(src), word_timestamps=True, language=language)
    words = []
    for segment in result["segments"]:
        for w in segment.get("words", []):
            words.append({"text": w["word"].strip(), "startMs": round(w["start"] * 1000), "endMs": round(w["end"] * 1000)})

    captions = []
    count = 0
    for i, w in enumerate(words):
        count += 1
        nxt = words[i + 1] if i + 1 < len(words) else None
        gap = (nxt["startMs"] - w["endMs"]) / 1000 if nxt else 0
        ends_sentence = w["text"].endswith((".", "!", "?"))
        page_break = nxt is None or ends_sentence or gap > PAGE_GAP_S or count >= PAGE_MAX_WORDS
        if page_break:
            count = 0
        captions.append({**w, "pageBreakAfter": page_break})

    out.write_text(json.dumps(captions, indent=2, ensure_ascii=False))
    pages = sum(1 for c in captions if c["pageBreakAfter"])
    print(f"Wrote {out}: {len(captions)} words in {pages} pages. Check product names against the script.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
