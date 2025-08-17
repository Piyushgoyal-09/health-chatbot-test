"""
Chat-related routes for the Elyx Health Concierge API
"""
import uuid
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from models import ChatRequest, ChatResponse, Message, SpecialistInfo
from utils import process_image_data, convert_history_for_chain, get_enhanced_context
from agents import team, ruby_agent, router_chain
from config import AVATARS, db_manager, plan_generator
from plan_generator import has_health_condition_keywords

router = APIRouter()

# In-memory session storage (use Redis/database in production)
# NOTE: With database integration, we'll mainly use this for temporary session state
chat_sessions: Dict[str, List[Dict[str, Any]]] = {}


@router.get("/specialists", response_model=List[SpecialistInfo])
async def get_specialists():
    """Get list of all available specialists"""
    specialists = [
        SpecialistInfo(name="Dr_Warren", avatar="🩺", description="Physician - Medical diagnostics, lab interpretation, symptoms"),
        SpecialistInfo(name="Advik", avatar="📈", description="Performance Scientist - Sleep, recovery, stress analysis"),
        SpecialistInfo(name="Neel", avatar="📊", description="Performance Scientist - Workout data, HRV, physical performance"),
        SpecialistInfo(name="Carla", avatar="🥗", description="Nutritionist - Diet, food analysis, supplements"),
        SpecialistInfo(name="Rachel", avatar="💪", description="Physiotherapist - Movement, strength training, injuries"),
        SpecialistInfo(name="Ruby", avatar="👤", description="Concierge - Scheduling, logistics, general support")
    ]
    return specialists


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint - processes message and returns response from appropriate specialist"""
    
    # Generate session ID if not provided
    if not request.session_id:
        request.session_id = str(uuid.uuid4())
    
    # Initialize session if it doesn't exist
    if request.session_id not in chat_sessions:
        chat_sessions[request.session_id] = [
            {
                "role": "ai",
                "speaker_name": "Ruby", 
                "content": "Hello! I'm Ruby, your concierge at Elyx. I'm here to help with scheduling, logistics, and connecting you with the right specialist on our team. How can I help you today?",
                "timestamp": datetime.now()
            }
        ]
    
    try:
        # Store user message in database first
        db_manager.store_chat_message(request.message, "user")
        
        # Process uploaded image if provided
        processed_image = None
        if request.image_data:
            print(f"📥 Received image data: {len(request.image_data)} characters")
            processed_image = process_image_data(request.image_data)
            print(f"🖼️  Image processed successfully: {processed_image.size}")
        
        # Prepare message data
        user_message = {
            "role": "user", 
            "content": request.message,
            "timestamp": datetime.now()
        }
        
        if processed_image:
            user_message["image_data"] = request.image_data
        if request.pdf_text:
            user_message["pdf_text"] = request.pdf_text
        
        # Add user message to session (for backwards compatibility)
        chat_sessions[request.session_id].append(user_message)
        
        # Get enhanced context using embeddings and recent history
        enhanced_context = get_enhanced_context(request.message)
        
        # Check if this message needs a health plan, is about progress, or wants to deactivate a plan
        plan_created = False
        plan_id = None
        plan_data = None
        plan_deactivated = False
        deactivated_plan_name = None
        
        # Check for deactivation keywords
        deactivation_keywords = ["deactivate", "stop", "quit", "cancel", "inactive", "don't want", "no longer", "end"]
        is_deactivation_request = any(keyword in request.message.lower() for keyword in deactivation_keywords)
        
        # First check if user is asking about progress/marking
        progress_keywords = ["mark", "progress", "completed", "finished", "done", "update", "track"]
        is_progress_request = any(keyword in request.message.lower() for keyword in progress_keywords)
        
        if is_deactivation_request:
            print(f"🛑 User wants to deactivate a plan - processing deactivation request")
            # Try to find which plan they want to deactivate
            # Look for plan-related keywords in their message
            plans = db_manager.get_active_plans()
            target_plan = None
            
            for plan in plans:
                plan_condition = plan["condition"].lower()
                plan_name = plan["plan_name"].lower()
                message_lower = request.message.lower()
                
                # Check if any significant words from the plan appear in the message
                condition_words = [word for word in plan_condition.split() if len(word) > 3]
                name_words = [word for word in plan_name.split() if len(word) > 3]
                
                if any(word in message_lower for word in condition_words + name_words):
                    target_plan = plan
                    break
            
            if target_plan:
                success = db_manager.deactivate_plan(target_plan["id"])
                if success:
                    plan_deactivated = True
                    deactivated_plan_name = target_plan["plan_name"]
                    print(f"✅ Successfully deactivated plan: {deactivated_plan_name}")
                else:
                    print(f"❌ Failed to deactivate plan: {target_plan['plan_name']}")
            else:
                print(f"⚠️  Could not identify which plan to deactivate")
        elif is_progress_request:
            print(f"📊 User asking about progress - not creating new plan")
        elif has_health_condition_keywords(request.message):
            print(f"🩺 Detected potential health condition, analyzing for plan generation...")
            plan_created, plan_id, plan_data = plan_generator.process_message_for_plan(
                request.message, enhanced_context
            )
            
            if plan_created:
                print(f"✅ Health plan created: {plan_id}")
            elif plan_data and plan_data.get("existing_plan"):
                print(f"📋 Using existing plan: {plan_data.get('plan_name')}")
        
        # Prepare input for LLM with enhanced context
        input_for_llm = request.message
        if request.pdf_text:
            input_for_llm += f"\n\nPDF Content:\n{request.pdf_text}"
        
        # Add context about plan creation or deactivation
        if plan_created:
            plan_summary = f"\n\n[SYSTEM: I have created a personalized {plan_data.get('timeline_days', 7)}-day plan for {plan_data.get('condition', 'your condition')} with {len(plan_data.get('tasks', []))} daily tasks. You can view and track progress on your dashboard.]"
            input_for_llm += plan_summary
        elif plan_deactivated and deactivated_plan_name:
            deactivation_summary = f"\n\n[SYSTEM: I have successfully deactivated the '{deactivated_plan_name}' plan as requested. The plan is no longer active and will not appear in your dashboard.]"
            input_for_llm += deactivation_summary
        
        # Route to appropriate specialist
        try:
            specialist_name = router_chain.invoke({"input": input_for_llm}).strip()
            if specialist_name not in team:
                specialist_name = "Ruby"
        except Exception as e:
            print(f"Error in routing: {e}")
            specialist_name = "Ruby"
        
        agent_to_use = team.get(specialist_name, ruby_agent)
        
        # Get response from specialist
        try:
            # Use enhanced context for better responses
            langchain_history = convert_history_for_chain(chat_sessions[request.session_id])
            
            print(f"🎯 Routing to specialist: {specialist_name}")
            if processed_image:
                print(f"📷 Including image in request to {specialist_name}")
            
            # Pass image to agent if available
            response = agent_to_use.invoke(
                history=langchain_history, 
                user_input=input_for_llm,
                image=processed_image
            )
            response_content = response.content
            print(f"💬 {specialist_name} response: {len(response_content)} characters")
            
            # AFTER getting AI response, check if it contains a detailed plan
            if not plan_created:  # Only if we haven't already created a plan
                print(f"🔍 Analyzing AI response for detailed daily plans...")
                ai_plan_created, ai_plan_id, ai_plan_data = plan_generator.process_ai_response_for_plan(response_content)
                
                if ai_plan_created:
                    print(f"✅ Extracted plan from AI response: {ai_plan_id}")
                    plan_created = True
                    plan_id = ai_plan_id
                    plan_data = ai_plan_data
                    
                    # Add note about plan creation to response
                    response_content += f"\n\n✅ **I've created a personalized {ai_plan_data.get('timeline_days', 7)}-day plan for you!** You can track your progress on the dashboard."
            
            # Check if user wants to mark progress and actually do it
            if any(keyword in request.message.lower() for keyword in ["mark", "completed", "finished", "done", "progress"]):
                print(f"🔄 User wants to mark progress - processing actual database updates...")
                
                # Get today's date
                today = datetime.now().strftime("%Y-%m-%d")
                
                # Find the right plan and mark tasks
                plans = db_manager.get_active_plans()
                updated_count = 0
                updated_tasks = []
                
                # Look for back pain plan or similar
                target_plan = None
                for plan in plans:
                    if "back pain" in plan["condition"].lower() or "back pain" in request.message.lower():
                        target_plan = plan
                        break
                
                if target_plan:
                    print(f"📋 Found target plan: {target_plan['plan_name']}")
                    
                    # Mark all pending tasks as complete for today
                    for task in target_plan["tasks"]:
                        if today not in task["progress"]:
                            success = db_manager.update_task_progress(target_plan["id"], task["task_name"], today)
                            if success:
                                updated_count += 1
                                updated_tasks.append(task["task_name"])
                    
                    if updated_count > 0:
                        print(f"✅ Actually marked {updated_count} tasks as completed in database")
                        
                        # Update the AI response to reflect what actually happened
                        actual_update_msg = f"\n\n✅ **I have successfully marked {updated_count} tasks as completed for today ({today})!**\n"
                        actual_update_msg += "\n**Updated in database:**\n"
                        for i, task in enumerate(updated_tasks[:3], 1):  # Show first 3
                            short_task = task.replace("Day 1-7: ", "").strip()[:50]
                            actual_update_msg += f"{i}. {short_task}... ✅\n"
                        if len(updated_tasks) > 3:
                            actual_update_msg += f"... and {len(updated_tasks) - 3} more tasks!\n"
                        
                        response_content = response_content.replace(
                            "I've marked them as complete", 
                            f"I have actually updated the database and marked {updated_count} tasks as complete"
                        )
                        response_content += actual_update_msg
                    else:
                        print(f"⚠️  No tasks were updated - they might already be complete for today")
                        response_content += f"\n\n📋 Note: All tasks for today ({today}) are already marked complete!"
            
        except Exception as e:
            print(f"❌ Error getting response from {specialist_name}: {e}")
            response_content = "I'm sorry, I encountered an issue processing your request. Could you please try again?"
        
        # Store AI response in database
        db_manager.store_chat_message(response_content, "ai", agent_to_use.name)
        
        # Add AI response to session (for backwards compatibility)
        ai_message = {
            "role": "ai",
            "speaker_name": agent_to_use.name,
            "content": response_content,
            "timestamp": datetime.now()
        }
        chat_sessions[request.session_id].append(ai_message)
        
        return ChatResponse(
            message=response_content,
            specialist_name=agent_to_use.name,
            session_id=request.session_id,
            avatar=AVATARS.get(agent_to_use.name, "👤"),
            timestamp=datetime.now(),
            plan_created=plan_created,
            plan_id=plan_id,
            plan_data=plan_data,
            plan_deactivated=plan_deactivated,
            deactivated_plan_name=deactivated_plan_name
        )
        
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chat/{session_id}/history", response_model=List[Message])
async def get_chat_history(session_id: str, limit: int = 20, offset: int = 0):
    """Get chat history for a session with pagination - only MongoDB messages for display"""
    try:
        # Get messages from MongoDB only (not from vector DB)
        db_messages = db_manager.get_last_messages(limit=100)  # Get more to handle pagination
        
        print(f"📚 Retrieved {len(db_messages)} messages from MongoDB for history")
        
        # Convert to Message objects
        all_messages = []
        for db_msg in db_messages:
            message = Message(
                role=db_msg["role"],
                content=db_msg["message"],
                speaker_name=db_msg.get("specialist_name"),
                pdf_text=None,  # Not stored in MongoDB history
                image_data=None,  # Not stored in MongoDB history  
                timestamp=db_msg["timestamp"]
            )
            all_messages.append(message)
        
        # Sort by timestamp (most recent first) and apply pagination
        all_messages.sort(key=lambda x: x.timestamp or datetime.min, reverse=True)
        
        # Apply offset and limit
        paginated_messages = all_messages[offset:offset + limit]
        
        print(f"📄 Returning {len(paginated_messages)} messages (offset: {offset}, limit: {limit})")
        
        # Return in chronological order (oldest first)
        return list(reversed(paginated_messages))
        
    except Exception as e:
        print(f"❌ Error getting chat history: {e}")
        # Return empty list if there's an error (graceful fallback)
        return []


@router.delete("/chat/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    if session_id in chat_sessions:
        del chat_sessions[session_id]
        return {"message": "Session deleted successfully"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")


@router.get("/sessions")
async def get_sessions():
    """Get all active session IDs"""
    return {"sessions": list(chat_sessions.keys())}
