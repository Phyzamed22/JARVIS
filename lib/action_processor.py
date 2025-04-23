import json
import sys
import automation

def process_action(action_json):
    """
    Process a structured action from Groq LLM and execute the appropriate automation.
    
    Expected JSON format:
    {
        "action": "search_google" | "open_web_app" | "open_desktop_app",
        "params": {
            "query": "search query" | 
            "url": "https://example.com" |
            "app_name": "application name"
        }
    }
    """
    try:
        # Parse the JSON action
        action_data = json.loads(action_json)
        
        action_type = action_data.get("action")
        params = action_data.get("params", {})
        
        if not action_type:
            print("Error: No action specified in the JSON")
            return False
            
        # Execute the appropriate action
        if action_type == "search_google":
            query = params.get("query")
            if not query:
                print("Error: No query provided for search_google action")
                return False
            return automation.search_google(query)
            
        elif action_type == "open_web_app":
            url = params.get("url")
            if not url:
                print("Error: No URL provided for open_web_app action")
                return False
            return automation.open_web_app(url)
            
        elif action_type == "open_desktop_app":
            app_name = params.get("app_name")
            if not app_name:
                print("Error: No app_name provided for open_desktop_app action")
                return False
            return automation.open_desktop_app(app_name)
            
        else:
            print(f"Error: Unknown action type '{action_type}'")
            return False
            
    except json.JSONDecodeError:
        print(f"Error: Invalid JSON format: {action_json}")
        return False
    except Exception as e:
        print(f"Error processing action: {str(e)}")
        return False

def main():
    """
    Entry point for processing actions from Node.js.
    Expected argument: JSON string containing action and parameters
    """
    if len(sys.argv) < 2:
        print("Error: No action JSON provided")
        print("Usage: python action_processor.py '{"action": "search_google", "params": {"query": "example"}}'")
        sys.exit(1)
    
    action_json = sys.argv[1]
    success = process_action(action_json)
    
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()