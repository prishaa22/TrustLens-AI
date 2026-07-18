"""
=========================================
TrustLens AI
Local Dev Server (Frontend)
=========================================

Serves the static dashboard (index.html, css/, js/) over HTTP instead of
opening index.html directly via file://. This matters because some
browsers (notably Chrome) restrict fetch() calls made from a file://
origin, which would silently break the "Analyze Review" button.

This is only a static file server for the frontend - it does NOT replace
the FastAPI backend. Run both at the same time:

    python web/app.py                          (this file, serves the UI)
    uvicorn api.app:app --reload --port 8000    (the actual prediction API)

Usage:
    python web/app.py
"""

import http.server
import socketserver
import webbrowser
from pathlib import Path

PORT = 5500
WEB_DIR = Path(__file__).resolve().parent


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def end_headers(self):
        # Disable caching during development so edits to app.js/style.css
        # show up on a normal refresh instead of needing a hard reload.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        print(f"[web] {self.address_string()} - {format % args}")


def main():

    with socketserver.TCPServer(("127.0.0.1", PORT), Handler) as httpd:

        url = f"http://127.0.0.1:{PORT}"

        print(f"TrustLens AI dashboard running at {url}")
        print("Make sure the API backend is also running:")
        print("    uvicorn api.app:app --reload --port 8000")
        print("\nPress Ctrl+C to stop.\n")

        try:
            webbrowser.open(url)
        except Exception:
            pass  # headless environment - no browser to open, that's fine

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down.")


if __name__ == "__main__":
    main()