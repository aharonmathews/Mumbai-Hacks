from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class GameAnalytics(BaseModel):
    """Analytics data for a single game session"""
    # Session identifiers
    user_email: str
    game_type: str  # "balloon_math", "general_knowledge", "spelling"
    topic: str
    session_id: str
    
    # Tier 1: Basic metrics
    correct_answers: int
    total_questions: int
    accuracy_rate: float
    time_spent_seconds: float
    game_completed: bool
    
    # Tier 2: Derivable metrics
    consecutive_errors: int
    max_consecutive_errors: int
    average_time_per_question: float
    questions_skipped: int
    rage_quit: bool  # Left before completion
    
    # Tier 4: Behavior patterns
    help_hint_count: int
    replay_count: int
    tab_switches: int
    total_idle_time_seconds: float
    max_idle_time_seconds: float
    
    # Timestamps
    session_start: datetime
    session_end: datetime
    
    # Additional context
    disability_type: Optional[str] = None
    age_group: Optional[int] = None
    
    # Detailed question-level data (for Thompson Sampling)
    question_details: Optional[List[dict]] = None

class GameGenerationRequest(BaseModel):
    topic: str
    age_group: str = "2"
    domain: Optional[str] = None
    tags: Optional[List[str]] = None

class TopicValidationRequest(BaseModel):
    topic: str
    age_group: str = "2"
    domain: Optional[str] = None
    tags: Optional[List[str]] = None
    
class GenerateDomainsRequest(BaseModel):
    description: str
    tags: List[str]
    primary_label: Optional[str] = None

class ImageUploadRequest(BaseModel):
    image: str
    label: str = ""

class LetterCheckRequest(BaseModel):
    image: str
    expected_letter: str

class ImageTag(BaseModel):
    name: str
    confidence: float

class PredictionResponse(BaseModel):
    success: bool
    tags: List[ImageTag]
    description: str
    primary_label: Optional[str]
    all_related_topics: List[str]
    cache_hit: bool
