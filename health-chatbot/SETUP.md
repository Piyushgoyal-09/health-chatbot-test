# Elyx Health Concierge - Enhanced Setup Guide

## New Features Added

### 1. Chat History with Embeddings
- **Pinecone Integration**: Stores chat message embeddings for intelligent context retrieval
- **Enhanced Context**: Uses semantic search to find relevant past conversations
- **Recent History**: Always includes the last 10 messages for context

### 2. AI Health Plan Generation
- **Automatic Detection**: Detects health conditions mentioned by users (back pain, stress, etc.)
- **Plan Creation**: Generates 7-day task plans with specific daily activities
- **MongoDB Storage**: Stores plans with progress tracking capabilities

### 3. Dashboard API
- **Progress Tracking**: Track task completion with dates
- **Statistics**: Overall progress percentages and daily completion stats
- **Plan Management**: View, update, and deactivate health plans

## Environment Variables Setup

Create a `.env` file in the `health-chatbot/` directory with:

```env
# Google AI API Key (required)
GOOGLE_API_KEY=your_google_ai_api_key_here

# Database Configuration (required for new features)
MONGODB_URI=your_mongodb_uri_here
PINECONE_API_KEY=your_pinecone_api_key_here

# Pinecone Configuration (optional - defaults provided)
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=elyx-chat-history
```

## Prerequisites

### 1. MongoDB Setup
- **Option 1**: Use [MongoDB Atlas](https://www.mongodb.com/atlas) (recommended for cloud)
- **Option 2**: Install MongoDB locally
- Get your connection URI (e.g., `mongodb+srv://username:password@cluster.mongodb.net/`)

### 2. Pinecone Setup
1. Sign up at [pinecone.io](https://www.pinecone.io/)
2. Create a new project
3. Get your API key from the dashboard
4. The system will automatically create an index named `elyx-chat-history`

### 3. Google AI API Key
- Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
- The current key in the code is temporary - replace with your own

## Installation

1. **Install new dependencies**:
```bash
pip install -r requirements.txt
```

2. **Create your .env file** using the template above

3. **Start the server**:
```bash
python main.py
```

## New API Endpoints

### Health Plan Management

#### Get Active Plans
```http
GET /plans
```

#### Get Specific Plan
```http
GET /plans/{plan_id}
```

#### Update Task Progress
```http
POST /plans/{plan_id}/progress
Content-Type: application/json

{
  "plan_id": "plan_id_here",
  "task_name": "Task name from the plan",
  "date": "2024-01-15"
}
```

#### Get Plan Progress Statistics
```http
GET /plans/{plan_id}/progress
```

#### Deactivate Plan
```http
DELETE /plans/{plan_id}
```

### Dashboard

#### Get Dashboard Summary
```http
GET /dashboard/summary
```
Returns overall statistics including:
- Total active plans
- Total and completed tasks
- Overall progress percentage
- Recent activity

## How It Works

### 1. Chat with Enhanced Context
When a user sends a message:
1. Message is stored in MongoDB and embedded in Pinecone
2. System retrieves relevant context using semantic search
3. Recent 10 messages are also included
4. AI responds with full context awareness

### 2. Automatic Plan Generation
When health conditions are detected:
1. AI analyzes if the condition needs a structured plan
2. Generates specific daily tasks (max 7 days)
3. Stores plan in MongoDB with progress tracking structure
4. Notifies user that a plan was created

### 3. Progress Tracking
Users can mark tasks as complete:
1. Frontend calls the progress update API
2. Task completion is recorded with date
3. Dashboard shows visual progress charts
4. Statistics are calculated in real-time

## Testing the Features

### Test Plan Generation
Send messages like:
- "I have been having back pain lately"
- "I'm feeling really stressed and anxious"
- "My shoulder hurts when I lift my arm"

### Test Context Retrieval
- Have a conversation about a topic
- Ask a follow-up question later
- The AI should remember previous context

### Test Dashboard
- Create some plans by mentioning health conditions
- Use the progress API to mark tasks complete
- Check the dashboard summary for statistics

## Database Schema

### Health Plans (MongoDB)
```json
{
  "_id": "plan_id",
  "user_id": "default_user",
  "plan_name": "Back Pain Recovery Plan",
  "condition": "back pain",
  "timeline_days": 7,
  "tasks": [
    {
      "task_name": "Take 10-minute walk",
      "progress": ["2024-01-15", "2024-01-16"]
    }
  ],
  "active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

### Chat History (MongoDB + Pinecone)
- **MongoDB**: Stores message content, metadata, and references to embeddings
- **Pinecone**: Stores vector embeddings for semantic search

## Troubleshooting

### Database Connection Issues
- Check your MongoDB URI format
- Ensure network access is configured (for Atlas)
- Verify credentials

### Pinecone Issues
- Confirm API key is correct
- Check if you're in the right environment (us-east-1)
- Index creation happens automatically

### Plan Generation Not Working
- Ensure you mention specific health conditions
- Check console logs for AI response parsing
- Verify MongoDB connection for plan storage

## Next Steps for Frontend Integration

The React frontend will need to:
1. **Handle Plan Creation Responses**: Show notification when plans are created
2. **Dashboard Page**: Create a new page to display active plans and progress
3. **Progress Tracking UI**: Add checkboxes or buttons to mark tasks complete
4. **Charts/Visualizations**: Display progress statistics graphically

The backend is now fully ready to support these frontend features!
