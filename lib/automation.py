import webbrowser
import pyautogui
import subprocess
import time
import os

def search_google(query):
    """
    Opens Google in the default browser and searches for the given query.
    
    Args:
        query (str): The search query to perform
    """
    print(f"[JARVIS] Searching Google for: '{query}'")
    
    # Open Google in the default browser
    webbrowser.open("https://www.google.com")
    
    # Wait for the browser to load
    time.sleep(2)
    
    # Type the search query
    pyautogui.write(query)
    pyautogui.press("enter")
    
    print(f"[JARVIS] Search completed for: '{query}'")
    return True

def open_web_app(url):
    """
    Opens a web application at the specified URL.
    
    Args:
        url (str): The URL of the web application to open
    """
    print(f"[JARVIS] Opening web app: {url}")
    webbrowser.open(url)
    print(f"[JARVIS] Opened web app: {url}")
    return True

def open_desktop_app(app_name):
    """
    Opens a desktop application by name.
    
    Args:
        app_name (str): The name of the application to open
    """
    print(f"[JARVIS] Launching desktop app: {app_name}")
    
    app_name = app_name.lower()
    success = False
    
    try:
        # Common Windows applications
        if app_name == "spotify":
            app_path = os.path.expanduser("~\\AppData\\Roaming\\Spotify\\Spotify.exe")
            subprocess.Popen([app_path])
            success = True
        elif app_name == "notepad":
            subprocess.Popen(["notepad"])
            success = True
        elif app_name == "calculator":
            subprocess.Popen(["calc"])
            success = True
        elif app_name == "vscode" or app_name == "visual studio code":
            subprocess.Popen(["code"])
            success = True
        elif app_name == "explorer" or app_name == "file explorer":
            subprocess.Popen(["explorer"])
            success = True
        else:
            # Try to launch the app directly by name
            subprocess.Popen([app_name])
            success = True
            
        print(f"[JARVIS] Successfully launched: {app_name}")
        return success
    except Exception as e:
        print(f"[JARVIS] Error launching {app_name}: {str(e)}")
        return False