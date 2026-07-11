import json
import math
from typing import List
from pydantic import BaseModel

class AgentConfig(BaseModel):
    agent: str
    count: int
    ratio: float
    prompt_suffix: str

class GenerationPlan(BaseModel):
    pipeline_id: str
    total_images: int
    base_prompt: str
    user_description: str
    export_format: str
    agents: List[AgentConfig]

def create_generation_plan(pipeline_id: str, base_prompt: str, user_description: str, total_images: int, export_format: str) -> GenerationPlan:
    """
    Dynamically adjusts the 5 sub-agent ratios based on the user's intent 
    using keyword matching (as a fast proxy for LLM reasoning in this phase).
    """
    
    # Default Ratios
    ratios = {
        "noisy": 0.25,
        "blur": 0.20,
        "similar": 0.30,
        "dark": 0.15,
        "occluded": 0.10
    }
    
    desc_lower = user_description.lower()
    
    # Dynamic Intent Reasoning
    if any(word in desc_lower for word in ["blurry", "motion", "fast"]):
        ratios["blur"] += 0.10
        ratios["similar"] -= 0.10
    elif any(word in desc_lower for word in ["dark", "night", "dim"]):
        ratios["dark"] += 0.10
        ratios["noisy"] -= 0.10
    elif any(word in desc_lower for word in ["hidden", "occluded", "cluttered"]):
        ratios["occluded"] += 0.10
        ratios["similar"] -= 0.10
    elif any(word in desc_lower for word in ["noisy", "grainy", "low quality"]):
        ratios["noisy"] += 0.10
        ratios["dark"] -= 0.10
    elif any(word in desc_lower for word in ["clean", "clear", "perfect"]):
        ratios["similar"] += 0.20
        ratios["noisy"] -= 0.05
        ratios["blur"] -= 0.05
        ratios["dark"] -= 0.05
        ratios["occluded"] -= 0.05

    # Fix floating point drift
    total_ratio = sum(ratios.values())
    for k in ratios:
        ratios[k] = ratios[k] / total_ratio
        
    # Calculate counts ensuring they sum perfectly to total_images
    agents = []
    remaining = total_images
    
    # Define suffixes for Rigid Prompt Injection (environment + defect modifier)
    suffixes = {
        "noisy": "a messy, dusty industrial factory background, captured with a cheap CCTV security camera exhibiting heavy ISO sensor artifacts.",
        "blur": "a busy manufacturing warehouse, captured by a moving handheld camera resulting in severe motion blur and out-of-focus elements.",
        "similar": "a standard industrial environment, illuminated by harsh, uneven artificial flash lighting.",
        "dark": "an extremely dark, unlit workshop corner, severely underexposed and shadowy.",
        "occluded": "a cluttered production line, where the object is partially hidden and overlapping with other surrounding industrial scrap."
    }
    
    keys = list(ratios.keys())
    for i, key in enumerate(keys):
        if i == len(keys) - 1:
            count = remaining # Assign all remainder to the last agent
        else:
            count = max(1, int(math.floor(total_images * ratios[key])))
            remaining -= count
            
        agents.append(AgentConfig(
            agent=key,
            count=count,
            ratio=ratios[key],
            prompt_suffix=suffixes[key]
        ))
        
    return GenerationPlan(
        pipeline_id=pipeline_id,
        total_images=total_images,
        base_prompt=base_prompt,
        user_description=user_description,
        export_format=export_format,
        agents=agents
    )
