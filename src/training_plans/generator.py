from openai import OpenAI
from dotenv import load_dotenv
import os
from pydantic import BaseModel

from src.training_plans.prompts import SYSTEM_PROMPT

# load environment variables from .env first
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
load_dotenv(os.path.join(ROOT_DIR, 'config', '.env'))

key = os.getenv("OPENAI_API_KEY")
if not key:
    raise SystemExit(
        "OpenAI API key not found. Set the OPENAI_API_KEY environment variable or add OPENAI_KEY in a .env file."
    )

client = OpenAI(api_key=key)


class WorkoutPlan(BaseModel):
    names: list[str]
    distances: list[float]
    durations: list[float]
    min_heart_rates: list[int]
    max_heart_rates: list[int]
    paces: list[float]
    details: list[str]
    tags: list[str]


def get_routine_response(user_message: str):
    """
    Get a routine response from OpenAI based on user message.

    Args:
        user_message: The user's input message

    Returns:
        The AI-generated response
    """
    response = client.responses.parse(
        model="gpt-5-nano",
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        text_format=WorkoutPlan,
    )

    return response.output_parsed


# Main execution for testing
if __name__ == "__main__":
    test_message = "I need a training plan for my legs."
    output = get_routine_response(test_message)
    print()