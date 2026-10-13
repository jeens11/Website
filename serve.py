#!/usr/bin/env python3
"""Tiny local server with HTTP Range support (needed for video in Safari).

Run:  python3 serve.py        then open http://localhost:8000
"""
import os
import re
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class RangeHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        rng = self.headers.get("Range")
        path = self.translate_path(self.path)
        if not rng or not os.path.isfile(path):
            return super().send_head()
        match = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
        if not match:
            return super().send_head()
        size = os.path.getsize(path)
        start, end = match.groups()
        if start == "":
            first, last = max(0, size - int(end)), size - 1
        else:
            first = int(start)
            last = int(end) if end else size - 1
        last = min(last, size - 1)
        if first > last or first >= size:
            self.send_error(416, "Requested Range Not Satisfiable")
            return None
        handle = open(path, "rb")
        handle.seek(first)
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {first}-{last}/{size}")
        self.send_header("Content-Length", str(last - first + 1))
        self.end_headers()
        self._remaining = last - first + 1
        return handle

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(65536, remaining))
            if not chunk:
                break
            try:
                outputfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
            remaining -= len(chunk)
        self._remaining = None

    def end_headers(self):
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f"Serving on http://localhost:{port}  (Ctrl+C to stop)")
    ThreadingHTTPServer(("", port), RangeHandler).serve_forever()
