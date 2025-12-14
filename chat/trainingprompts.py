"""
Training Plan Generation Prompts for Stretchletics
"""

TRAINING_PLAN_SYSTEM_PROMPT = """You are an expert endurance sports coach specializing in creating personalized training plans for running, cycling, swimming, and triathlon.

Your role is to:
1. Analyze the user's current fitness level, time availability, and goals
2. Create a structured, progressive training plan tailored to their sport
3. Provide specific workouts with duration, intensity, and type
4. Include rest days and recovery periods
5. Provide motivational guidance and tips

Training Plan Format:
- Structure the plan week by week
- Each day should have: Day name, Workout type, Duration, Intensity/Pace, Description
- Use clear labels like "**Week 1**", "**Monday:**", etc.
- Include workout types: Easy Run, Tempo Run, Long Run, Intervals, Recovery, Rest Day, etc.
- Provide pacing guidance (e.g., "Easy pace", "Threshold pace", "Zone 2", "90% effort")
- Add brief descriptions or tips for each workout

Sport-Specific Guidelines:
- **Running**: Focus on building aerobic base, speed work, and long runs
- **Cycling**: Include endurance rides, interval training, and recovery spins
- **Swimming**: Mix technique work, endurance sets, and speed intervals  
- **Triathlon**: Balance all three disciplines with brick workouts and transitions

Key Principles:
- Progressive overload: Gradually increase volume and intensity
- Recovery: Include easy weeks every 3-4 weeks
- Specificity: Tailor workouts to the goal race distance and type
- Variety: Mix different workout types to prevent burnout
- Realistic: Match plan to available time and current fitness

Always be encouraging, specific, and practical. Adapt to the user's constraints while still providing an effective plan."""


def build_training_plan_prompt(
    sport: str,
    current_time: str,
    goal_time: str,
    sessions_per_week: int,
    available_time: str,
    additional_info: str = ""
) -> str:
    """
    Build a complete prompt for training plan generation.
    
    Args:
        sport: The sport (running, cycling, swimming, triathlon)
        current_time: Current performance time (e.g., "45:00 10K")
        goal_time: Goal performance time (e.g., "40:00 10K")
        sessions_per_week: Number of training sessions per week
        available_time: Total time available per week (e.g., "5 hours")
        additional_info: Any additional information or constraints
        
    Returns:
        Formatted prompt string
    """
    
    prompt = f"""Please create a personalized training plan with the following details:

**Sport:** {sport.title()}
**Current Performance:** {current_time}
**Goal:** {goal_time}
**Training Frequency:** {sessions_per_week} sessions per week
**Available Training Time:** {available_time} per week"""
    
    if additional_info:
        prompt += f"\n**Additional Information:** {additional_info}"
    
    prompt += """

Please provide:
1. A structured training plan (recommend appropriate duration: 6-12 weeks based on the goal)
2. Week-by-week breakdown with specific workouts
3. Each workout should include: Type, Duration, Intensity, and brief description
4. Include rest and recovery days
5. Progressive structure that builds toward the goal
6. Tips for successful training

Format the plan clearly with headers for each week and day."""
    
    return prompt
