"""
Specialist agents for the Elyx Health Concierge API
"""
from datetime import datetime
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
import google.generativeai as genai
from database import get_db_manager
from config import llm, specialist_prompt_templates, router_prompt_template


# Specialist Agent Class - enhanced with database access
class SpecialistAgent:
    def __init__(self, name, template, llm):
        self.name = name
        self.template = template  # Store template for direct API use
        self.db_manager = get_db_manager()  # Add database access
        prompt = ChatPromptTemplate.from_messages(
            [("system", template), MessagesPlaceholder(variable_name="history"), ("human", "{input}")]
        )
        self.chain = prompt | llm

    def get_current_tasks_info(self) -> str:
        """Get information about current active plans and today's tasks"""
        try:
            plans = self.db_manager.get_active_plans()
            if not plans:
                return "No active health plans found."
            
            today = datetime.now().strftime("%Y-%m-%d")
            info_parts = []
            
            info_parts.append("=== CURRENT ACTIVE PLANS ===")
            
            for plan in plans:
                info_parts.append(f"\nPlan: {plan['plan_name']}")
                info_parts.append(f"Condition: {plan['condition']}")
                info_parts.append(f"Timeline: {plan['timeline_days']} days")
                info_parts.append(f"Created: {plan['created_at'].strftime('%Y-%m-%d')}")
                
                info_parts.append("\nTasks for today:")
                today_tasks = []
                completed_today = []
                
                for task in plan['tasks']:
                    task_name = task['task_name']
                    progress = task['progress']
                    
                    if today in progress:
                        completed_today.append(task_name)
                    else:
                        today_tasks.append(task_name)
                
                if today_tasks:
                    info_parts.append("⏳ PENDING TODAY:")
                    for task in today_tasks:
                        info_parts.append(f"  - {task}")
                
                if completed_today:
                    info_parts.append("✅ COMPLETED TODAY:")
                    for task in completed_today:
                        info_parts.append(f"  - {task}")
                
                if not today_tasks and not completed_today:
                    info_parts.append("  No tasks scheduled for today")
            
            return "\n".join(info_parts)
            
        except Exception as e:
            return f"Error getting tasks info: {str(e)}"
    
    def update_task_progress(self, plan_id: str, task_name: str, date: str = None) -> bool:
        """Update progress for a specific task"""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        return self.db_manager.update_task_progress(plan_id, task_name, date)
    
    def deactivate_plan(self, plan_id: str) -> bool:
        """Deactivate a health plan"""
        return self.db_manager.deactivate_plan(plan_id)
    
    def find_plan_by_condition(self, condition_keywords: str) -> dict:
        """Find an active plan that matches condition keywords"""
        try:
            plans = self.db_manager.get_active_plans()
            condition_lower = condition_keywords.lower()
            
            for plan in plans:
                plan_condition = plan["condition"].lower()
                plan_name = plan["plan_name"].lower()
                
                # Check if any words from the condition appear in the plan
                condition_words = condition_lower.split()
                for word in condition_words:
                    if len(word) > 3 and (word in plan_condition or word in plan_name):
                        return plan
            
            return None
        except Exception as e:
            print(f"❌ Error finding plan: {e}")
            return None

    def invoke(self, history, user_input, image=None):
        """Invoke the agent with optional image support and task context"""
        
        # Check if user is asking about progress, tasks, or marking completion
        progress_keywords = ["progress", "mark", "completed", "finished", "done", "update", "task", "plan", "dashboard"]
        needs_task_info = any(keyword in user_input.lower() for keyword in progress_keywords)
        
        # Add current tasks information to input if relevant
        enhanced_input = user_input
        if needs_task_info:
            tasks_info = self.get_current_tasks_info()
            enhanced_input = f"{user_input}\n\n{tasks_info}"
            print(f"📋 Added current tasks info to {self.name}'s context")
        
        if image:
            try:
                print(f"🖼️ {self.name} processing image with direct Gemini API...")
                print(f"📊 Image: {type(image)}, Size: {image.size}")
                
                # Use direct Google Generative AI for image processing
                model = genai.GenerativeModel('gemini-1.5-flash-latest')
                
                # Prepare the prompt with specialist personality
                specialist_intro = self.template.split('{input}')[0].strip()
                full_prompt = f"{specialist_intro}\n\n{enhanced_input}"
                
                print(f"🚀 Sending image + text to Gemini directly...")
                
                # Generate response with image
                response = model.generate_content([full_prompt, image])
                
                print(f"✅ {self.name} successfully analyzed the image!")
                print(f"💬 Response length: {len(response.text)} characters")
                
                # Create a response object that matches LangChain's format
                class DirectResponse:
                    def __init__(self, content):
                        self.content = content
                
                return DirectResponse(response.text)
                
            except Exception as e:
                print(f"❌ Direct image processing failed for {self.name}: {type(e).__name__}: {str(e)}")
                import traceback
                print(traceback.format_exc())
                # Fallback to text-only
                enhanced_input += "\n\n[Note: An image was provided but I'm having trouble processing it. Please describe what you see in the image.]" 
        
        return self.chain.invoke({"input": enhanced_input, "history": history})


# Create router chain and specialist agents
router_prompt = ChatPromptTemplate.from_template(router_prompt_template)
router_chain = router_prompt | llm | StrOutputParser()

ruby_agent = SpecialistAgent(name="Ruby", template=specialist_prompt_templates["Ruby"], llm=llm)
dr_warren_agent = SpecialistAgent(name="Dr_Warren", template=specialist_prompt_templates["Dr_Warren"], llm=llm)
advik_agent = SpecialistAgent(name="Advik", template=specialist_prompt_templates["Advik"], llm=llm)
neel_agent = SpecialistAgent(name="Neel", template=specialist_prompt_templates["Neel"], llm=llm)
carla_agent = SpecialistAgent(name="Carla", template=specialist_prompt_templates["Carla"], llm=llm)
rachel_agent = SpecialistAgent(name="Rachel", template=specialist_prompt_templates["Rachel"], llm=llm)

team = {
    "Ruby": ruby_agent,
    "Dr_Warren": dr_warren_agent,
    "Advik": advik_agent,
    "Neel": neel_agent,
    "Carla": carla_agent,
    "Rachel": rachel_agent,
}
