"""
Analytics and statistics routes for the Elyx Health Concierge API
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from config import db_manager

router = APIRouter()


@router.get("/specialists/stats")
async def get_specialist_stats(specialist_name: Optional[str] = None):
    """Get statistics for specialists (word counts, message counts, etc.)"""
    try:
        stats = db_manager.get_specialist_stats(specialist_name)
        return {"specialist_stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting specialist stats: {str(e)}")


@router.get("/analytics/time-spent")
async def get_time_spent_analytics():
    """Get time spent analytics for the last 7 days"""
    try:
        time_data = db_manager.get_time_spent_last_7_days()
        
        # Calculate some summary statistics
        total_time = sum(day["time_spent_minutes"] for day in time_data)
        total_words = sum(day["total_words"] for day in time_data)
        avg_daily_time = round(total_time / max(len(time_data), 1), 1)
        
        # Get specialist breakdown for the week
        specialist_totals = {}
        for day in time_data:
            for specialist, words in day["specialist_breakdown"].items():
                specialist_totals[specialist] = specialist_totals.get(specialist, 0) + words
        
        return {
            "daily_time_data": time_data,
            "summary": {
                "total_time_minutes": round(total_time, 1),
                "total_words_generated": total_words,
                "average_daily_time_minutes": avg_daily_time,
                "days_with_activity": len([d for d in time_data if d["total_words"] > 0]),
                "specialist_word_totals": specialist_totals
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting time analytics: {str(e)}")


@router.get("/analytics/word-generation-trends")
async def get_word_generation_trends():
    """Get word generation trends by specialist over time"""
    try:
        stats = db_manager.get_specialist_stats()
        time_data = db_manager.get_time_spent_last_7_days()
        
        # Transform data for charting
        specialist_trends = {}
        for day in time_data:
            for specialist, words in day["specialist_breakdown"].items():
                if specialist not in specialist_trends:
                    specialist_trends[specialist] = []
                specialist_trends[specialist].append({
                    "date": day["date"],
                    "display_date": day["display_date"],
                    "words": words,
                    "time_minutes": round((words / 1.5) / 60, 1)
                })
        
        # Fill in missing days with zero values for each specialist
        for specialist in specialist_trends:
            existing_dates = {item["date"] for item in specialist_trends[specialist]}
            for day in time_data:
                if day["date"] not in existing_dates:
                    specialist_trends[specialist].append({
                        "date": day["date"],
                        "display_date": day["display_date"],
                        "words": 0,
                        "time_minutes": 0
                    })
            # Sort by date
            specialist_trends[specialist].sort(key=lambda x: x["date"])
        
        return {
            "specialist_trends": specialist_trends,
            "specialist_totals": [
                {
                    "specialist_name": stat["specialist_name"],
                    "total_words": stat["total_words_generated"],
                    "total_messages": stat["total_messages_sent"],
                    "last_activity": stat["last_activity"].isoformat() if stat["last_activity"] else None
                }
                for stat in stats
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting word generation trends: {str(e)}")
