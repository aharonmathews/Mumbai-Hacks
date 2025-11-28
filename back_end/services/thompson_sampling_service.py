"""
Thompson Sampling Service for Adaptive Game Selection and Difficulty Adjustment

This service implements a fully agentic system that:
1. Uses Thompson Sampling to select optimal games for each user
2. Dynamically adjusts difficulty based on performance
3. Personalizes game sequences based on disability and progress
4. Continuously learns from user interactions
"""

from datetime import datetime, timezone
from config.firebase_config import db
from typing import Dict, List, Optional, Tuple
from functools import partial
import random
import math

print = partial(print, flush=True)

class ThompsonSamplingService:
    """
    🤖 AGENTIC: Thompson Sampling implementation for adaptive game selection.
    
    This service uses Bayesian inference to continuously learn which games
    work best for each individual student, optimizing their learning path.
    """
    
    def __init__(self):
        self.db = db
        # Default priors for each game type (alpha, beta for Beta distribution)
        self.default_priors = {
            "balloon_math": {"alpha": 1.0, "beta": 1.0},
            "general_knowledge": {"alpha": 1.0, "beta": 1.0},
            "spelling": {"alpha": 1.0, "beta": 1.0}
        }
        
        # Difficulty to question count mapping
        self.difficulty_question_counts = {
            "easy": {
                "balloon_math": 3,
                "general_knowledge": 3,
                "spelling": 4  # 4 letters for easy words
            },
            "medium": {
                "balloon_math": 5,
                "general_knowledge": 5,
                "spelling": 6  # 6 letters
            },
            "hard": {
                "balloon_math": 8,
                "general_knowledge": 8,
                "spelling": 8  # 8 letters
            }
        }
    
    async def get_user_priors(self, user_email: str) -> Dict[str, Dict[str, float]]:
        """Get Thompson Sampling priors for a user"""
        if not self.db:
            return self.default_priors.copy()
        
        try:
            user_ref = self.db.collection("users").document(user_email)
            ts_doc = user_ref.collection("thompson_sampling").document("priors").get()
            
            if ts_doc.exists:
                priors = ts_doc.to_dict()
                print(f"📊 Loaded priors for {user_email}: {priors}")
                return priors
            else:
                print(f"📊 Using default priors for {user_email}")
                return self.default_priors.copy()
                
        except Exception as e:
            print(f"❌ Error loading priors: {e}")
            return self.default_priors.copy()
    
    async def update_thompson_sampling(
        self, 
        user_email: str, 
        game_type: str, 
        success: bool,
        performance_score: float
    ):
        """
        🤖 AGENTIC: Update Thompson Sampling parameters after a game session.
        
        This is the core learning mechanism - it updates our belief about
        how effective each game is for this specific student.
        """
        if not self.db:
            print("⚠️ Firebase not available")
            return
        
        try:
            # Get current priors
            priors = await self.get_user_priors(user_email)
            
            if game_type not in priors:
                priors[game_type] = {"alpha": 1.0, "beta": 1.0}
            
            # Update alpha (successes) and beta (failures) based on performance
            if success:
                # Weight the update by performance score
                priors[game_type]["alpha"] += performance_score
            else:
                priors[game_type]["beta"] += (1.0 - performance_score)
            
            # Save updated priors
            user_ref = self.db.collection("users").document(user_email)
            ts_ref = user_ref.collection("thompson_sampling").document("priors")
            
            priors["last_updated"] = datetime.now(timezone.utc)
            ts_ref.set(priors)
            
            print(f"🤖 Updated Thompson Sampling for {game_type}:")
            print(f"   Alpha: {priors[game_type]['alpha']:.2f}, Beta: {priors[game_type]['beta']:.2f}")
            
        except Exception as e:
            print(f"❌ Error updating Thompson Sampling: {e}")
    
    async def get_optimal_game_sequence(
        self, 
        user_email: str, 
        disability_type: str = "None"
    ) -> List[Dict[str, any]]:
        """
        🤖 AGENTIC: Calculate optimal game sequence using Thompson Sampling.
        
        This method samples from each game's Beta distribution and orders
        games by their sampled values, creating a personalized sequence.
        """
        try:
            # Get user's priors
            priors = await self.get_user_priors(user_email)
            
            # Sample from each game's Beta distribution
            samples = {}
            for game_type, params in priors.items():
                if game_type in ["last_updated"]:
                    continue
                
                alpha = params.get("alpha", 1.0)
                beta = params.get("beta", 1.0)
                
                # Sample from Beta(alpha, beta)
                sample = random.betavariate(alpha, beta)
                samples[game_type] = sample
            
            # Sort games by sampled values (highest first)
            sorted_games = sorted(
                samples.items(), 
                key=lambda x: x[1], 
                reverse=True
            )
            
            # Create sequence with metadata
            sequence = []
            for i, (game_type, sampled_value) in enumerate(sorted_games):
                alpha = priors[game_type]["alpha"]
                beta = priors[game_type]["beta"]
                
                # Get adaptive difficulty for this game
                difficulty = await self.get_adaptive_difficulty(user_email, game_type)
                
                # Get question count for this difficulty
                question_count = self.difficulty_question_counts.get(difficulty, {}).get(game_type, 5)
                
                sequence.append({
                    "game_type": game_type,
                    "position": i + 1,
                    "expected_reward": sampled_value,
                    "confidence": self._calculate_confidence(alpha, beta),
                    "total_plays": int(alpha + beta - 2),  # Subtract initial priors
                    "success_rate": alpha / (alpha + beta) if (alpha + beta) > 0 else 0.5,
                    "difficulty": difficulty,
                    "question_count": question_count
                })
            
            print(f"🎯 Optimal sequence for {user_email}:")
            for game in sequence:
                print(f"   {game['position']}. {game['game_type']} - {game['difficulty'].upper()} ({game['question_count']} questions)")
            
            return sequence
            
        except Exception as e:
            print(f"❌ Error calculating optimal sequence: {e}")
            # Return default sequence
            return [
                {"game_type": "spelling", "position": 1, "expected_reward": 0.5, "confidence": 0.0, "difficulty": "medium", "question_count": 6},
                {"game_type": "balloon_math", "position": 2, "expected_reward": 0.5, "confidence": 0.0, "difficulty": "medium", "question_count": 5},
                {"game_type": "general_knowledge", "position": 3, "expected_reward": 0.5, "confidence": 0.0, "difficulty": "medium", "question_count": 5}
            ]
    
    def _calculate_confidence(self, alpha: float, beta: float) -> float:
        """Calculate confidence in our estimate (0 to 1)"""
        # Confidence increases with more data
        # Using coefficient of variation inverse
        total = alpha + beta
        if total < 2:
            return 0.0
        
        mean = alpha / total
        variance = (alpha * beta) / ((total ** 2) * (total + 1))
        
        if mean == 0:
            return 0.0
        
        cv = math.sqrt(variance) / mean
        confidence = 1.0 / (1.0 + cv)
        
        return min(confidence, 1.0)
    
    async def get_adaptive_difficulty(
        self, 
        user_email: str, 
        game_type: str
    ) -> str:
        """
        🤖 AGENTIC: Determine adaptive difficulty based on recent performance.
        
        Returns: "easy", "medium", or "hard"
        """
        try:
            # Get recent sessions
            from services.analytics_service import analytics_service
            recent_sessions = await analytics_service.get_recent_sessions(
                user_email, 
                game_type=game_type, 
                limit=5
            )
            
            if not recent_sessions:
                return "medium"  # Default
            
            # Calculate average accuracy from recent sessions
            total_accuracy = sum(s.get("accuracy_rate", 0.5) for s in recent_sessions)
            avg_accuracy = total_accuracy / len(recent_sessions)
            
            # Determine difficulty
            if avg_accuracy >= 0.8:
                difficulty = "hard"
            elif avg_accuracy >= 0.5:
                difficulty = "medium"
            else:
                difficulty = "easy"
            
            print(f"🎯 Adaptive difficulty for {game_type}: {difficulty} (avg accuracy: {avg_accuracy:.2f})")
            
            return difficulty
            
        except Exception as e:
            print(f"❌ Error calculating adaptive difficulty: {e}")
            return "medium"
    
    async def get_realtime_difficulty_adjustment(
        self,
        user_email: str,
        game_type: str,
        topic: str,
        current_performance: float
    ) -> Dict[str, any]:
        """
        🤖 AGENTIC: Real-time difficulty adjustment during gameplay.
        
        Adjusts difficulty mid-session based on current performance.
        """
        try:
            # Get baseline difficulty
            baseline_difficulty = await self.get_adaptive_difficulty(user_email, game_type)
            
            # Adjust based on current performance
            if current_performance >= 0.85:
                adjustment = "increase"
                new_difficulty = "hard" if baseline_difficulty != "hard" else "hard"
            elif current_performance <= 0.3:
                adjustment = "decrease"
                new_difficulty = "easy" if baseline_difficulty != "easy" else "easy"
            else:
                adjustment = "maintain"
                new_difficulty = baseline_difficulty
            
            # Get question count for new difficulty
            question_count = self.difficulty_question_counts.get(new_difficulty, {}).get(game_type, 5)
            
            return {
                "baseline_difficulty": baseline_difficulty,
                "current_performance": current_performance,
                "adjustment": adjustment,
                "new_difficulty": new_difficulty,
                "question_count": question_count,
                "reasoning": self._get_difficulty_reasoning(current_performance, adjustment)
            }
            
        except Exception as e:
            print(f"❌ Error in real-time difficulty adjustment: {e}")
            return {
                "baseline_difficulty": "medium",
                "new_difficulty": "medium",
                "question_count": 5,
                "adjustment": "maintain"
            }
    
    def _get_difficulty_reasoning(self, performance: float, adjustment: str) -> str:
        """Generate human-readable reasoning for difficulty adjustment"""
        if adjustment == "increase":
            return f"Student is excelling ({performance:.0%} accuracy) - increasing challenge"
        elif adjustment == "decrease":
            return f"Student struggling ({performance:.0%} accuracy) - providing support"
        else:
            return f"Student performing well ({performance:.0%} accuracy) - maintaining level"
    
    def get_question_count_for_difficulty(self, game_type: str, difficulty: str) -> int:
        """Get the number of questions to generate for a given difficulty"""
        return self.difficulty_question_counts.get(difficulty, {}).get(game_type, 5)

# Create global instance
thompson_sampling_service = ThompsonSamplingService()
