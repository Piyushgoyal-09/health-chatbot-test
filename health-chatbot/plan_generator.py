"""
AI Agent for generating health task plans based on user conditions
"""
import re
import json
from typing import List, Dict, Optional, Tuple
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from database import get_db_manager
from datetime import datetime

class HealthPlanAgent:
    def __init__(self, llm):
        self.llm = llm
        self.db_manager = get_db_manager()
        
        # Plan generation prompt
        self.plan_prompt = ChatPromptTemplate.from_template("""
You are Dr. Warren, a physician at Elyx specializing in creating personalized health plans.

A user has mentioned a health condition or concern. Your task is to:
1. Analyze if this requires a structured plan with daily tasks
2. If yes, create a comprehensive plan with specific daily tasks

Health conditions that typically need structured plans include:
- Pain conditions (back pain, neck pain, joint pain)
- Mobility issues
- Stress/anxiety management
- Sleep disorders
- Recovery from injuries
- Chronic conditions requiring daily management
- Fitness goals

User's message: "{user_message}"

Context from previous conversations:
{context}

If this message indicates a health condition that would benefit from a structured plan, respond with:
```json
{{
    "needs_plan": true,
    "condition": "brief description of the condition",
    "plan_name": "descriptive plan name",
    "timeline_days": 7,
    "tasks": [
        "Task 1 - specific actionable task",
        "Task 2 - specific actionable task",
        "Task 3 - specific actionable task",
        "Task 4 - specific actionable task",
        "Task 5 - specific actionable task"
    ]
}}
```

If this is just a general health question or doesn't need a structured plan, respond with:
```json
{{
    "needs_plan": false,
    "reason": "explanation why no plan is needed"
}}
```

Guidelines for creating plans:
- Maximum 7 days timeline
- 5-8 specific, actionable tasks
- Tasks should be daily activities (e.g., "Take 10-minute walk", "Do 5 gentle back stretches", "Practice deep breathing for 5 minutes")
- Focus on evidence-based interventions
- Make tasks realistic and achievable
- Include both physical and lifestyle interventions when appropriate

Be strict about when plans are needed - only create plans for conditions that truly benefit from structured daily tasks.
""")
        
        self.plan_chain = self.plan_prompt | self.llm | StrOutputParser()

    def extract_daily_tasks_from_response(self, ai_response: str) -> Tuple[bool, Dict]:
        """
        Extract daily tasks from AI responses that contain detailed plans
        Returns: (has_plan, plan_data)
        """
        try:
            print(f"🔍 Analyzing AI response for daily tasks...")
            
            # Look for daily task patterns like "Day 1:", "Day 2:", etc.
            day_pattern = r'Day\s*(\d+):\s*([^.]+(?:\.[^D]*(?=Day\s*\d+|$))?)'
            matches = re.findall(day_pattern, ai_response, re.IGNORECASE | re.MULTILINE | re.DOTALL)
            
            if not matches:
                print("❌ No daily task pattern found")
                return False, {"error": "No daily tasks found in response"}
            
            # Extract plan details from the response
            condition_match = re.search(r'back\s*pain|neck\s*pain|stress|anxiety|injury|muscle|joint', ai_response.lower())
            condition = condition_match.group(0) if condition_match else "health condition"
            
            # Look for plan title
            title_patterns = [
                r'(\d+)-Day\s+([^:]+(?:Plan|Management|Program))',
                r'([^:]+(?:Plan|Management|Program))',
            ]
            
            plan_name = "Health Management Plan"
            for pattern in title_patterns:
                title_match = re.search(pattern, ai_response, re.IGNORECASE)
                if title_match:
                    if len(title_match.groups()) > 1:
                        plan_name = f"{title_match.group(1)}-Day {title_match.group(2)}"
                    else:
                        plan_name = title_match.group(1)
                    break
            
            # Process daily tasks
            tasks = []
            timeline_days = len(matches)
            
            for day_num, task_content in matches:
                # Clean up task content
                task_clean = task_content.strip()
                # Remove extra whitespace and newlines
                task_clean = ' '.join(task_clean.split())
                # Limit task length for display
                if len(task_clean) > 200:
                    task_clean = task_clean[:197] + "..."
                
                task_name = f"Day {day_num}: {task_clean}"
                tasks.append(task_name)
                
                print(f"✅ Extracted Day {day_num}: {task_clean[:50]}...")
            
            plan_data = {
                "needs_plan": True,
                "condition": condition,
                "plan_name": plan_name,
                "timeline_days": min(timeline_days, 7),  # Cap at 7 days
                "tasks": tasks
            }
            
            print(f"🎯 Successfully extracted {len(tasks)}-day plan: {plan_name}")
            return True, plan_data
            
        except Exception as e:
            print(f"❌ Error extracting tasks from response: {e}")
            return False, {"error": str(e)}

    def analyze_for_plan_generation(self, user_message: str, context: str = "") -> Tuple[bool, Dict]:
        """
        Analyze user message to determine if it needs a health plan
        Returns: (needs_plan, plan_data)
        """
        try:
            print(f"🎯 Analyzing message for plan generation: {user_message[:100]}...")
            
            response = self.plan_chain.invoke({
                "user_message": user_message,
                "context": context
            })
            
            print(f"📋 Plan analysis response: {response[:200]}...")
            
            # Extract JSON from response
            json_match = re.search(r'```json\s*(\{.*?\})\s*```', response, re.DOTALL)
            if not json_match:
                print("❌ No JSON found in plan response")
                return False, {"error": "No JSON found in response"}
            
            plan_data = json.loads(json_match.group(1))
            print(f"✅ Parsed plan data: {plan_data}")
            
            return plan_data.get("needs_plan", False), plan_data
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON parsing error: {e}")
            return False, {"error": f"JSON parsing error: {e}"}
        except Exception as e:
            print(f"❌ Error in plan analysis: {e}")
            return False, {"error": str(e)}

    def create_and_store_plan(self, plan_data: Dict) -> Optional[str]:
        """Create and store a health plan in the database"""
        try:
            if not plan_data.get("needs_plan", False):
                return None
            
            plan_name = plan_data.get("plan_name", "Health Plan")
            condition = plan_data.get("condition", "General Health")
            timeline_days = min(plan_data.get("timeline_days", 7), 7)  # Max 7 days
            tasks = plan_data.get("tasks", [])
            
            if not tasks:
                print("❌ No tasks found in plan data")
                return None
            
            print(f"💾 Creating plan: {plan_name} with {len(tasks)} tasks for {timeline_days} days")
            
            plan_id = self.db_manager.create_health_plan(
                plan_name=plan_name,
                condition=condition,
                timeline_days=timeline_days,
                tasks=tasks
            )
            
            print(f"✅ Plan created with ID: {plan_id}")
            return plan_id
            
        except Exception as e:
            print(f"❌ Error creating plan: {e}")
            return None

    def process_message_for_plan(self, user_message: str, context: str = "") -> Tuple[bool, Optional[str], Dict]:
        """
        Process a user message and create a plan if needed
        Returns: (plan_created, plan_id, plan_data)
        """
        # Check if user is asking about progress/marking - don't create new plan
        progress_keywords = ["mark", "progress", "completed", "finished", "done", "update", "track"]
        is_progress_request = any(keyword in user_message.lower() for keyword in progress_keywords)
        
        if is_progress_request:
            print(f"🔄 User asking about progress - not creating new plan")
            return False, None, {"progress_request": True}
        
        # Check if there's already an active plan for this condition
        existing_plans = self.db_manager.get_active_plans()
        condition_mentioned = user_message.lower()
        
        for plan in existing_plans:
            plan_condition = plan["condition"].lower()
            # Check if the condition is similar (contains key words)
            if any(word in condition_mentioned for word in plan_condition.split() if len(word) > 3):
                print(f"🔄 Active plan already exists for similar condition: {plan['plan_name']}")
                return False, plan["id"], {"existing_plan": True, "plan_name": plan["plan_name"]}
        
        needs_plan, plan_data = self.analyze_for_plan_generation(user_message, context)
        
        if needs_plan and "error" not in plan_data:
            plan_id = self.create_and_store_plan(plan_data)
            return True, plan_id, plan_data
        
        return False, None, plan_data

    def process_ai_response_for_plan(self, ai_response: str) -> Tuple[bool, Optional[str], Dict]:
        """
        Process an AI response and extract/create a plan if it contains daily tasks
        Returns: (plan_created, plan_id, plan_data)
        """
        has_plan, plan_data = self.extract_daily_tasks_from_response(ai_response)
        
        if has_plan and "error" not in plan_data:
            # Check if there's already an active plan for this condition
            existing_plans = self.db_manager.get_active_plans()
            condition = plan_data.get("condition", "").lower()
            
            for plan in existing_plans:
                plan_condition = plan["condition"].lower()
                # Check if the condition is similar (contains key words)
                if any(word in condition for word in plan_condition.split() if len(word) > 3):
                    print(f"🔄 Active plan already exists for {plan_condition} - not creating duplicate")
                    return False, plan["id"], {"existing_plan": True, "plan_name": plan["plan_name"]}
            
            plan_id = self.create_and_store_plan(plan_data)
            return True, plan_id, plan_data
        
        return False, None, plan_data

