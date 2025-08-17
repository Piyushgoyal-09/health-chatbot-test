"""
Database models and connections for MongoDB and Pinecone
"""
import os
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pymongo import MongoClient
from pinecone import Pinecone
from sentence_transformers import SentenceTransformer
import numpy as np
from pydantic import BaseModel
import uuid

# Database Models
class TaskProgress(BaseModel):
    task_name: str
    progress: List[str]  # List of dates when task was completed (YYYY-MM-DD format)

class HealthPlan(BaseModel):
    id: Optional[str] = None
    user_id: str = "default_user"  # Since we have single user for now
    plan_name: str
    condition: str  # e.g., "back pain"
    timeline_days: int  # max 7 days
    tasks: List[TaskProgress]
    active: bool = True
    created_at: datetime
    updated_at: datetime

class SpecialistStats(BaseModel):
    id: Optional[str] = None
    user_id: str = "default_user"
    specialist_name: str  # e.g., "Dr_Warren", "Advik", etc.
    total_words_generated: int = 0
    total_messages_sent: int = 0
    last_activity: datetime
    daily_word_counts: Dict[str, int] = {}  # {"2024-01-01": 150, "2024-01-02": 200}

class ChatMessage(BaseModel):
    id: Optional[str] = None
    user_id: str = "default_user"
    message: str
    role: str  # "user" or "ai"
    specialist_name: Optional[str] = None
    timestamp: datetime
    embedding_id: Optional[str] = None  # Reference to Pinecone vector

