#!/usr/bin/env python

import sys
import automation

def main():
    """
    Entry point for automation commands from Node.js.
    Expected arguments:
    1. Command type (search_google, open_web_app, open_desktop_app)
    2. Command parameter (query, url, or app_name)
    """
    if len(sys.argv) < 3:
        print("Error: Insufficient arguments")
        print("Usage: python automation_runner.py <command_type> <parameter>")
        sys.exit(1)
    
    command_type = sys.argv[1]
    parameter = sys.argv[2]
    
    try:
        if command_type == "search_google":
            automation.search_google(parameter)
        elif command_type == "open_web_app":
            automation.open_web_app(parameter)
        elif command_type == "open_desktop_app":
            automation.open_desktop_app(parameter)
        else:
            print(f"Error: Unknown command type '{command_type}'")
            sys.exit(1)
    except Exception as e:
        print(f"Error executing {command_type}: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()