# Health condition keywords for quick detection
HEALTH_CONDITION_KEYWORDS = [
    # Pain conditions
    "back pain", "neck pain", "shoulder pain", "knee pain", "hip pain", "joint pain",
    "headache", "migraine", "muscle pain", "chronic pain", "sciatica",
    "pain", "ache", "aching", "hurt", "hurts", "hurting", "sore", "soreness",
    
    # Mobility/physical issues
    "stiff", "stiffness", "mobility", "flexibility", "range of motion", "posture",
    "injured", "injury", "sprain", "strain", "pulled muscle", "tight muscles",
    
    # Mental health/stress
    "stress", "stressed", "anxiety", "anxious", "depression", "depressed", 
    "overwhelmed", "burnout", "sleep problems", "insomnia", "tired", "fatigue",
    "mental health", "mood", "irritable", "restless",
    
    # Fitness/recovery
    "fitness goals", "weight loss", "strength training", "cardio",
    "recovery", "rehabilitation", "physical therapy", "exercise",
    "workout", "training", "fitness",
    
    # Chronic conditions
    "diabetes", "hypertension", "high blood pressure", "cholesterol",
    "arthritis", "fibromyalgia", "chronic fatigue", "chronic condition",
    
    # General symptoms
    "dizzy", "nausea", "weakness", "swollen", "inflammation",
    "breathing problems", "chest pain", "irregular heartbeat"
]

def has_health_condition_keywords(text: str) -> bool:
    """Quick check if text contains health condition keywords"""
    text_lower = text.lower()
    return any(keyword in text_lower for keyword in HEALTH_CONDITION_KEYWORDS)

def get_plan_generator(llm) -> HealthPlanAgent:
    """Get or create a health plan generator instance"""
    return HealthPlanAgent(llm)
