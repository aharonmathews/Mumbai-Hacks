import firebase_admin
from firebase_admin import credentials, firestore, storage
from config.settings import settings
import os
from functools import partial

print = partial(print, flush=True)

# Initialize Firebase
db = None
bucket = None
firebase_config = None

try:
    # Use the same Firebase config as the main project
    # Path goes up from config/ -> back_end/ -> test/ -> playfinity/ -> mumbaihacks/ to my_project.json
    cred_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../my_project.json"))
    
    print(f"🔍 Looking for Firebase credentials at: {cred_path}")
    
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'decode-27a57.firebasestorage.app'
        })
        
        db = firestore.client()
        bucket = storage.bucket()
        firebase_config = cred.project_id
        
        print("✅ Firebase initialized successfully for test environment")
        print(f"📦 Project: {firebase_config}")
        print(f"📂 Database: Connected to Firestore")
    else:
        print(f"⚠️ Firebase credentials not found at: {cred_path}")
        print(f"⚠️ Current directory: {os.getcwd()}")
        print("⚠️ Running without Firebase - some features will be limited")
        
except Exception as e:
    print(f"⚠️ Firebase initialization failed: {e}")
    print("⚠️ Running without Firebase - some features will be limited")
