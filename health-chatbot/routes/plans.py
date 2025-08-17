"""
Health plan management routes for the Elyx Health Concierge API
"""
from datetime import datetime
from typing import List, Dict
from fastapi import APIRouter, HTTPException
from models import (
    HealthPlanResponse, TaskProgressRequest, PlanProgressResponse,
    MultipleProgressRequest, ProgressReportRequest
)
from config import db_manager

router = APIRouter()


@router.get("/plans", response_model=List[HealthPlanResponse])
async def get_active_plans():
    """Get all active health plans"""
    try:
        plans = db_manager.get_active_plans()
        return [HealthPlanResponse(**plan) for plan in plans]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plans: {str(e)}")


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get a specific health plan"""
    try:
        plans = db_manager.get_active_plans()
        plan = next((p for p in plans if p["id"] == plan_id), None)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        return HealthPlanResponse(**plan)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching plan: {str(e)}")


@router.post("/plans/{plan_id}/progress")
async def update_task_progress(plan_id: str, request: TaskProgressRequest):
    """Update progress for a specific task in a plan"""
    try:
        success = db_manager.update_task_progress(
            plan_id=request.plan_id,
            task_name=request.task_name,
            date=request.date
        )
        if not success:
            raise HTTPException(status_code=404, detail="Plan or task not found")
        return {"message": "Progress updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")


@router.post("/test/mark-all-back-pain-tasks")
async def test_mark_all_back_pain_tasks():
    """Test endpoint to mark all back pain tasks as complete for today"""
    try:
        plans = db_manager.get_active_plans()
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Find back pain plan
        back_pain_plan = None
        for plan in plans:
            if "back pain" in plan["condition"].lower():
                back_pain_plan = plan
                break
        
        if not back_pain_plan:
            return {"error": "No back pain plan found", "plans": [p["condition"] for p in plans]}
        
        updated_count = 0
        results = []
        
        for task in back_pain_plan["tasks"]:
            task_name = task["task_name"]
            if today not in task.get("progress", []):
                print(f"🔄 Updating task: {task_name[:50]}...")
                success = db_manager.update_task_progress(back_pain_plan["id"], task_name, today)
                results.append({
                    "task": task_name[:50] + "...",
                    "success": success
                })
                if success:
                    updated_count += 1
        
        return {
            "plan_name": back_pain_plan["plan_name"],
            "plan_id": back_pain_plan["id"],
            "date": today,
            "updated_count": updated_count,
            "total_tasks": len(back_pain_plan["tasks"]),
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")


@router.get("/plans/{plan_id}/progress", response_model=PlanProgressResponse)
async def get_plan_progress(plan_id: str):
    """Get progress statistics for a plan"""
    try:
        plans = db_manager.get_active_plans()
        plan = next((p for p in plans if p["id"] == plan_id), None)
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        
        # Calculate progress statistics
        total_tasks = len(plan["tasks"])
        completed_tasks = 0
        daily_progress = {}
        
        for task in plan["tasks"]:
            for date in task["progress"]:
                if date not in daily_progress:
                    daily_progress[date] = {"completed": 0, "total": total_tasks}
                daily_progress[date]["completed"] += 1
        
        # Calculate overall completion percentage
        if total_tasks > 0:
            # Count unique task completions (at least one completion per task)
            tasks_with_progress = sum(1 for task in plan["tasks"] if task["progress"])
            progress_percentage = (tasks_with_progress / total_tasks) * 100
        else:
            progress_percentage = 0
        
        # Convert daily progress to list format
        daily_progress_list = [
            {"date": date, "completed": stats["completed"], "total": stats["total"]}
            for date, stats in sorted(daily_progress.items())
        ]
        
        return PlanProgressResponse(
            plan_id=plan["id"],
            plan_name=plan["plan_name"],
            condition=plan["condition"],
            timeline_days=plan["timeline_days"],
            total_tasks=total_tasks,
            completed_tasks=tasks_with_progress if total_tasks > 0 else 0,
            progress_percentage=progress_percentage,
            daily_progress=daily_progress_list
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting plan progress: {str(e)}")


@router.delete("/plans/{plan_id}")
async def deactivate_plan(plan_id: str):
    """Deactivate a health plan"""
    try:
        success = db_manager.deactivate_plan(plan_id)
        if not success:
            raise HTTPException(status_code=404, detail="Plan not found")
        return {"message": "Plan deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deactivating plan: {str(e)}")


@router.get("/dashboard/summary")
async def get_dashboard_summary():
    """Get dashboard summary with overall statistics"""
    try:
        plans = db_manager.get_active_plans()
        
        if not plans:
            return {
                "total_active_plans": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "overall_progress": 0,
                "recent_activity": []
            }
        
        total_tasks = 0
        completed_tasks = 0
        recent_activity = []
        
        for plan in plans:
            plan_tasks = len(plan["tasks"])
            total_tasks += plan_tasks
            
            # Count tasks with any progress
            plan_completed = sum(1 for task in plan["tasks"] if task["progress"])
            completed_tasks += plan_completed
            
            # Get recent activity from this plan
            for task in plan["tasks"]:
                for date in task["progress"][-3:]:  # Last 3 completions per task
                    recent_activity.append({
                        "date": date,
                        "plan_name": plan["plan_name"],
                        "task_name": task["task_name"],
                        "type": "task_completed"
                    })
        
        # Sort recent activity by date (most recent first)
        recent_activity.sort(key=lambda x: x["date"], reverse=True)
        recent_activity = recent_activity[:10]  # Keep only 10 most recent
        
        overall_progress = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "total_active_plans": len(plans),
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "overall_progress": round(overall_progress, 1),
            "recent_activity": recent_activity
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting dashboard summary: {str(e)}")


# Progress Tracking Endpoints

@router.get("/progress/check-daily")
async def check_daily_progress():
    """Check if user should be asked about daily progress"""
    try:
        plans = db_manager.get_active_plans()
        if not plans:
            return {"should_ask": False, "message": "No active plans"}
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Check if user has any pending tasks for today
        pending_tasks = []
        for plan in plans:
            for task in plan["tasks"]:
                if today not in task["progress"]:
                    pending_tasks.append({
                        "plan_id": plan["id"],
                        "plan_name": plan["plan_name"],
                        "task_name": task["task_name"]
                    })
        
        if pending_tasks:
            return {
                "should_ask": True,
                "message": f"You have {len(pending_tasks)} pending tasks for today!",
                "pending_tasks": pending_tasks,
                "date": today
            }
        
        return {
            "should_ask": False,
            "message": "All tasks completed for today! Great job! 🎉"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking daily progress: {str(e)}")


@router.post("/progress/update-multiple")
async def update_multiple_tasks_progress(request: MultipleProgressRequest):
    """Update progress for multiple tasks at once"""
    try:
        results = []
        today = datetime.now().strftime("%Y-%m-%d")
        
        for update in request.updates:
            plan_id = update.get("plan_id")
            task_name = update.get("task_name")
            completed = update.get("completed", "false").lower() == "true"
            date = update.get("date", today)
            
            if completed:
                success = db_manager.update_task_progress(plan_id, task_name, date)
                results.append({
                    "plan_id": plan_id,
                    "task_name": task_name,
                    "success": success
                })
            
        return {"results": results, "message": f"Updated {len(results)} tasks"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating progress: {str(e)}")


@router.post("/progress/daily-report")
async def daily_progress_report(request: ProgressReportRequest):
    """Process user's daily progress report through chat"""
    try:
        message = request.message
        
        # Store user's progress message
        db_manager.store_chat_message(message, "user")
        
        # Check for progress indicators in the message
        progress_indicators = ["done", "completed", "finished", "did", "yes", "✅", "✓", "all", "everything"]
        negative_indicators = ["didn't", "couldn't", "missed", "no", "skipped", "❌", "✗"]
        
        # Get today's pending tasks
        plans = db_manager.get_active_plans()
        today = datetime.now().strftime("%Y-%m-%d")
        message_lower = message.lower()
        
        updated_tasks = []
        
        # If user wants to mark all tasks for a specific condition
        if request.mark_all_complete or "mark all" in message_lower or "all tasks" in message_lower:
            target_condition = request.specific_plan_condition
            
            # Find the right plan
            target_plan = None
            if target_condition:
                for plan in plans:
                    if any(word in plan["condition"].lower() for word in target_condition.lower().split() if len(word) > 3):
                        target_plan = plan
                        break
            else:
                # Find plan based on keywords in message
                for plan in plans:
                    plan_words = plan["condition"].lower().split()
                    if any(word in message_lower for word in plan_words if len(word) > 3):
                        target_plan = plan
                        break
            
            if target_plan:
                # Mark all pending tasks for today as complete
                for task in target_plan["tasks"]:
                    if today not in task["progress"]:
                        success = db_manager.update_task_progress(target_plan["id"], task["task_name"], today)
                        if success:
                            updated_tasks.append(task["task_name"])
                            
                print(f"✅ Marked all {len(updated_tasks)} tasks complete for plan: {target_plan['plan_name']}")
        
        else:
            # Individual task matching
            for plan in plans:
                for task in plan["tasks"]:
                    task_name = task["task_name"]
                    if today not in task["progress"]:
                        # Check if task is mentioned and marked as complete
                        if any(indicator in message_lower for indicator in progress_indicators):
                            # If task contains key words from message or message is generally positive
                            if (any(word in task_name.lower() for word in message_lower.split() if len(word) > 3) or
                                len([ind for ind in progress_indicators if ind in message_lower]) >= 2):
                                
                                success = db_manager.update_task_progress(plan["id"], task_name, today)
                                if success:
                                    updated_tasks.append(task_name)
        
        # Generate encouraging response
        if updated_tasks:
            response = f"Excellent! I've marked {len(updated_tasks)} tasks as completed for today ({today}):\n\n"
            for i, task in enumerate(updated_tasks[:5], 1):  # Show max 5 tasks
                response += f"✅ {i}. {task[:60]}{'...' if len(task) > 60 else ''}\n"
            
            if len(updated_tasks) > 5:
                response += f"... and {len(updated_tasks) - 5} more tasks!\n"
            
            response += f"\nFantastic progress! Keep up the excellent work! 💪🎉"
        else:
            response = "I understand. Remember that consistency is key, and it's okay to have challenging days. Try to do what you can, and don't be too hard on yourself. Tomorrow is a new opportunity! 🌟"
        
        # Store AI response
        db_manager.store_chat_message(response, "ai", "Ruby")
        
        return {"message": response, "updated_tasks": len(updated_tasks), "tasks_marked": updated_tasks}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing daily report: {str(e)}")
