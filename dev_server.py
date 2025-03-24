#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8000

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers to prevent caching
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def log_message(self, format, *args):
        # Override to add colors to the log output
        status_code = args[1]
        if status_code.startswith('2'):  # Success codes 2xx
            status_color = '\033[92m'  # Green
        elif status_code.startswith('3'):  # Redirect codes 3xx
            status_color = '\033[94m'  # Blue
        elif status_code.startswith('4'):  # Client error codes 4xx
            status_color = '\033[93m'  # Yellow
        elif status_code.startswith('5'):  # Server error codes 5xx
            status_color = '\033[91m'  # Red
        else:
            status_color = '\033[0m'  # Default

        reset_color = '\033[0m'
        print(f"{self.address_string()} - - [{self.log_date_time_string()}] "
              f"{status_color}{format % args}{reset_color}")

Handler = NoCacheHTTPRequestHandler

print(f"\033[1;32mStarting server at http://localhost:{PORT}\033[0m")
print(f"\033[1;33mPress Ctrl+C to stop the server\033[0m")
print(f"\033[1;34mServing files from: {os.getcwd()}\033[0m")
print(f"\033[1;36mNo-cache headers enabled - browser will request fresh files on each reload\033[0m")

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\033[1;31mServer stopped\033[0m") 