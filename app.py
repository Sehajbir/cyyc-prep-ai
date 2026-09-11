"""CYYC Prep AI web app.

A deliberately dependency-free Python web server. The learning content is kept in
browser localStorage, so this can be deployed to any host that can run Python 3.
"""

from __future__ import annotations

import json
import mimetypes
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from rules import AIRPORT_RULES

ROOT = Path(__file__).resolve().parent


class PrepHandler(BaseHTTPRequestHandler):
    server_version = "CYYCPrep/1.0"

    def _send_bytes(self, body: bytes, content_type: str, status: HTTPStatus = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, payload: object, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        self._send_bytes(body, "application/json; charset=utf-8", status)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        path = urlparse(self.path).path
        if path in ("/", "/index.html"):
            self._serve_file(ROOT / "templates" / "index.html")
        elif path == "/api/rules":
            self._send_json(AIRPORT_RULES)
        elif path == "/healthz":
            self._send_json({"ok": True, "service": "cyyc-prep-ai"})
        elif path.startswith("/static/"):
            relative = path.removeprefix("/static/")
            requested = (ROOT / "static" / relative).resolve()
            static_root = (ROOT / "static").resolve()
            if static_root in requested.parents and requested.is_file():
                self._serve_file(requested)
            else:
                self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
        else:
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def _serve_file(self, path: Path) -> None:
        if not path.is_file():
            self._send_json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
            return
        content_type, _ = mimetypes.guess_type(str(path))
        content_type = content_type or "application/octet-stream"
        self._send_bytes(path.read_bytes(), content_type)

    def log_message(self, fmt: str, *args: object) -> None:
        # Keep hosting logs useful without printing every browser asset request.
        if not str(self.path).startswith("/static/"):
            super().log_message(fmt, *args)


def main() -> None:
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), PrepHandler)
    print(f"CYYC Prep AI listening on http://{host}:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping CYYC Prep AI", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
