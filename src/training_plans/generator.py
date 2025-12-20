from openai import OpenAI
from dotenv import load_dotenv
import os
import sys
import argparse
from pydantic import BaseModel
from typing import Optional, List

# Add project root to path for imports
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR))
sys.path.insert(0, ROOT_DIR)

from src.training_plans.prompts import SYSTEM_PROMPT

load_dotenv()

key = os.getenv("OPENAI_API_KEY")
if not key:
    raise SystemExit(
        "OpenAI API key not found. "
        "Set the OPENAI_API_KEY environment variable or add OPENAI_KEY in a .env file."
    )

client = OpenAI(api_key=key)


class Workout(BaseModel):
    week_number: int
    day_of_week: str
    name: str
    distance: Optional[float] = None  # in km, use this OR duration
    duration: Optional[float] = None  # in minutes, use this OR distance
    min_heart_rate: Optional[int] = None  # use heart rate OR pace
    max_heart_rate: Optional[int] = None
    pace: Optional[float] = None  # min/km, use this OR heart rate
    detail: str
    difficulty: str  # Easy, Moderate, or Hard


class WorkoutPlan(BaseModel):
    workouts: List[Workout]


def get_routine_response(user_message: str):
    """
    Get a routine response from OpenAI based on user message.

    Args:
        user_message: The user's input message

    Returns:
        The AI-generated response
    """
    response = client.responses.parse(
        model="gpt-5.2",
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        text_format=WorkoutPlan,
    )

    return response.output_parsed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate training plan")
    parser.add_argument("--sport", default="running")
    parser.add_argument("--current-time", default="45:00 10K")
    parser.add_argument("--goal-time", default="40:00 10K")
    parser.add_argument("--sessions", type=int, default=3)
    parser.add_argument("--available-time", type=int, default=5)
    parser.add_argument("--plan-length", type=int, default=10)
    parser.add_argument(
        "--additional-info", default="I have access to a gym and running track."
    )
    args = parser.parse_args()

    prompt = f"""
Create a training plan:
Sport: {args.sport}
Current: {args.current_time}
Goal: {args.goal_time}
Sessions/week: {args.sessions}
Time available: {args.available_time} hours/week
Info: {args.additional_info}
Length: {args.plan_length} weeks
"""

    output = get_routine_response(prompt)
