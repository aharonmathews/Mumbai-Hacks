from datetime import datetime, timezone
from config.firebase_config import db
from typing import Dict, Optional
from functools import partial
from models.schemas import GameAnalytics

print = partial(print, flush=True)

class AnalyticsService:
    def __init__(self):
        self.db = db
    
    async def save_game_analytics(self, analytics: GameAnalytics) -> bool:
        """Save game analytics to Firebase and trigger Thompson Sampling update"""
        if not self.db:
            print("⚠️ Firebase not available, cannot save analytics")
            return False
        
        try:
            # Create analytics document in user's subcollection
            user_ref = self.db.collection("users").document(analytics.user_email)
            analytics_ref = user_ref.collection("game_analytics")
            
            # Convert analytics to dict
            analytics_dict = analytics.dict()
            
            # Add timestamp
            analytics_dict["created_at"] = datetime.now(timezone.utc)
            
            # Save to Firebase
            doc_ref = analytics_ref.document(analytics.session_id)
            doc_ref.set(analytics_dict)
            
            print(f"✅ Saved analytics for {analytics.game_type} session: {analytics.session_id}")
            
            # Also update aggregate stats
            await self._update_aggregate_stats(analytics)
            
            # 🤖 AGENTIC: Automatically update Thompson Sampling
            await self._trigger_thompson_sampling_update(analytics)
            
            return True
            
        except Exception as e:
            print(f"❌ Error saving analytics: {e}")
            return False
    
    async def _trigger_thompson_sampling_update(self, analytics: GameAnalytics):
        """
        🤖 AGENTIC: Automatically update Thompson Sampling after each game session.
        This makes the system learn and adapt continuously.
        """
        try:
            # Import here to avoid circular dependency
            from services.thompson_sampling_service import thompson_sampling_service
            
            # Calculate performance score from analytics
            # Score = (accuracy * 0.5) + (completion * 0.3) + (no_rage_quit * 0.2)
            accuracy_component = analytics.accuracy_rate * 0.5
            completion_component = 1.0 if analytics.game_completed else 0.0
            completion_component *= 0.3
            rage_quit_component = 0.0 if analytics.rage_quit else 0.2
            
            performance_score = accuracy_component + completion_component + rage_quit_component
            
            # Determine success (completed with reasonable accuracy)
            success = analytics.game_completed and analytics.accuracy_rate >= 0.5
            
            # Update Thompson Sampling
            await thompson_sampling_service.update_thompson_sampling(
                analytics.user_email,
                analytics.game_type,
                success,
                performance_score
            )
            
            print(f"🤖 Updated Thompson Sampling: score={performance_score:.2f}, success={success}")
            
        except Exception as e:
            print(f"⚠️ Could not update Thompson Sampling: {e}")
    
    async def _update_aggregate_stats(self, analytics: GameAnalytics):
        """Update aggregate statistics for the user"""
        if not self.db:
            return
        
        try:
            user_ref = self.db.collection("users").document(analytics.user_email)
            stats_ref = user_ref.collection("aggregate_stats").document(analytics.game_type)
            
            # Get current stats
            stats_doc = stats_ref.get()
            
            if stats_doc.exists:
                current_stats = stats_doc.to_dict()
            else:
                current_stats = {
                    "total_sessions": 0,
                    "total_questions": 0,
                    "total_correct": 0,
                    "total_time_seconds": 0,
                    "total_completions": 0,
                    "total_rage_quits": 0,
                    "total_help_usage": 0,
                }
            
            # Update stats
            current_stats["total_sessions"] += 1
            current_stats["total_questions"] += analytics.total_questions
            current_stats["total_correct"] += analytics.correct_answers
            current_stats["total_time_seconds"] += analytics.time_spent_seconds
            current_stats["total_completions"] += 1 if analytics.game_completed else 0
            current_stats["total_rage_quits"] += 1 if analytics.rage_quit else 0
            current_stats["total_help_usage"] += analytics.help_hint_count
            current_stats["last_played"] = datetime.now(timezone.utc)
            
            # Calculate averages
            current_stats["average_accuracy"] = (
                current_stats["total_correct"] / current_stats["total_questions"]
                if current_stats["total_questions"] > 0 else 0
            )
            current_stats["average_time_per_session"] = (
                current_stats["total_time_seconds"] / current_stats["total_sessions"]
            )
            
            # Save updated stats
            stats_ref.set(current_stats)
            
            print(f"✅ Updated aggregate stats for {analytics.game_type}")
            
        except Exception as e:
            print(f"❌ Error updating aggregate stats: {e}")
    
    async def get_user_stats(self, user_email: str, game_type: Optional[str] = None) -> Dict:
        """Get aggregate statistics for a user"""
        if not self.db:
            return {}
        
        try:
            user_ref = self.db.collection("users").document(user_email)
            
            if game_type:
                # Get stats for specific game
                stats_ref = user_ref.collection("aggregate_stats").document(game_type)
                stats_doc = stats_ref.get()
                return stats_doc.to_dict() if stats_doc.exists else {}
            else:
                # Get stats for all games
                stats_docs = user_ref.collection("aggregate_stats").stream()
                return {doc.id: doc.to_dict() for doc in stats_docs}
                
        except Exception as e:
            print(f"❌ Error retrieving user stats: {e}")
            return {}
    
    async def get_recent_sessions(self, user_email: str, game_type: Optional[str] = None, limit: int = 10) -> list:
        """Get recent game sessions for Thompson Sampling analysis"""
        if not self.db:
            return []
        
        try:
            user_ref = self.db.collection("users").document(user_email)
            query = user_ref.collection("game_analytics").order_by("created_at", direction="DESCENDING").limit(limit)
            
            if game_type:
                query = query.where("game_type", "==", game_type)
            
            sessions = []
            for doc in query.stream():
                sessions.append(doc.to_dict())
            
            return sessions
            
        except Exception as e:
            print(f"❌ Error retrieving recent sessions: {e}")
            return []
    
    async def calculate_game_performance_scores(self, user_email: str) -> Dict[str, float]:
        """
        Calculate performance scores for each game type.
        This will be used for Thompson Sampling to select optimal games.
        
        Returns a dict like: {"balloon_math": 0.85, "general_knowledge": 0.72, "spelling": 0.91}
        """
        if not self.db:
            return {}
        
        try:
            user_ref = self.db.collection("users").document(user_email)
            stats_docs = user_ref.collection("aggregate_stats").stream()
            
            performance_scores = {}
            
            for doc in stats_docs:
                game_type = doc.id
                stats = doc.to_dict()
                
                # Calculate composite performance score
                # Factors: accuracy, completion rate, engagement (low rage quits)
                accuracy = stats.get("average_accuracy", 0)
                completion_rate = (
                    stats["total_completions"] / stats["total_sessions"]
                    if stats.get("total_sessions", 0) > 0 else 0
                )
                engagement = 1 - (
                    stats.get("total_rage_quits", 0) / stats.get("total_sessions", 1)
                )
                
                # Weighted composite score
                score = (0.4 * accuracy) + (0.3 * completion_rate) + (0.3 * engagement)
                performance_scores[game_type] = round(score, 3)
            
            print(f"📊 Performance scores for {user_email}: {performance_scores}")
            return performance_scores
            
        except Exception as e:
            print(f"❌ Error calculating performance scores: {e}")
            return {}

# Create global instance
analytics_service = AnalyticsService()
