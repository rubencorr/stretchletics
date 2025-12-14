from openai import OpenAI
from dotenv import load_dotenv
import os

from .trainingprompts import TRAINING_PLAN_SYSTEM_PROMPT

# load environment variables from .env first
load_dotenv()

key = os.getenv("OPENAI_API_KEY")
if not key:
    raise SystemExit(
        "OpenAI API key not found. Set the OPENAI_API_KEY environment variable or add OPENAI_KEY in a .env file."
    )

client = OpenAI(api_key=key)


def get_training_plan_response(user_message: str) -> str:
    """
    Get a training plan response from OpenAI based on user message.
    
    Args:
        user_message: The user's input message with training plan requirements
        
    Returns:
        The AI-generated training plan
    """
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": TRAINING_PLAN_SYSTEM_PROMPT},
            {"role": "user", "content": user_message}
        ]
    )
    
    return response.choices[0].message.content


# Main execution for testing
if __name__ == "__main__":
    test_message = """Please create a personalized training plan with the following details:

**Sport:** Running
**Current Performance:** 50:00 for 10K
**Goal:** 45:00 for 10K
**Training Frequency:** 4 sessions per week
**Available Training Time:** 5 hours per week

Please provide:
1. A structured training plan (recommend appropriate duration: 6-12 weeks based on the goal)
2. Week-by-week breakdown with specific workouts
3. Each workout should include: Type, Duration, Intensity, and brief description
4. Include rest and recovery days
5. Progressive structure that builds toward the goal
6. Tips for successful training

Format the plan clearly with headers for each week and day."""
    
    output = get_training_plan_response(test_message)
    print(output)
