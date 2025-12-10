from openai import OpenAI
from dotenv import load_dotenv
import os
from pydantic import BaseModel

from prompts import SYSTEM_PROMPT

# load environment variables from .env first
load_dotenv()

key = os.getenv("OPENAI_API_KEY")
if not key:
    raise SystemExit(
        "OpenAI API key not found. Set the OPENAI_API_KEY environment variable or add OPENAI_KEY in a .env file."
    )

client = OpenAI(api_key=key)


response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": "I need a training plan for my legs."}
    ]
)

output = response.choices[0].message.content
print(output)
