import sys
from PyQt5.QtCore import QUrl, QThread, pyqtSignal
from PyQt5.QtWidgets import QApplication, QMainWindow
from PyQt5.QtWebEngineWidgets import QWebEngineView
import socket
import add_css

class HTMLServer(QThread):
    new_html_received = pyqtSignal(str)

    def run(self):
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind(('0.0.0.0', 63001))
        server_socket.listen(1)
        print("Server started, waiting for connections...")

        while True:
            client_socket, addr = server_socket.accept()
            print(f"Connection from {addr}")
            self.handle_client(client_socket)

    def handle_client(self, client_socket):
        try:
            while True:
                data = client_socket.recv(30999).decode('utf-8')
                if data:
                    self.new_html_received.emit(data)
                else:
                    break
        except ConnectionResetError:
            print("Connection reset by peer")
        finally:
            client_socket.close()

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.browser = QWebEngineView()
        self.setCentralWidget(self.browser)
        self.base_url = QUrl.fromLocalFile("/home/rohan/.config/nvim/lua/llvp/render/resources/")
        self.browser.setHtml("<html><body><h1>Placeholder</h1></body></html>")

        self.server = HTMLServer()
        self.server.new_html_received.connect(self.update_html)
        self.server.start()

    def update_html(self, html):
        stored = html + "\n\n\n\n\n\ BUGGS \n\n\n\n"
        if "katex" in html:
            html = add_css.addCSS(html)
        self.browser.setHtml(html, self.base_url)
        self.browser.page().loadFinished.connect(self.auto_zoom)

    def auto_zoom(self):
        javascript = """
        (function() {
            var body = document.body;
            var html = document.documentElement;
            var height = Math.max(body.scrollHeight, body.offsetHeight,
                                  html.clientHeight, html.scrollHeight, html.offsetHeight);
            var windowHeight = window.innerHeight;
            var zoom = windowHeight / height;
            document.body.style.zoom = zoom;
        })();
        """
        self.browser.page().runJavaScript(javascript)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    mainWindow = MainWindow()
    mainWindow.show()
    sys.exit(app.exec_())
