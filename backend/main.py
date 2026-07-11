import os
from dotenv import load_dotenv
load_dotenv()

import uuid
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel

from diversity_checker import check_seed_diversity
from connection_manager import manager
from generation_agent import run_generation_pipeline

# Initialize Directories
KALP_TMP_DIR = "C:/tmp/kalp" if os.name == 'nt' else "/tmp/kalp"
os.makedirs(KALP_TMP_DIR, exist_ok=True)

app = FastAPI(title="Kalp API", version="1.0.0")

# CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    FRONTEND_URL
]

# Ensure no duplicates and handle trailing slashes
origins = list(set([o.rstrip("/") for o in origins if o]))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Kalp API is running"}

@app.post("/generate")
async def start_generation(
    description: str = Form(...),
    quantity: int = Form(...),
    export_format: str = Form(...),
    files: List[UploadFile] = File(...)
):
    # Validation
    if not (5 <= len(files) <= 20):
        raise HTTPException(status_code=400, detail="Must provide between 5 and 20 seed images.")
    
    if quantity not in [10, 20, 30]:
        raise HTTPException(status_code=400, detail="Quantity must be 10, 20, or 30.")
        
    if export_format.lower() not in ["yolo", "coco", "pascal_voc"]:
        raise HTTPException(status_code=400, detail="Invalid export format.")

    # Read bytes and check size
    MAX_SIZE = 10 * 1024 * 1024 # 10MB
    images_bytes = []
    
    for file in files:
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds 10MB limit.")
        images_bytes.append(content)

    # Seed Diversity Check (Gap 10)
    diversity_result = check_seed_diversity(images_bytes)
    if not diversity_result["is_diverse"]:
        raise HTTPException(
            status_code=400, 
            detail=f"{diversity_result['message']} (Similarity score: {diversity_result['average_similarity']:.2f})"
        )

    # Create Pipeline ID and directories
    pipeline_id = str(uuid.uuid4())
    pipeline_dir = os.path.join(KALP_TMP_DIR, pipeline_id)
    seeds_dir = os.path.join(pipeline_dir, "seeds")
    os.makedirs(seeds_dir, exist_ok=True)
    
    # Save seed images and collect paths for transcription
    saved_image_paths = []
    for i, file_bytes in enumerate(images_bytes):
        filename = f"seed_{i+1}.jpg" # Simplified extension handling
        file_path = os.path.join(seeds_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        saved_image_paths.append(file_path)

    # Agent 1: Consensus Transcription
    from transcription_agent import run_transcription
    transcription_result = run_transcription(saved_image_paths)
    
    return {
        "pipeline_id": pipeline_id, 
        "status": "awaiting_hitl_confirmation",
        "diversity_score": diversity_result["average_similarity"],
        "transcription": transcription_result.dict()
    }

class ConfirmPromptRequest(BaseModel):
    pipeline_id: str
    base_prompt: str
    user_description: str
    quantity: int
    export_format: str

@app.post("/confirm-prompt")
async def confirm_prompt(req: ConfirmPromptRequest, background_tasks: BackgroundTasks):
    pipeline_dir = os.path.join(KALP_TMP_DIR, req.pipeline_id)
    if not os.path.exists(pipeline_dir):
        raise HTTPException(status_code=404, detail="Pipeline not found.")
        
    from orchestrator_agent import create_generation_plan
    import json
    
    # Agent 2: Orchestrator
    plan = create_generation_plan(
        pipeline_id=req.pipeline_id,
        base_prompt=req.base_prompt,
        user_description=req.user_description,
        total_images=req.quantity,
        export_format=req.export_format
    )
    
    # Save plan to disk for Agent 3
    plan_path = os.path.join(pipeline_dir, "plan.json")
    with open(plan_path, "w") as f:
        f.write(plan.model_dump_json(indent=2))
        
    # Phase 4: Start Generation in Background
    background_tasks.add_task(run_generation_pipeline, req.pipeline_id)
        
    return {
        "pipeline_id": req.pipeline_id,
        "status": "plan_created",
        "plan": plan.dict()
    }

from fastapi.responses import FileResponse

@app.get("/download/{pipeline_id}/{filename}")
async def download_dataset(pipeline_id: str, filename: str):
    file_path = os.path.join(KALP_TMP_DIR, pipeline_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return FileResponse(path=file_path, filename=filename, media_type='application/zip')

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            # We don't expect messages from client currently, just keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
