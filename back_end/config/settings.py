import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # OpenRouter/LLaMA configuration
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
    
    # CORS settings
    CORS_ORIGINS = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
    # Firebase configuration path
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "../../my_project.json")
    
    # Analytics settings
    IDLE_TIMEOUT_SECONDS = 30  # Time before considering user idle
    CONSECUTIVE_ERRORS_THRESHOLD = 3  # Number of consecutive errors before intervention

settings = Settings()
