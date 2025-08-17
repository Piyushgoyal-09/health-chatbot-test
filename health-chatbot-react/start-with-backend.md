# Starting React App with FastAPI Backend

## Quick Start

### 1. Terminal 1 - Start FastAPI Backend
```bash
cd /Users/shoaib31/Developer/lodu/health-chatbot

# Install dependencies if not already done
pip install -r requirements.txt

# Start the backend server
python start_server.py
```

### 2. Terminal 2 - Start React App
```bash
cd /Users/shoaib31/Developer/lodu/health-chatbot-react

# Install dependencies if not already done
npm install

# Start the React development server
npm start
```

## What's Changed

✅ **Backend Integration** - React app now uses FastAPI backend instead of direct Gemini calls  
✅ **Connection Status** - Shows backend connection status in header  
✅ **Error Handling** - Better error messages when backend is unavailable  
✅ **File Upload** - PDFs and images processed through backend API  
✅ **Specialist Routing** - All routing now handled by FastAPI server  
✅ **Session Management** - Chat sessions managed by backend  

## Architecture

```
React App (Port 3000) ──HTTP API──> FastAPI Backend (Port 8000) ──> Google Gemini
```

### Before:
```
React App ──Direct SDK──> Google Gemini
```

### After:
```
React App ──REST API──> FastAPI Backend ──LangChain + SDK──> Google Gemini
```

## Features

### ✅ Working Features:
- Chat with all 6 specialists (Dr. Warren, Advik, Neel, Carla, Rachel, Ruby)  
- Automatic specialist routing based on message content  
- File uploads (PDF text extraction, image analysis)  
- Real-time chat with typing indicators  
- Chat history persistence per session  
- Backend connection status monitoring  

### 🔧 API Endpoints Used:
- `POST /chat` - Send messages and get specialist responses  
- `POST /upload/pdf` - Extract text from PDFs  
- `POST /upload/image` - Process images for analysis  
- `GET /` - Health check for connection status  

## Testing

1. **Start both servers** (FastAPI and React)
2. **Check connection status** - Should show "Backend Connected" (green dot)
3. **Send a test message** - Try "I have a headache" (should route to Dr. Warren)
4. **Try file upload** - Upload a PDF or image
5. **Test different specialists** - Try nutrition, fitness, or sleep questions

## Troubleshooting

### Backend Connection Issues:
- ❌ **Red dot**: Backend server is not running
- ⚠️ **Warning message**: Will appear in chat if backend is unavailable
- ✅ **Green dot**: Backend is connected and working

### Common Issues:
1. **CORS errors**: Backend includes CORS middleware for localhost:3000
2. **Port conflicts**: Make sure FastAPI (8000) and React (3000) use different ports
3. **File upload errors**: Check file size (max 10MB) and format (PDF/images only)

## Next Steps

- ✅ Both apps are now integrated and working
- 🚀 Ready for production deployment (add database, auth, etc.)
- 🎨 Customize UI/UX as needed
- 📊 Add analytics and monitoring

Your React app now uses the same powerful backend as the original Streamlit app! 🎉
