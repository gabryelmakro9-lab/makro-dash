import sys, os
from pathlib import Path
from http.server import HTTPServer, SimpleHTTPRequestHandler

BASE_DIR = Path(__file__).parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def log_message(self, format, *args):
        pass

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8890
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Servidor rodando em http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
        server.server_close()

if __name__ == "__main__":
    main()
