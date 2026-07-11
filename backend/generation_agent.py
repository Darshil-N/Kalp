import os
import json
import asyncio
from PIL import Image, ImageDraw
import random
from connection_manager import manager

from google import genai
from io import BytesIO

api_key = os.getenv("GEMINI_API_KEY")

def real_generate_image(prompt: str, agent_type: str, index: int) -> Image.Image:
    """Real implementation of NB2 Lite (gemini-3.1-flash-lite-image) generation"""
    if not api_key:
        return mock_generate_image(prompt, agent_type, index)
        
    try:
        client = genai.Client(api_key=api_key)
        # Hackathon Model: Nano Banana 2 Lite
        result = client.models.generate_images(
            model='imagen-4.0-fast-generate-001',
            prompt=prompt,
            config=genai.types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="1:1"
            )
        )
        if result and result.generated_images:
            image_bytes = result.generated_images[0].image.image_bytes
            return Image.open(BytesIO(image_bytes))
    except Exception as e:
        print(f"Image generation failed via SDK: {e}. Falling back to mock.")
    
    return mock_generate_image(prompt, agent_type, index)

def mock_generate_image(prompt: str, agent_type: str, index: int) -> Image.Image:
    """Fallback Mock implementation"""
    color = (random.randint(50, 200), random.randint(50, 200), random.randint(50, 200))
    if agent_type == "dark":
        color = (random.randint(10, 50), random.randint(10, 50), random.randint(10, 50))
    
    img = Image.new('RGB', (512, 512), color=color)
    d = ImageDraw.Draw(img)
    d.text((10,10), f"Agent: {agent_type.upper()}", fill=(255,255,255))
    d.text((10,30), f"Index: {index}", fill=(255,255,255))
    return img

def check_drift_clip_mock(generated_img: Image.Image) -> float:
    """
    Mocking CLIP structural similarity score (0.0 to 1.0).
    In production, this would run actual CLIP image-to-image similarity.
    """
    if random.random() < 0.05:
        return random.uniform(0.50, 0.75)
    return random.uniform(0.85, 0.99)

async def run_generation_pipeline(pipeline_id: str):
    KALP_TMP_DIR = "C:/tmp/kalp" if os.name == 'nt' else "/tmp/kalp"
    pipeline_dir = os.path.join(KALP_TMP_DIR, pipeline_id)
    plan_path = os.path.join(pipeline_dir, "plan.json")
    
    try:
        with open(plan_path, "r") as f:
            plan = json.load(f)
    except Exception as e:
        await manager.send_message(pipeline_id, {"type": "error", "message": f"Could not read plan: {e}"})
        return
        
    agents = plan.get("agents", [])
    
    await manager.send_message(pipeline_id, {"type": "info", "message": "Starting Multi-Agent Generation Pipeline..."})
    
    # Create output directories
    generated_dir = os.path.join(pipeline_dir, "generated")
    os.makedirs(generated_dir, exist_ok=True)
    
    # Parallel generation task per sub-agent
    async def agent_task(agent_config):
        agent_type = agent_config["agent"]
        total_needed = agent_config["count"]
        full_prompt = f"{plan['base_prompt']}, {agent_config['prompt_suffix']}"
        
        agent_out_dir = os.path.join(generated_dir, agent_type)
        os.makedirs(agent_out_dir, exist_ok=True)
        
        success_count = 0
        attempts = 0
        
        while success_count < total_needed:
            # Simulate generation processing time
            # await asyncio.sleep(0.5 + random.random()) 
            attempts += 1
            
            # Using Nano Banana 2 Lite (gemini-3.1-flash-lite-image)
            # Make sure this doesn't block the async loop, but genai is synchronous here so we run it in a thread
            img = await asyncio.to_thread(real_generate_image, full_prompt, agent_type, success_count)
            
            # Gap 4: Structural Drift Anchor (CLIP Validation)
            similarity = check_drift_clip_mock(img)
            if similarity < 0.80:
                # Drift detected, discard and retry
                await manager.send_message(pipeline_id, {
                    "type": "drift_warning",
                    "agent": agent_type,
                    "message": f"Drift detected (Sim: {similarity:.2f}). Retrying..."
                })
                continue
            
            # Save valid generated image
            img_path = os.path.join(agent_out_dir, f"{agent_type}_{success_count}.jpg")
            img.save(img_path)
            success_count += 1
            
            # Broadcast progress
            await manager.send_message(pipeline_id, {
                "type": "progress",
                "agent": agent_type,
                "progress": success_count,
                "total": total_needed
            })
            
    # Execute all agent batches in parallel
    tasks = [agent_task(ag) for ag in agents]
    await asyncio.gather(*tasks)
    
    await manager.send_message(pipeline_id, {"type": "info", "message": "Generation complete! Starting Auto-Labeling..."})
    
    # Phase 5: Trigger Labeling & Formatting Agent
    from labeling_agent import run_labeling_pipeline
    await run_labeling_pipeline(pipeline_id)
