#!/usr/bin/env python3
"""
Quick start script for the Elyx Health Concierge API
"""

import uvicorn
import webbrowser
import threading
import time
import requests
import sys

def check_api_health():
    """Check if the API is running"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        return response.status_code == 200
    except:
        return False

def open_browser_after_delay():
    """Open browser to API docs after a short delay"""
    time.sleep(3)  # Wait for server to fully start
    if check_api_health():
        print("🌐 Opening API documentation in browser...")
        webbrowser.open("http://localhost:8000/docs")
    else:
        print("❌ Server not responding, please check manually")

if __name__ == "__main__":
    print("🚀 Starting Elyx Health Concierge API Server...")
    print("=" * 50)
    print("📋 Available endpoints:")
    print("   • API Docs: http://localhost:8000/docs")
    print("   • Health Check: http://localhost:8000/")
    print("   • Chat Endpoint: http://localhost:8000/chat")
    print("   • Specialists: http://localhost:8000/specialists")
    print("=" * 50)
    
    # Start browser opening in background
    browser_thread = threading.Thread(target=open_browser_after_delay)
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        # Start the FastAPI server
        uvicorn.run(
            "main:app", 
            host="0.0.0.0", 
            port=8000, 
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Shutting down server...")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