class DatabaseManager:
    def __init__(self):
        self.mongodb_uri = os.getenv('MONGODB_URI')
        self.pinecone_api_key = os.getenv('PINECONE_API_KEY')
        self.pinecone_environment = os.getenv('PINECONE_ENVIRONMENT', 'us-east-1')
        self.pinecone_index_name = os.getenv('PINECONE_INDEX_NAME', 'elyx-chat-history')
        
        # Initialize MongoDB
        if self.mongodb_uri:
            self.mongo_client = MongoClient(self.mongodb_uri)
            self.db = self.mongo_client.elyx_health
            self.plans_collection = self.db.health_plans
            self.chat_collection = self.db.chat_history
            self.specialist_stats_collection = self.db.specialist_stats
        else:
            print("⚠️  MongoDB URI not found. Please set MONGODB_URI environment variable.")
            self.mongo_client = None
            self.db = None
        
        # Initialize Pinecone
        if self.pinecone_api_key:
            try:
                self.pc = Pinecone(api_key=self.pinecone_api_key)
                
                # Create index if it doesn't exist
                existing_indexes = [index.name for index in self.pc.list_indexes()]
                if self.pinecone_index_name not in existing_indexes:
                    from pinecone import ServerlessSpec
                    self.pc.create_index(
                        name=self.pinecone_index_name,
                        dimension=384,  # all-MiniLM-L6-v2 dimension
                        metric='cosine',
                        spec=ServerlessSpec(cloud='aws', region='us-east-1')
                    )
                
                self.pinecone_index = self.pc.Index(self.pinecone_index_name)
                print(f"✅ Connected to Pinecone index: {self.pinecone_index_name}")
            except Exception as e:
                print(f"❌ Error connecting to Pinecone: {e}")
                self.pinecone_index = None
        else:
            print("⚠️  Pinecone API key not found. Please set PINECONE_API_KEY environment variable.")
            self.pinecone_index = None
        
        # Initialize embedding model
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            print("✅ Loaded embedding model: all-MiniLM-L6-v2")
        except Exception as e:
            print(f"❌ Error loading embedding model: {e}")
            self.embedding_model = None

    def create_embedding(self, text: str) -> List[float]:
        """Create embedding for text"""
        if not self.embedding_model:
            return []
        
        try:
            embedding = self.embedding_model.encode(text).tolist()
            return embedding
        except Exception as e:
            print(f"❌ Error creating embedding: {e}")
            return []

    def store_chat_message(self, message: str, role: str, specialist_name: Optional[str] = None) -> str:
        """Store chat message in MongoDB and create embedding in Pinecone"""
        try:
            # Create embedding
            embedding = self.create_embedding(message)
            embedding_id = str(uuid.uuid4())
            
            # Store in Pinecone if available
            if self.pinecone_index and embedding:
                try:
                    metadata = {
                        "role": role,
                        "specialist": specialist_name or "",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "message": message[:500]  # Store first 500 chars in metadata
                    }
                    
                    self.pinecone_index.upsert([{
                        "id": embedding_id,
                        "values": embedding,
                        "metadata": metadata
                    }])
                    print(f"✅ Stored embedding in Pinecone: {embedding_id}")
                except Exception as e:
                    print(f"❌ Error storing in Pinecone: {e}")
                    embedding_id = None
            
            # Store in MongoDB if available
            if self.chat_collection is not None:
                chat_message = {
                    "_id": str(uuid.uuid4()),
                    "user_id": "default_user",
                    "message": message,
                    "role": role,
                    "specialist_name": specialist_name,
                    "timestamp": datetime.now(timezone.utc),
                    "embedding_id": embedding_id
                }
                
                result = self.chat_collection.insert_one(chat_message)
                print(f"✅ Stored message in MongoDB: {result.inserted_id}")
                
                # Update specialist stats if this is an AI message
                if role == "ai" and specialist_name:
                    self.update_specialist_word_count(specialist_name, message)
                
                return str(result.inserted_id)
            
            return str(uuid.uuid4())  # Return a dummy ID if no storage
            
        except Exception as e:
            print(f"❌ Error storing chat message: {e}")
            return str(uuid.uuid4())

    def get_relevant_context(self, query: str, top_k: int = 5) -> List[Dict]:
        """Get relevant chat context using embeddings"""
        if not self.pinecone_index or not self.embedding_model:
            return []
        
        try:
            # Create embedding for query
            query_embedding = self.create_embedding(query)
            if not query_embedding:
                return []
            
            # Search in Pinecone
            results = self.pinecone_index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            context = []
            for match in results.matches:
                context.append({
                    "message": match.metadata.get("message", ""),
                    "role": match.metadata.get("role", ""),
                    "specialist": match.metadata.get("specialist", ""),
                    "timestamp": match.metadata.get("timestamp", ""),
                    "score": match.score
                })
            
            print(f"✅ Found {len(context)} relevant context messages")
            return context
            
        except Exception as e:
            print(f"❌ Error getting relevant context: {e}")
            return []

    def get_last_messages(self, limit: int = 10) -> List[Dict]:
        """Get last N messages from MongoDB for chat history display"""
        if self.chat_collection is None:
            return []
        
        try:
            messages = list(self.chat_collection.find(
                {"user_id": "default_user"},
                sort=[("timestamp", -1)],  # Most recent first
                limit=limit
            ))
            
            print(f"📚 Retrieved {len(messages)} messages from MongoDB")
            
            return [{
                "message": msg["message"],
                "role": msg["role"],
                "specialist_name": msg.get("specialist_name"),
                "timestamp": msg["timestamp"]
            } for msg in messages]
            
        except Exception as e:
            print(f"❌ Error getting last messages: {e}")
            return []

    def create_health_plan(self, plan_name: str, condition: str, timeline_days: int, tasks: List[str]) -> str:
        """Create a new health plan"""
        if self.plans_collection is None:
            return str(uuid.uuid4())  # Return dummy ID if no storage
        
        try:
            # Convert task names to TaskProgress objects
            task_objects = [TaskProgress(task_name=task, progress=[]) for task in tasks]
            
            plan = {
                "_id": str(uuid.uuid4()),
                "user_id": "default_user",
                "plan_name": plan_name,
                "condition": condition,
                "timeline_days": min(timeline_days, 7),  # Ensure max 7 days
                "tasks": [{"task_name": task.task_name, "progress": task.progress} for task in task_objects],
                "active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = self.plans_collection.insert_one(plan)
            print(f"✅ Created health plan: {result.inserted_id}")
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"❌ Error creating health plan: {e}")
            return str(uuid.uuid4())

    def get_active_plans(self) -> List[Dict]:
        """Get all active health plans"""
        if self.plans_collection is None:
            return []
        
        try:
            plans = list(self.plans_collection.find(
                {"user_id": "default_user", "active": True},
                sort=[("created_at", -1)]
            ))
            
            return [{
                "id": plan["_id"],
                "plan_name": plan["plan_name"],
                "condition": plan["condition"],
                "timeline_days": plan["timeline_days"],
                "tasks": plan["tasks"],
                "created_at": plan["created_at"],
                "updated_at": plan["updated_at"]
            } for plan in plans]
            
        except Exception as e:
            print(f"❌ Error getting active plans: {e}")
            return []

    def update_task_progress(self, plan_id: str, task_name: str, date: str) -> bool:
        """Update progress for a specific task in a plan"""
        if self.plans_collection is None:
            return False
        
        try:
            # Find the plan and update the specific task
            plan = self.plans_collection.find_one({"_id": plan_id, "user_id": "default_user"})
            if not plan:
                return False
            
            # Update the task progress
            for task in plan["tasks"]:
                if task["task_name"] == task_name:
                    if date not in task["progress"]:
                        task["progress"].append(date)
                    break
            
            # Save back to database
            self.plans_collection.update_one(
                {"_id": plan_id},
                {"$set": {
                    "tasks": plan["tasks"],
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            
            print(f"✅ Updated task progress: {task_name} on {date}")
            return True
            
        except Exception as e:
            print(f"❌ Error updating task progress: {e}")
            return False

    def deactivate_plan(self, plan_id: str) -> bool:
        """Deactivate a health plan"""
        if self.plans_collection is None:
            return False
        
        try:
            result = self.plans_collection.update_one(
                {"_id": plan_id, "user_id": "default_user"},
                {"$set": {
                    "active": False,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            
            return result.modified_count > 0
            
        except Exception as e:
            print(f"❌ Error deactivating plan: {e}")
            return False

    def update_specialist_word_count(self, specialist_name: str, message: str) -> bool:
        """Update word count statistics for a specialist"""
        if self.specialist_stats_collection is None:
            return False
        
        try:
            # Count words in the message
            word_count = len(message.split())
            today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            # Find existing stats for this specialist
            existing_stats = self.specialist_stats_collection.find_one({
                "user_id": "default_user", 
                "specialist_name": specialist_name
            })
            
            if existing_stats:
                # Update existing stats
                new_total_words = existing_stats.get("total_words_generated", 0) + word_count
                new_total_messages = existing_stats.get("total_messages_sent", 0) + 1
                daily_counts = existing_stats.get("daily_word_counts", {})
                daily_counts[today] = daily_counts.get(today, 0) + word_count
                
                self.specialist_stats_collection.update_one(
                    {"_id": existing_stats["_id"]},
                    {"$set": {
                        "total_words_generated": new_total_words,
                        "total_messages_sent": new_total_messages,
                        "last_activity": datetime.now(timezone.utc),
                        "daily_word_counts": daily_counts
                    }}
                )
            else:
                # Create new stats entry
                stats = {
                    "_id": str(uuid.uuid4()),
                    "user_id": "default_user",
                    "specialist_name": specialist_name,
                    "total_words_generated": word_count,
                    "total_messages_sent": 1,
                    "last_activity": datetime.now(timezone.utc),
                    "daily_word_counts": {today: word_count}
                }
                
                self.specialist_stats_collection.insert_one(stats)
            
            print(f"✅ Updated word count for {specialist_name}: +{word_count} words")
            return True
            
        except Exception as e:
            print(f"❌ Error updating specialist word count: {e}")
            return False

    def get_specialist_stats(self, specialist_name: Optional[str] = None) -> List[Dict]:
        """Get specialist statistics"""
        if self.specialist_stats_collection is None:
            return []
        
        try:
            query = {"user_id": "default_user"}
            if specialist_name:
                query["specialist_name"] = specialist_name
            
            stats = list(self.specialist_stats_collection.find(query))
            
            return [{
                "specialist_name": stat["specialist_name"],
                "total_words_generated": stat.get("total_words_generated", 0),
                "total_messages_sent": stat.get("total_messages_sent", 0),
                "last_activity": stat.get("last_activity"),
                "daily_word_counts": stat.get("daily_word_counts", {})
            } for stat in stats]
            
        except Exception as e:
            print(f"❌ Error getting specialist stats: {e}")
            return []

    def get_time_spent_last_7_days(self) -> List[Dict]:
        """Get time spent by user in last 7 days based on word generation"""
        try:
            stats = self.get_specialist_stats()
            if not stats:
                return []
            
            # Get last 7 days
            today = datetime.now(timezone.utc)
            last_7_days = []
            for i in range(7):
                date = today - timedelta(days=i)
                last_7_days.append(date.strftime("%Y-%m-%d"))
            
            # Calculate time spent per day (1.5 words per second)
            time_data = []
            for date_str in reversed(last_7_days):  # Reverse to get chronological order
                total_words = 0
                specialist_breakdown = {}
                
                for specialist_stat in stats:
                    daily_words = specialist_stat["daily_word_counts"].get(date_str, 0)
                    total_words += daily_words
                    if daily_words > 0:
                        specialist_breakdown[specialist_stat["specialist_name"]] = daily_words
                
                # Calculate time in seconds, then convert to minutes
                time_seconds = total_words / 1.5  # 1.5 words per second
                time_minutes = round(time_seconds / 60, 1)
                
                time_data.append({
                    "date": date_str,
                    "display_date": datetime.strptime(date_str, "%Y-%m-%d").strftime("%b %d"),
                    "total_words": total_words,
                    "time_spent_minutes": time_minutes,
                    "time_spent_seconds": round(time_seconds, 1),
                    "specialist_breakdown": specialist_breakdown
                })
            
            return time_data
            
        except Exception as e:
            print(f"❌ Error calculating time spent: {e}")
            return []

# Global database manager instance
db_manager = None

def get_db_manager():
    """Get or create database manager instance"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager
