# Setting Up Notion Integration for JARVIS

This guide will help you set up the Notion integration for JARVIS to manage tasks using voice commands.

## Step 1: Create a Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name your integration (e.g., "JARVIS Assistant")
4. Select the workspace where you want to use the integration
5. Click "Submit"
6. Copy the "Internal Integration Token" - this will be your `NOTION_API_TOKEN`

## Step 2: Create a Tasks Database in Notion

1. In your Notion workspace, create a new page
2. Click "+" and select "Database - Full page"
3. Set up the following properties for your database:
   - Name (title): For task names
   - Status (select): With options "Pending", "In Progress", "Completed"
   - Due Date (date): For task deadlines
   - Priority (select): With options "Low", "Medium", "High"
   - Notes (text): For additional task details
4. Click the "Share" button in the top right
5. Under "Connections", find and select your integration
6. Copy the database ID from the URL - it's the part after the workspace name and before the question mark
   - Example: `https://www.notion.so/workspace/1a2b3c4d5e6f7g8h9i0j?v=...`
   - The database ID is `1a2b3c4d5e6f7g8h9i0j`

## Step 3: Configure Environment Variables

Add the following environment variables to your project:

```
NOTION_API_TOKEN=your_integration_token
NOTION_TASKS_DATABASE_ID=your_database_id
```

## Step 4: Install Dependencies

Run the following command to install the Notion API client:

```bash
npm install @notionhq/client
```

## Step 5: Using Task Commands with JARVIS

Once set up, you can use the following voice commands with JARVIS:

- "Add a task to buy groceries"
- "Add a task to finish report due tomorrow with high priority"
- "Show my pending tasks"
- "What tasks are due today?"
- "Mark task buy groceries as completed"

## Troubleshooting

If you encounter issues with the Notion integration:

1. Verify your API token and database ID are correct
2. Ensure your integration has been properly connected to your database
3. Check that your database has the required properties (Name, Status, Due Date, Priority, Notes)
4. Restart the application after making configuration changes