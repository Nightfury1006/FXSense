"""
FXSense: Launcher Script
Launches the Flask web server on http://localhost:5000 and opens the browser.
"""

import webbrowser
import threading
import time
from app import app

def open_browser():
    time.sleep(1.2)
    print("Opening FXSense in your browser: http://127.0.0.1:5000")
    webbrowser.open("http://127.0.0.1:5000")

if __name__ == '__main__':
    threading.Thread(target=open_browser, daemon=True).start()
    print("=" * 65)
    print(" FXSense: Adaptive Multi-Source Currency Forecasting System")
    print(" Academic Capstone & Product Prototype")
    print(" Serving live at: http://127.0.0.1:5000")
    print("=" * 65)
    app.run(host='127.0.0.1', port=5000, debug=False)
