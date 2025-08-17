"""
Utility functions for the Elyx Health Concierge API
"""
import io
import base64
from datetime import datetime
from typing import List, Dict, Any
import PyPDF2
from PIL import Image
from langchain_core.messages import HumanMessage, AIMessage
from fastapi import HTTPException
from config import db_manager


def convert_history_for_chain(history):
    """Convert chat history to LangChain message format"""
    messages = []
    for msg in history:
        content = msg["content"]
        
        # Handle messages with additional context (PDF text)
        if "pdf_text" in msg:
            content += f"\n\nPDF Content: {msg['pdf_text'][:1000]}..." if len(msg['pdf_text']) > 1000 else f"\n\nPDF Content: {msg['pdf_text']}"
        
        # Add note about images
        if "image_data" in msg:
            content += "\n[Note: This message included an image]"
            
        messages.append(HumanMessage(content=content) if msg["role"] == "user" else AIMessage(content=content))
    return messages


def get_enhanced_context(user_message: str) -> str:
    """
    Get enhanced context for LLM using embeddings and recent history
    NOTE: This is ONLY used for providing context to the LLM, NOT for chat display
    """
    context_parts = []
    
    # Get relevant context from embeddings (Pinecone vector search)
    # This finds semantically similar past conversations
    relevant_context = db_manager.get_relevant_context(user_message, top_k=3)
    if relevant_context:
        context_parts.append("=== RELEVANT CONVERSATION HISTORY ===")
        for ctx in relevant_context:
            context_parts.append(f"[{ctx['timestamp']}] {ctx['role']}: {ctx['message']}")
        context_parts.append("")
    
    # Get recent messages from MongoDB for continuity
    recent_messages = db_manager.get_last_messages(limit=10)
    if recent_messages:
        context_parts.append("=== RECENT CONVERSATION ===")
        for msg in recent_messages:
            speaker = msg.get('specialist_name', msg['role'])
            context_parts.append(f"{speaker}: {msg['message']}")
        context_parts.append("")
    
    context_str = "\n".join(context_parts)
    print(f"🧠 Generated context for LLM: {len(context_str)} characters")
    return context_str


def process_progress_from_ai_response(ai_response: str, user_message: str) -> int:
    """
    Process AI response and user message to automatically mark task progress
    Returns: number of tasks marked as completed
    """
    try:
        # Get active plans to check against
        plans = db_manager.get_active_plans()
        if not plans:
            return 0
        
        today = datetime.now().strftime("%Y-%m-%d")
        updated_count = 0
        
        # Look for completion indicators in user message
        completion_words = ["did", "completed", "finished", "done", "yes", "✅", "✓"]
        user_lower = user_message.lower()
        
        # Check if user message indicates they completed tasks
        user_indicates_completion = any(word in user_lower for word in completion_words)
        
        # Look for task-related keywords in user message and AI confirmation
        if user_indicates_completion:
            for plan in plans:
                for task in plan["tasks"]:
                    task_name = task["task_name"]
                    task_lower = task_name.lower()
                    
                    # Skip already completed tasks
                    if today in task["progress"]:
                        continue
                    
                    # Check if user mentioned this task and AI acknowledged it
                    task_keywords = [word for word in task_lower.split() if len(word) > 3]
                    user_mentioned_task = any(keyword in user_lower for keyword in task_keywords)
                    
                    # If user mentioned task elements and indicated completion
                    if user_mentioned_task:
                        # Mark as completed
                        success = db_manager.update_task_progress(plan["id"], task_name, today)
                        if success:
                            updated_count += 1
                            print(f"✅ Auto-marked task completed: {task_name[:50]}...")
        
        return updated_count
        
    except Exception as e:
        print(f"❌ Error processing progress from AI response: {e}")
        return 0


def process_pdf_bytes(pdf_bytes):
    """Extract text from PDF bytes"""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        return f"Error processing PDF: {str(e)}"


def process_image_data(image_data):
    """Process base64 image data and return PIL Image object"""
    try:
        # Remove data:image/jpeg;base64, or similar prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        return image
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")
