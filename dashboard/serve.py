#!/usr/bin/env python3
"""
Simple HTTP server for testing the dashboard locally
"""
import http.server
import socketserver
import os
import sys

def serve_dashboard(port=8090):
    # Change to dashboard directory
    dashboard_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(dashboard_dir)
    
    class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # Add CORS headers for API calls
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
    
    print(f"Starting dashboard server on port {port}")
    print(f"Serving from: {dashboard_dir}")
    print(f"Open: http://localhost:{port}/dashboard-new.html")
    print("Press Ctrl+C to stop")
    
    with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped")

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8090
    serve_dashboard(port)
