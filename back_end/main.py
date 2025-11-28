from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from functools import partial
from typing import Optional

# Configuration
from config.settings import settings
from config.firebase_config import db

# Services
from services.llama_service import llama_service
from services.analytics_service import analytics_service
from services.game_service import game_service
from services.thompson_sampling_service import thompson_sampling_service

# Models
from models.schemas import GenerateDomainsRequest, GameAnalytics

print = partial(print, flush=True)

app = FastAPI(title="Playfinity - Agentic Test Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "CORS_ORIGINS", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "Playfinity Agentic Test Backend Running - FULLY AGENTIC WITH ADAPTIVE QUESTIONS",
        "firebase_available": db is not None,
        "llama_available": bool(getattr(llama_service, "client", None)),
        "features": [
            "analytics_tier_1_to_4",
            "thompson_sampling_active",
            "adaptive_difficulty",
            "adaptive_question_generation",
            "personalized_game_sequences",
            "real_time_difficulty_adjustment",
            "firebase_game_retrieval"
        ]
    }

# ===== AGENTIC QUESTION GENERATION ENDPOINTS =====

@app.get("/generate-adaptive-questions/{game_type}")
async def generate_adaptive_questions(
    game_type: str,
    topic: str = Query(..., description="Topic for questions"),
    user_email: str = Query(..., description="User email for difficulty calculation"),
    difficulty: Optional[str] = Query(None, description="Override difficulty (easy/medium/hard)"),
    question_count: Optional[int] = Query(None, description="Override question count")
):
    """
    🤖 AGENTIC: Generate questions with adaptive difficulty and count.
    
    This endpoint uses Thompson Sampling to determine the optimal difficulty
    and question count for each user, then generates custom questions using LLaMA.
    """
    try:
        # Get adaptive difficulty if not provided
        if not difficulty:
            difficulty = await thompson_sampling_service.get_adaptive_difficulty(
                user_email, game_type
            )
        
        # Get question count for difficulty if not provided
        if not question_count:
            question_count = thompson_sampling_service.get_question_count_for_difficulty(
                game_type, difficulty
            )
        
        print(f"🤖 Generating adaptive questions:")
        print(f"   Game: {game_type}")
        print(f"   Topic: {topic}")
        print(f"   Difficulty: {difficulty}")
        print(f"   Count: {question_count}")
        
        # Generate questions using LLaMA
        questions = llama_service.generate_adaptive_questions(
            topic=topic,
            game_type=game_type,
            difficulty=difficulty,
            question_count=question_count
        )
        
        return {
            "success": True,
            "game_type": game_type,
            "topic": topic,
            "difficulty": difficulty,
            "question_count": len(questions),
            "questions": questions,
            "agentic": True,
            "reasoning": f"Adapted to {difficulty} difficulty based on recent performance"
        }
        
    except Exception as e:
        print(f"❌ Error generating adaptive questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== GAME RETRIEVAL ENDPOINTS =====

@app.get("/get-games/{topic}")
async def get_games(topic: str, age_group: int = 10):
    """Retrieve all games for a specific topic and age group from Firebase"""
    try:
        games_exist, games_data = await game_service.check_games_exist_in_firebase(
            topic, str(age_group)
        )
        
        if games_exist:
            return {
                "success": True,
                "topic": topic,
                "age_group": age_group,
                "games": games_data,
                "source": "firebase"
            }
        else:
            return {
                "success": False,
                "message": f"No games found for topic '{topic}' at age group {age_group}",
                "topic": topic,
                "age_group": age_group
            }
    except Exception as e:
        print(f"❌ Error retrieving games: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-math-questions/{topic}")
async def get_math_questions(topic: str, age_group: int = 10):
    """Retrieve math/balloon game questions for a specific topic"""
    try:
        games_exist, games_data = await game_service.check_games_exist_in_firebase(
            topic, str(age_group)
        )
        
        if games_exist and "balloon" in games_data:
            questions = games_data["balloon"].get("questions", [])
            return {
                "success": True,
                "topic": topic,
                "questions": questions,
                "count": len(questions)
            }
        else:
            return {
                "success": False,
                "message": f"No math questions found for '{topic}'",
                "topic": topic
            }
    except Exception as e:
        print(f"❌ Error retrieving math questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-quiz-questions/{topic}")
async def get_quiz_questions(topic: str, age_group: int = 10):
    """Retrieve general knowledge quiz questions for a specific topic"""
    try:
        games_exist, games_data = await game_service.check_games_exist_in_firebase(
            topic, str(age_group)
        )
        
        if games_exist and "gk" in games_data:
            questions = games_data["gk"].get("questions", [])
            return {
                "success": True,
                "topic": topic,
                "questions": questions,
                "count": len(questions)
            }
        else:
            return {
                "success": False,
                "message": f"No quiz questions found for '{topic}'",
                "topic": topic
            }
    except Exception as e:
        print(f"❌ Error retrieving quiz questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get-spelling-word/{topic}")
async def get_spelling_word(topic: str, age_group: int = 10):
    """Retrieve spelling game word for a specific topic"""
    try:
        games_exist, games_data = await game_service.check_games_exist_in_firebase(
            topic, str(age_group)
        )
        
        if games_exist and "spelling" in games_data:
            word = games_data["spelling"].get("word", topic.upper())
            return {
                "success": True,
                "topic": topic,
                "word": word
            }
        else:
            return {
                "success": False,
                "message": f"No spelling word found for '{topic}'",
                "topic": topic,
                "word": topic.upper()[:8]  # Fallback
            }
    except Exception as e:
        print(f"❌ Error retrieving spelling word: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== ANALYTICS ENDPOINTS =====

@app.post("/save-analytics")
async def save_analytics(analytics: GameAnalytics):
    """Save game session analytics to Firebase"""
    try:
        success = await analytics_service.save_game_analytics(analytics)
        
        if success:
            return {
                "success": True,
                "message": "Analytics saved successfully",
                "session_id": analytics.session_id
            }
        else:
            return {
                "success": False,
                "message": "Failed to save analytics"
            }
    except Exception as e:
        print(f"❌ Error saving analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user-stats/{user_email}")
async def get_user_stats(user_email: str, game_type: str = None):
    """Get aggregate statistics for a user"""
    try:
        stats = await analytics_service.get_user_stats(user_email, game_type)
        return {
            "success": True,
            "user_email": user_email,
            "stats": stats
        }
    except Exception as e:
        print(f"❌ Error getting user stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/recent-sessions/{user_email}")
async def get_recent_sessions(user_email: str, game_type: str = None, limit: int = 10):
    """Get recent game sessions for analysis"""
    try:
        sessions = await analytics_service.get_recent_sessions(user_email, game_type, limit)
        return {
            "success": True,
            "user_email": user_email,
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        print(f"❌ Error getting recent sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/performance-scores/{user_email}")
async def get_performance_scores(user_email: str):
    """Get performance scores for Thompson Sampling"""
    try:
        scores = await analytics_service.calculate_game_performance_scores(user_email)
        return {
            "success": True,
            "user_email": user_email,
            "scores": scores
        }
    except Exception as e:
        print(f"❌ Error getting performance scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ===== THOMPSON SAMPLING / AGENTIC ENDPOINTS =====

@app.get("/optimal-game-sequence/{user_email}")
async def get_optimal_game_sequence(user_email: str, disability_type: str = "None"):
    """
    🤖 AGENTIC: Get personalized game sequence using Thompson Sampling.
    
    Returns games ordered by expected reward, with adaptive difficulty and question counts.
    """
    try:
        sequence = await thompson_sampling_service.get_optimal_game_sequence(
            user_email, disability_type
        )
        
        return {
            "success": True,
            "user_email": user_email,
            "disability_type": disability_type,
            "sequence": sequence,
            "agentic": True,
            "reasoning": "Game order optimized using Thompson Sampling based on your performance history"
        }
    except Exception as e:
        print(f"❌ Error getting optimal sequence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/adaptive-difficulty/{user_email}/{game_type}")
async def get_adaptive_difficulty(user_email: str, game_type: str):
    """
    🤖 AGENTIC: Get adaptive difficulty level for a game.
    
    Analyzes recent performance to determine optimal difficulty.
    """
    try:
        difficulty = await thompson_sampling_service.get_adaptive_difficulty(
            user_email, game_type
        )
        
        question_count = thompson_sampling_service.get_question_count_for_difficulty(
            game_type, difficulty
        )
        
        return {
            "success": True,
            "user_email": user_email,
            "game_type": game_type,
            "difficulty": difficulty,
            "question_count": question_count,
            "agentic": True
        }
    except Exception as e:
        print(f"❌ Error getting adaptive difficulty: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/real-time-difficulty/{user_email}/{game_type}")
async def get_realtime_difficulty(
    user_email: str, 
    game_type: str, 
    topic: str = "general", 
    current_performance: float = 0.5
):
    """
    🤖 AGENTIC: Get real-time difficulty adjustment.
    
    Adjusts difficulty mid-session based on current performance.
    """
    try:
        adjustment = await thompson_sampling_service.get_realtime_difficulty_adjustment(
            user_email, game_type, topic, current_performance
        )
        
        return {
            "success": True,
            "user_email": user_email,
            "game_type": game_type,
            **adjustment,
            "agentic": True
        }
    except Exception as e:
        print(f"❌ Error getting real-time adjustment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/update-thompson-sampling")
async def update_thompson_sampling(
    user_email: str,
    game_type: str,
    success: bool,
    performance_score: float
):
    """
    🤖 AGENTIC: Manually update Thompson Sampling parameters.
    
    Note: This happens automatically after each game via analytics service.
    """
    try:
        await thompson_sampling_service.update_thompson_sampling(
            user_email, game_type, success, performance_score
        )
        
        return {
            "success": True,
            "message": "Thompson Sampling updated successfully",
            "user_email": user_email,
            "game_type": game_type
        }
    except Exception as e:
        print(f"❌ Error updating Thompson Sampling: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Playfinity Agentic Test Backend...")
    print(f"✅ Firebase: {'Available' if db else 'Not Available'}")
    print(f"✅ LLaMA: {'Available' if llama_service.client else 'Not Available'}")
    uvicorn.run(app, host="127.0.0.1", port=8001)