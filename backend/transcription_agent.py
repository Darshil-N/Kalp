import os
import json
from typing import List
from PIL import Image
from google import genai
from pydantic import BaseModel

# Try to configure API key
api_key = os.getenv("GEMINI_API_KEY")

class TranscriptionResult(BaseModel):
    object_name: str
    object_color: str
    object_material: str
    damage_type: str | None
    fracture_description: str | None
    background: str
    lighting: str
    angle: str
    distance: str
    context: str
    additional_details: str
    base_prompt: str
    detected_classes: List[str]  # Added for multi-class support

def run_transcription(image_paths: List[str]) -> TranscriptionResult:
    """
    Selects up to 3 diverse images (assumes caller passed diverse images),
    runs Gemini Vision, and synthesizes a consensus prompt.
    """
    
    # We will use up to 3 images for consensus
    selected_paths = image_paths[:3]
    
    if not api_key:
        # Mock mode if no API key is provided
        print("No GEMINI_API_KEY found, returning mock consensus transcription.")
        return TranscriptionResult(
            object_name="cracked ceramic tile",
            object_color="grey-white",
            object_material="ceramic",
            damage_type="fracture",
            fracture_description="diagonal crack",
            background="factory floor",
            lighting="fluorescent",
            angle="top-down",
            distance="30cm",
            context="QC inspection",
            additional_details="dusty",
            base_prompt="A cracked ceramic tile with a diagonal fracture, grey-white color, photographed top-down under fluorescent warehouse light, concrete floor background",
            detected_classes=["ceramic tile", "crack"]
        )

    # Actual Gemini Implementation
    try:
        client = genai.Client(api_key=api_key)
        images = [Image.open(p) for p in selected_paths]
        
        prompt = """
        You are a computer vision dataset assistant. Analyze these images and return a JSON object describing the object in extreme detail for use as a synthetic image generation prompt. 
        Synthesize a consensus across all the provided images.
        Include: object_name, object_color, object_material, damage_type (if visible), fracture_description, background, lighting, angle, distance, context, additional_details, detected_classes (list of distinct objects found), and a base_prompt string that can be used directly by an image generation model. 
        Return ONLY valid JSON, no markdown blocks.
        """
        
        # Pass all images and the prompt to the model
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=images + [prompt]
        )
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        
        parsed = json.loads(text_resp)
        return TranscriptionResult(**parsed)
        
    except Exception as e:
        print(f"Error in transcription agent: {e}")
        # Fallback to mock in case of parsing errors or rate limits
        return TranscriptionResult(
            object_name="unknown object",
            object_color="unknown",
            object_material="unknown",
            damage_type=None,
            fracture_description=None,
            background="unknown",
            lighting="unknown",
            angle="unknown",
            distance="unknown",
            context="unknown",
            additional_details="unknown",
            base_prompt="An object in a scene",
            detected_classes=["unknown"]
        )
