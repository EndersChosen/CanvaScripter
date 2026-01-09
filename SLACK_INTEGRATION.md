# Slack Integration for AI Assistant Feedback

## Setup Instructions

The AI Assistant includes feedback buttons that send reports directly to your Slack workspace when users encounter issues with query or operation results.

### 1. Create a Slack Incoming Webhook

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Canvas Electron Feedback" and select your workspace
4. Click "Incoming Webhooks" in the sidebar
5. Toggle "Activate Incoming Webhooks" to On
6. Click "Add New Webhook to Workspace"
7. Select the channel where you want to receive feedback (e.g., #dev-feedback or your DM)
8. Copy the webhook URL (looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. Configure the Environment Variable

Add the webhook URL to your environment:

**Windows:**
```cmd
setx SLACK_WEBHOOK_URL "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

**macOS/Linux:**
```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

Or add it to your `.env` file (create one in the project root):
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3. Restart the Application

After setting the environment variable, restart the Electron app for it to take effect.

## How It Works

### Query Results Feedback
- Appears when users see the confirmation preview before executing an operation
- Sends: User prompt, operation, items found, and user's description of what's wrong
- Use this to improve filtering logic when the AI finds the wrong items

### Operation Results Feedback
- Appears after an operation completes
- Sends: User prompt, operation, parameters, results, and user's description of what went wrong
- Use this to fix issues with the operation execution itself

### Feedback Message Format

Messages sent to Slack include:
- **User Prompt**: The natural language request
- **Operation**: The parsed operation name
- **Feedback**: User's description of the issue
- **Context**: Either query results (item count, preview) or operation results (success/fail counts, parameters)

## Example Slack Message

```
🤖 AI Assistant Feedback: Query Results Issue

User Prompt:
delete all assignments in https://example.com/courses/123 that were imported

Operation:
delete-imported-assignments

User Feedback:
It's showing all assignments, not just imported ones

Items Found:
45

Preview:
Assignment 1, Assignment 2, Assignment 3, ...
```

## Testing the Integration

1. Open the AI Assistant in the app
2. Make a query that produces results
3. Click "Report Issue" on either the confirmation or results screen
4. Enter feedback
5. Check your Slack channel for the message

If you see "Slack webhook URL not configured" error, verify:
- The environment variable is set correctly
- You restarted the app after setting it
- The webhook URL is valid (test it with curl)
