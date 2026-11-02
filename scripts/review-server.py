"""
Serve a review folder on this computer and keep its notes in the folder, as notes.json.

The review page (review/player.html, copied in as index.html) finds this server and saves
every note straight to notes.json, so the notes live in the project with everything else.
Only this computer can reach the server.

    python3 scripts/review-server.py <review-folder> [--port 8790]

Then open http://localhost:8790/ and stop the server with Ctrl+C when done.
The video seeks frame by frame because the server answers partial requests (Range).
"""
import argparse
import json
import os
import re
import sys
import tempfile
from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

NOTES_FILE = "notes.json"
MAX_BODY_BYTES = 2 * 1024 * 1024
RANGE_PATTERN = re.compile(r"bytes=(\d*)-(\d*)$")


def write_notes(folder: Path, notes: list) -> None:
    """Write the notes atomically, so a crash never leaves half a file."""
    fd, tmp = tempfile.mkstemp(dir=folder, prefix=".notes-", suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(notes, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    os.replace(tmp, folder / NOTES_FILE)


def read_notes(folder: Path) -> list:
    path = folder / NOTES_FILE
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        print(f"Could not read {path}: {err}. Serving no notes; the file is left untouched.", file=sys.stderr)
        raise
    return data if isinstance(data, list) else []


def valid_notes(data: object) -> bool:
    if not isinstance(data, list):
        return False
    for note in data:
        if not isinstance(note, dict):
            return False
        if not isinstance(note.get("id"), str) or not isinstance(note.get("text"), str):
            return False
        if not isinstance(note.get("t"), (int, float)) or not isinstance(note.get("frame"), int):
            return False
    return True


class ReviewHandler(SimpleHTTPRequestHandler):
    # Name the text encoding, or the browser shows symbols such as "·" as garbled characters.
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
    }

    def __init__(self, *args, folder: Path, **kwargs):
        self.folder = folder
        super().__init__(*args, directory=str(folder), **kwargs)

    def send_json(self, status: HTTPStatus, body: object) -> None:
        raw = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path.split("?")[0] == "/api/notes":
            try:
                self.send_json(HTTPStatus.OK, read_notes(self.folder))
            except (OSError, json.JSONDecodeError):
                self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "notes.json could not be read"})
            return
        if "Range" in self.headers:
            self.send_range()
            return
        super().do_GET()

    def do_PUT(self) -> None:
        if self.path.split("?")[0] != "/api/notes":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "unknown path"})
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY_BYTES:
            self.send_json(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, {"error": "notes must be under 2 MB"})
            return
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "notes were not valid JSON"})
            return
        if not valid_notes(data):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "each note needs id, t, frame and text"})
            return
        try:
            write_notes(self.folder, data)
        except OSError as err:
            print(f"Could not write notes: {err}", file=sys.stderr)
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": "notes.json could not be written"})
            return
        print(f"Saved {len(data)} notes to {self.folder / NOTES_FILE}")
        self.send_json(HTTPStatus.OK, {"saved": len(data)})

    def send_range(self) -> None:
        """Answer a partial request, so the browser can seek inside the video."""
        path = Path(self.translate_path(self.path))
        if not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        size = path.stat().st_size
        match = RANGE_PATTERN.match(self.headers["Range"].strip())
        if not match or (not match.group(1) and not match.group(2)):
            self.send_error(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            return
        if match.group(1):
            start = int(match.group(1))
            end = int(match.group(2)) if match.group(2) else size - 1
        else:
            start = max(0, size - int(match.group(2)))
            end = size - 1
        end = min(end, size - 1)
        if start > end:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return
        self.send_response(HTTPStatus.PARTIAL_CONTENT)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with path.open("rb") as fh:
            fh.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = fh.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return
                remaining -= len(chunk)

    def end_headers(self) -> None:
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def log_message(self, format: str, *args) -> None:
        return


def main() -> int:
    parser = argparse.ArgumentParser(description="Serve a review folder and save its notes to notes.json.")
    parser.add_argument("folder", help="the review folder: index.html, video.mp4, review.json")
    parser.add_argument("--port", type=int, default=8790)
    args = parser.parse_args()

    folder = Path(args.folder).resolve()
    if not (folder / "index.html").is_file():
        print(f"{folder} has no index.html. Copy review/player.html in as index.html first.", file=sys.stderr)
        return 1
    try:
        read_notes(folder)
    except (OSError, json.JSONDecodeError):
        return 1

    handler = partial(ReviewHandler, folder=folder)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", args.port), handler)
    except OSError as err:
        print(f"Port {args.port} is busy ({err}). Try --port {args.port + 1}.", file=sys.stderr)
        return 1
    print(f"Review page: http://localhost:{args.port}/")
    print(f"Notes save to: {folder / NOTES_FILE}")
    print("Stop with Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
