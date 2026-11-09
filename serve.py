import http.server
import socketserver
import sys
import time

PORT = 8080

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching for local development so edits appear immediately
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving HTTP on 0.0.0.0 port {PORT} (http://localhost:{PORT}/) ...", flush=True)
        httpd.serve_forever()
except OSError:
    print(f"Serving HTTP on port {PORT} (server already active) ...", flush=True)
    while True:
        time.sleep(3600)
