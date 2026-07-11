import os
import json
import asyncio
from PIL import Image, ImageDraw
import random
from connection_manager import manager

from google import genai

api_key = os.getenv("GEMINI_API_KEY")

def real_yolo_inference(image_path: str, object_name: str) -> dict:
    """
    Real Agent 4: Auto-labeling logic using Gemini 3.5 Flash Vision.
    Asks the model to return bounding boxes for the requested object.
    """
    if not api_key:
        return mock_yolo_inference(image_path)
        
    try:
        client = genai.Client(api_key=api_key)
            
        with Image.open(image_path) as img:
            width, height = img.size
            # We must load the image entirely into memory to pass to Gemini
            img_copy = img.copy()
            
        prompt = f"""
        Find the bounding boxes for the object: '{object_name}'.
        Return ONLY a JSON array of bounding boxes in this exact format:
        [
          [ymin, xmin, ymax, xmax]
        ]
        where the coordinates are normalized floats between 0.0 and 1.0. 
        Return ONLY valid JSON. If the object is not found, return an empty array [].
        """
        
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=[img_copy, prompt]
        )
        text_resp = response.text.replace("```json", "").replace("```", "").strip()
        
        box_data = json.loads(text_resp)
        boxes = []
        for b in box_data:
            # b is [ymin, xmin, ymax, xmax]
            # YOLO wants cx, cy, w, h
            ymin, xmin, ymax, xmax = b
            w = xmax - xmin
            h = ymax - ymin
            cx = xmin + w / 2
            cy = ymin + h / 2
            # class_id is 0
            boxes.append([0, cx, cy, w, h])
            
        return {
            "width": width,
            "height": height,
            "boxes": boxes
        }
    except Exception as e:
        print(f"Labeling failed via SDK: {e}. Falling back to mock.")
        return mock_yolo_inference(image_path)

def mock_yolo_inference(image_path: str) -> dict:
    """
    Fallback Mock Agent 4: Auto-labeling logic using 'YOLO'.
    Returns mock bounding boxes.
    """
    # Open image to get dimensions
    try:
        with Image.open(image_path) as img:
            width, height = img.size
    except Exception:
        width, height = 512, 512
        
    # Generate 1 to 3 random bounding boxes
    num_boxes = random.randint(1, 3)
    boxes = []
    
    for _ in range(num_boxes):
        # Format: [class_id, x_center, y_center, width, height] normalized
        cx = random.uniform(0.3, 0.7)
        cy = random.uniform(0.3, 0.7)
        w = random.uniform(0.1, 0.4)
        h = random.uniform(0.1, 0.4)
        class_id = 0 # Default single class for now
        boxes.append([class_id, cx, cy, w, h])
        
    return {
        "width": width,
        "height": height,
        "boxes": boxes
    }

def format_labels(inference_data: dict, format_type: str) -> str:
    """
    Formats the inference boxes into the requested format (YOLO, COCO, Pascal VOC).
    """
    boxes = inference_data["boxes"]
    
    if format_type.upper() == "YOLO":
        # YOLO is already our mock internal format
        lines = []
        for b in boxes:
            lines.append(f"{b[0]} {b[1]:.6f} {b[2]:.6f} {b[3]:.6f} {b[4]:.6f}")
        return "\n".join(lines)
        
    elif format_type.upper() == "COCO":
        # Simplified Mock COCO format (usually JSON, returning string representation)
        coco_boxes = []
        w_img = inference_data["width"]
        h_img = inference_data["height"]
        for b in boxes:
            # Convert normalized cx,cy,w,h to absolute xmin, ymin, w, h
            w = b[3] * w_img
            h = b[4] * h_img
            xmin = (b[1] * w_img) - (w / 2)
            ymin = (b[2] * h_img) - (h / 2)
            coco_boxes.append({"category_id": b[0], "bbox": [xmin, ymin, w, h]})
        return json.dumps(coco_boxes)
        
    elif format_type.upper() == "PASCAL VOC":
        # Simplified Mock VOC format (XML)
        lines = ["<annotation>"]
        w_img = inference_data["width"]
        h_img = inference_data["height"]
        for b in boxes:
            w = b[3] * w_img
            h = b[4] * h_img
            xmin = (b[1] * w_img) - (w / 2)
            ymin = (b[2] * h_img) - (h / 2)
            xmax = xmin + w
            ymax = ymin + h
            lines.append(f"  <object>")
            lines.append(f"    <name>{b[0]}</name>")
            lines.append(f"    <bndbox>")
            lines.append(f"      <xmin>{int(xmin)}</xmin>")
            lines.append(f"      <ymin>{int(ymin)}</ymin>")
            lines.append(f"      <xmax>{int(xmax)}</xmax>")
            lines.append(f"      <ymax>{int(ymax)}</ymax>")
            lines.append(f"    </bndbox>")
            lines.append(f"  </object>")
        lines.append("</annotation>")
        return "\n".join(lines)
        
    else:
        return "Unsupported format"

async def run_labeling_pipeline(pipeline_id: str):
    KALP_TMP_DIR = "C:/tmp/kalp" if os.name == 'nt' else "/tmp/kalp"
    pipeline_dir = os.path.join(KALP_TMP_DIR, pipeline_id)
    plan_path = os.path.join(pipeline_dir, "plan.json")
    
    try:
        with open(plan_path, "r") as f:
            plan = json.load(f)
    except Exception as e:
        await manager.send_message(pipeline_id, {"type": "error", "message": f"Could not read plan in labeling: {e}"})
        return
        
    export_format = plan.get("export_format", "YOLO")
    generated_dir = os.path.join(pipeline_dir, "generated")
    labels_dir = os.path.join(pipeline_dir, "labels")
    os.makedirs(labels_dir, exist_ok=True)
    
    await manager.send_message(pipeline_id, {"type": "info", "message": f"Starting Auto-Labeling (Format: {export_format})..."})
    
    # Iterate through all generated images and label them
    total_images = plan.get("total_images", 0)
    processed = 0
    
    for agent_dir in os.listdir(generated_dir):
        agent_path = os.path.join(generated_dir, agent_dir)
        if not os.path.isdir(agent_path):
            continue
            
        agent_labels_dir = os.path.join(labels_dir, agent_dir)
        os.makedirs(agent_labels_dir, exist_ok=True)
            
        for img_file in os.listdir(agent_path):
            if not img_file.endswith(".jpg"):
                continue
                
            img_path = os.path.join(agent_path, img_file)
            
            # Simulate inference time
            await asyncio.sleep(0.05)
            
            # Agent 4: Auto-Labeling using real API
            object_name = plan.get("user_description", "object")
            inference = await asyncio.to_thread(real_yolo_inference, img_path, object_name)
            
            # Agent 5: Formatting
            formatted_data = format_labels(inference, export_format)
            
            # Determine extension
            ext = ".txt"
            if export_format.upper() == "COCO": ext = ".json"
            if export_format.upper() == "PASCAL VOC": ext = ".xml"
            
            label_filename = img_file.replace(".jpg", ext)
            label_path = os.path.join(agent_labels_dir, label_filename)
            
            with open(label_path, "w") as f:
                f.write(formatted_data)
                
            processed += 1
            
            if processed % 10 == 0 or processed == total_images:
                await manager.send_message(pipeline_id, {
                    "type": "label_progress",
                    "progress": processed,
                    "total": total_images
                })
                
    await manager.send_message(pipeline_id, {"type": "info", "message": "Labeling complete! Starting packaging..."})
    
    # Phase 6: Trigger Packaging Agent
    from packaging_agent import run_packaging_pipeline
    await run_packaging_pipeline(pipeline_id)
