import os
import zipfile
import shutil
import asyncio
from connection_manager import manager

async def run_packaging_pipeline(pipeline_id: str):
    """
    Phase 6: Zipping and Exporting
    Compresses the 'generated' and 'labels' directories into a final downloadable zip file.
    """
    KALP_TMP_DIR = "C:/tmp/kalp" if os.name == 'nt' else "/tmp/kalp"
    pipeline_dir = os.path.join(KALP_TMP_DIR, pipeline_id)
    
    generated_dir = os.path.join(pipeline_dir, "generated")
    labels_dir = os.path.join(pipeline_dir, "labels")
    
    if not os.path.exists(generated_dir) or not os.path.exists(labels_dir):
        await manager.send_message(pipeline_id, {"type": "error", "message": "Missing generated or labels directory for packaging."})
        return
        
    await manager.send_message(pipeline_id, {"type": "info", "message": "Packaging dataset..."})
    
    zip_filename = f"kalp_dataset_{pipeline_id}.zip"
    zip_filepath = os.path.join(pipeline_dir, zip_filename)
    
    try:
        # Simulate slight packaging delay for UI effect if dataset is small
        await asyncio.sleep(1)
        
        with zipfile.ZipFile(zip_filepath, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # Add generated images
            for root, _, files in os.walk(generated_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, pipeline_dir)
                    zipf.write(file_path, arcname)
                    
            # Add labels
            for root, _, files in os.walk(labels_dir):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, pipeline_dir)
                    zipf.write(file_path, arcname)
                    
            # Optional: Add the plan.json for user reference
            plan_path = os.path.join(pipeline_dir, "plan.json")
            if os.path.exists(plan_path):
                zipf.write(plan_path, "plan.json")
            
    except Exception as e:
        await manager.send_message(pipeline_id, {"type": "error", "message": f"Packaging failed: {e}"})
        return
        
    # Provide the download URL path
    download_url = f"/download/{pipeline_id}/{zip_filename}"
    
    await manager.send_message(pipeline_id, {
        "type": "packaging_complete", 
        "message": "Dataset successfully packaged!",
        "download_url": download_url
    })
