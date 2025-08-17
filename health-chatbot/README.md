# Elyx Health Concierge - FastAPI Backend

This is a FastAPI backend that replicates the exact functionality of your Streamlit health chatbot with multiple AI specialist agents, routing logic, and multimodal support.

## 🚀 Quick Start

### Option 1: Quick Demo (Fastest)
```bash
# Install dependencies
pip install -r requirements.txt

# Start the server (auto-opens browser)
python start_server.py

# Open the demo in browser
open demo.html
```

### Option 2: Manual Start
```bash
# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
# OR
uvicorn main:app --reload
```

## 🏥 Features (Identical to Streamlit App)

✅ **Multiple AI Specialists**
- 🩺 **Dr. Warren** - Physician (medical questions, lab results, symptoms)
- 📈 **Advik** - Performance Scientist (sleep, recovery, stress analysis) 
- 📊 **Neel** - Performance Scientist (workout data, HRV, physical performance)
- 🥗 **Carla** - Nutritionist (diet, food analysis, supplements)
- 💪 **Rachel** - Physiotherapist (movement, strength training, injuries)
- 👤 **Ruby** - Concierge (scheduling, logistics, general support)

✅ **Smart Routing** - Messages automatically routed to the right specialist  
✅ **Multimodal Support** - Upload PDFs and images  
✅ **Chat History** - Full conversation history per session  
✅ **Same AI Models** - Uses identical LangChain + Google Gemini setup  
✅ **Same Personalities** - All specialist personas exactly replicated  

## 📚 API Endpoints

| Endpoint | Method | Description |
|----------|---------|-------------|
| `/` | GET | Health check |
| `/specialists` | GET | Get list of all specialists |
| `/chat` | POST | Send message and get specialist response |
| `/chat/{session_id}/history` | GET | Get chat history for session |
| `/upload/pdf` | POST | Upload and extract text from PDF |
| `/upload/image` | POST | Upload and process image |
| `/sessions` | GET | Get all active session IDs |
| `/chat/{session_id}` | DELETE | Delete a chat session |

## 🔧 API Usage Examples

### Basic Chat
```python
import requests

response = requests.post("http://localhost:8000/chat", json={
    "message": "I have been having headaches. What could be causing them?",
    "session_id": "my-session-123"
})

print(f"Response from {response.json()['specialist_name']}: {response.json()['message']}")
```

### Chat with Image
```python
import requests
import base64

# Upload image first
with open("my_image.jpg", "rb") as f:
    files = {"file": f}
    upload_response = requests.post("http://localhost:8000/upload/image", files=files)
    image_data = upload_response.json()["image_data"]

# Send chat with image
response = requests.post("http://localhost:8000/chat", json={
    "message": "Can you analyze this medical report?",
    "session_id": "my-session-123",
    "image_data": image_data
})
```

### Chat with PDF
```python
import requests

# Upload PDF first
with open("lab_results.pdf", "rb") as f:
    files = {"file": f}
    upload_response = requests.post("http://localhost:8000/upload/pdf", files=files)
    pdf_text = upload_response.json()["text"]

# Send chat with PDF content
response = requests.post("http://localhost:8000/chat", json={
    "message": "Please interpret these lab results",
    "session_id": "my-session-123", 
    "pdf_text": pdf_text
})
```

## 🌐 React Integration

See the detailed React integration guide in `react-integration.md` for a complete example of how to build a React frontend that uses this API.

The React app includes:
- Full chat interface identical to Streamlit
- File upload support (PDF + images)
- Real-time specialist routing
- Chat history management
- Responsive design

## 🧪 Testing

### Test the API
```bash
# Run comprehensive API tests
python api_test.py
```

### Test in Browser
```bash
# Start server
python start_server.py

# Open demo.html in browser
open demo.html
```

### API Documentation
Visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI)

## 🗂️ Project Structure

```
health-chatbot/
├── main.py                 # FastAPI server with all specialist logic
├── app.py                  # Original Streamlit app 
├── requirements.txt        # Python dependencies
├── start_server.py        # Quick start script
├── api_test.py           # API testing script
├── demo.html             # Simple HTML demo
├── react-integration.md  # Complete React integration guide
└── README.md            # This file
```

## 🔄 Migration from Streamlit

The FastAPI backend maintains **100% functional compatibility** with your Streamlit app:

| Streamlit Feature | FastAPI Equivalent | Status |
|-------------------|-------------------|--------|
| Specialist routing | `POST /chat` with routing logic | ✅ Complete |
| File uploads | `POST /upload/pdf`, `/upload/image` | ✅ Complete |
| Chat history | Session-based storage | ✅ Complete |
| LangChain + Gemini | Identical setup | ✅ Complete |
| Specialist personas | Same prompt templates | ✅ Complete |
| Multimodal support | Image + PDF processing | ✅ Complete |

## 🚀 Production Considerations

For production deployment, consider:

- **Database**: Replace in-memory session storage with Redis/PostgreSQL
- **Authentication**: Add user authentication and authorization
- **Rate Limiting**: Implement API rate limiting
- **Monitoring**: Add logging, metrics, and health checks
- **Security**: Add CORS policies, input validation, API keys
- **Scaling**: Use Docker, load balancers, and horizontal scaling
- **Environment**: Use environment variables for sensitive config

## 🐛 Troubleshooting

### Server won't start
- Check if port 8000 is available: `lsof -i :8000`
- Verify Python dependencies: `pip install -r requirements.txt`
- Check Google API key is valid

### API returns errors
- Ensure server is running: `curl http://localhost:8000/`
- Check server logs for errors
- Verify request format matches API documentation

### Frontend can't connect
- Check CORS settings in `main.py`
- Verify API base URL is correct
- Check browser console for errors

## 📝 Next Steps

1. **Start the FastAPI server**: `python start_server.py`
2. **Test with demo**: Open `demo.html` in browser
3. **Build React frontend**: Follow `react-integration.md`
4. **Customize for your needs**: Modify specialists, prompts, or add features
5. **Deploy to production**: Use Docker, AWS, GCP, or similar platform

Your Streamlit functionality is now available as a scalable API! 🎉
