from openai import OpenAI
from config.settings import settings
from utils.helpers import extract_json_from_response
from typing import List, Dict, Optional
from functools import partial

print = partial(print, flush=True)

class LlamaService:
    def __init__(self):
        self.client = OpenAI(
            base_url=settings.OPENROUTER_BASE_URL,
            api_key=settings.OPENROUTER_API_KEY
        ) if settings.OPENROUTER_API_KEY else None
    
    def generate_adaptive_questions(
        self, 
        topic: str, 
        game_type: str,
        difficulty: str,
        question_count: int,
        age_group: str = "7-11"
    ) -> List[Dict]:
        """
        🤖 AGENTIC: Generate questions with adaptive difficulty and count.
        
        This is the key method that makes the system truly agentic - it generates
        questions tailored to the student's current performance level.
        """
        if not self.client:
            print("⚠️ OpenRouter client not available")
            return self._create_fallback_questions(topic, game_type, question_count)
        
        try:
            if game_type == "balloon_math":
                prompt = self._build_adaptive_math_prompt(topic, difficulty, question_count, age_group)
            elif game_type == "general_knowledge":
                prompt = self._build_adaptive_quiz_prompt(topic, difficulty, question_count, age_group)
            elif game_type == "spelling":
                prompt = self._build_adaptive_spelling_prompt(topic, difficulty, question_count, age_group)
            else:
                return self._create_fallback_questions(topic, game_type, question_count)
            
            print(f"🤖 Generating {question_count} {difficulty} questions for {game_type} on topic '{topic}'")
            
            response = self.client.chat.completions.create(
                model="meta-llama/llama-3.1-8b-instruct:free",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert educational content creator specializing in adaptive learning for children aged 7-11. Generate engaging, age-appropriate questions."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            result_text = response.choices[0].message.content
            print(f"📝 LLaMA Response received (length: {len(result_text)})")
            
            # Extract JSON from response
            result_json = extract_json_from_response(result_text)
            
            if result_json and "questions" in result_json:
                questions = result_json["questions"][:question_count]  # Ensure we don't exceed requested count
                print(f"✅ Successfully generated {len(questions)} {difficulty} questions")
                return questions
            else:
                print("⚠️ Failed to extract questions from LLaMA response, using fallback")
                return self._create_fallback_questions(topic, game_type, question_count)
                
        except Exception as e:
            print(f"❌ Error generating adaptive questions: {e}")
            return self._create_fallback_questions(topic, game_type, question_count)
    
    def _build_adaptive_math_prompt(self, topic: str, difficulty: str, count: int, age_group: str) -> str:
        """Build prompt for adaptive math questions"""
        
        difficulty_instructions = {
            "easy": """
            - Use simple addition and subtraction (single digit numbers)
            - Numbers should be between 1-10
            - Questions should be very straightforward
            - Example: "If you have 3 apples and get 2 more, how many do you have?"
            """,
            "medium": """
            - Use multiplication and division with small numbers
            - Numbers should be between 1-20
            - Include some two-step problems
            - Example: "A box has 5 rows of 4 apples. How many apples total?"
            """,
            "hard": """
            - Use mixed operations and word problems
            - Numbers can go up to 100
            - Include multi-step reasoning
            - Example: "A farmer has 48 apples. He sells 1/3 of them and gets 12 more. How many does he have now?"
            """
        }
        
        return f"""
Generate exactly {count} math word problems related to "{topic}" for children aged {age_group}.

DIFFICULTY LEVEL: {difficulty.upper()}
{difficulty_instructions.get(difficulty, difficulty_instructions["medium"])}

Each question MUST:
1. Relate directly to the topic "{topic}"
2. Have exactly 4 multiple choice options (all positive whole numbers)
3. Have one clear correct answer
4. Be appropriate for {difficulty} difficulty level

Return ONLY valid JSON in this EXACT format:

{{
  "questions": [
    {{
      "question": "Clear math word problem about {topic}",
      "answer": 42,
      "options": [42, 38, 45, 40]
    }}
  ]
}}

Generate exactly {count} questions. NO additional text, ONLY the JSON.
"""
    
    def _build_adaptive_quiz_prompt(self, topic: str, difficulty: str, count: int, age_group: str) -> str:
        """Build prompt for adaptive general knowledge questions"""
        
        difficulty_instructions = {
            "easy": """
            - Ask basic, straightforward questions
            - Use simple vocabulary
            - Questions should have obvious answers
            - Example: "What color is the sky on a clear day?"
            """,
            "medium": """
            - Ask questions requiring some knowledge
            - Use age-appropriate vocabulary
            - Questions may need simple reasoning
            - Example: "Why do leaves change color in autumn?"
            """,
            "hard": """
            - Ask questions requiring deeper understanding
            - Use more complex vocabulary
            - Questions require critical thinking
            - Example: "How does photosynthesis help plants create energy?"
            """
        }
        
        return f"""
Generate exactly {count} multiple-choice quiz questions about "{topic}" for children aged {age_group}.

DIFFICULTY LEVEL: {difficulty.upper()}
{difficulty_instructions.get(difficulty, difficulty_instructions["medium"])}

Each question MUST:
1. Be directly related to "{topic}"
2. Have exactly 4 answer options
3. Have one clearly correct answer
4. Be educational and engaging

Return ONLY valid JSON in this EXACT format:

{{
  "questions": [
    {{
      "question": "Clear question about {topic}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A"
    }}
  ]
}}

Generate exactly {count} questions. NO additional text, ONLY the JSON.
"""
    
    def _build_adaptive_spelling_prompt(self, topic: str, difficulty: str, count: int, age_group: str) -> str:
        """Build prompt for adaptive spelling words"""
        
        difficulty_instructions = {
            "easy": """
            - Use 3-4 letter words
            - Common, simple words children know
            - Example: "CAT", "DOG", "SUN"
            """,
            "medium": """
            - Use 5-6 letter words
            - Words children are learning
            - Example: "HOUSE", "PLANT", "OCEAN"
            """,
            "hard": """
            - Use 7-8 letter words
            - More complex vocabulary
            - Example: "ELEPHANT", "MOUNTAIN", "RAINBOW"
            """
        }
        
        return f"""
Generate exactly {count} spelling words related to "{topic}" for children aged {age_group}.

DIFFICULTY LEVEL: {difficulty.upper()}
{difficulty_instructions.get(difficulty, difficulty_instructions["medium"])}

Requirements:
1. Words MUST relate to "{topic}"
2. Words should be UPPERCASE
3. Only letters A-Z (no spaces, numbers, or special characters)
4. Appropriate for {difficulty} level

Return ONLY valid JSON in this EXACT format:

{{
  "questions": [
    {{
      "word": "WORD",
      "difficulty": "{difficulty}"
    }}
  ]
}}

Generate exactly {count} words. NO additional text, ONLY the JSON.
"""
    
    def _create_fallback_questions(self, topic: str, game_type: str, count: int) -> List[Dict]:
        """Create fallback questions when LLaMA fails"""
        
        if game_type == "balloon_math":
            questions = []
            for i in range(count):
                num1 = (i + 1) * 2
                num2 = (i + 1) * 3
                answer = num1 + num2
                options = [answer, answer - 2, answer + 2, answer + 1]
                random.shuffle(options)
                questions.append({
                    "question": f"What is {num1} + {num2}?",
                    "answer": answer,
                    "options": options
                })
            return questions
            
        elif game_type == "general_knowledge":
            base_questions = [
                {
                    "question": f"What is the main characteristic of {topic}?",
                    "options": ["It's important", "It's colorful", "It's large", "It's small"],
                    "correct_answer": "It's important"
                },
                {
                    "question": f"Where would you find {topic}?",
                    "options": ["Everywhere", "Specific places", "Nowhere", "Online"],
                    "correct_answer": "Specific places"
                },
                {
                    "question": f"Why is {topic} significant?",
                    "options": ["Educational value", "Entertainment", "Both", "Neither"],
                    "correct_answer": "Educational value"
                }
            ]
            # Repeat if needed
            questions = (base_questions * ((count // len(base_questions)) + 1))[:count]
            return questions
            
        elif game_type == "spelling":
            words = ["WORD", "TOPIC", "LEARN", "STUDY", "PLAY", "GAME", "STUDENT", "TEACHER"]
            return [{"word": words[i % len(words)], "difficulty": "medium"} for i in range(count)]
        
        return []

# Create global instance
llama_service = LlamaService()