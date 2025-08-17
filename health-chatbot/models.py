"""
Pydantic models for the Elyx Health Concierge API
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class Message(BaseModel):
    role: str
    content: str
    speaker_name: Optional[str] = None
    pdf_text: Optional[str] = None
    image_data: Optional[str] = None  # base64 encoded image
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    image_data: Optional[str] = None  # base64 encoded
    pdf_text: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    specialist_name: str
    session_id: str
    avatar: str
    timestamp: datetime
    plan_created: bool = False
    plan_id: Optional[str] = None
    plan_data: Optional[Dict] = None
    plan_deactivated: bool = False
    deactivated_plan_name: Optional[str] = None


class ChatSession(BaseModel):
    session_id: str
    messages: List[Message]
    created_at: datetime


class SpecialistInfo(BaseModel):
    name: str
    avatar: str
    description: str


class HealthPlanResponse(BaseModel):
    id: str
    plan_name: str
    condition: str
    timeline_days: int
    tasks: List[Dict]
    created_at: datetime
    updated_at: datetime


class TaskProgressRequest(BaseModel):
    plan_id: str
    task_name: str
    date: str  # YYYY-MM-DD format


class PlanProgressResponse(BaseModel):
    plan_id: str
    plan_name: str
    condition: str
    timeline_days: int
    total_tasks: int
    completed_tasks: int
    progress_percentage: float
    daily_progress: List[Dict]  # [{"date": "2024-01-01", "completed": 3, "total": 5}]


class MultipleProgressRequest(BaseModel):
    updates: List[Dict[str, str]]  # [{"plan_id": "id", "task_name": "name", "date": "2024-01-01", "completed": "true"}]


class ProgressReportRequest(BaseModel):
    message: str
    mark_all_complete: bool = False
    specific_plan_condition: Optional[str] = None
