# Kalp: Zero-Domain Gap Synthetic Dataset Generator

## Executive Summary
**Kalp** is an advanced, multi-agent synthetic data generation platform designed explicitly for industrial computer vision applications. Built on top of Google's Gemini and Imagen-4.0 models, Kalp solves one of the most persistent challenges in modern AI deployment: the "Domain Gap." 

While traditional synthetic data generators produce pristine, cinematic imagery that fails to translate to real-world deployment, Kalp autonomously engineers targeted defects—such as sensor noise, motion blur, poor lighting, and physical occlusion—resulting in zero-domain gap datasets that map perfectly to cheap, chaotic, and unpredictable factory floor cameras.

## The Problem
Computer vision teams often suffer from a severe lack of labeled anomaly data (e.g., specific manufacturing defects or rare edge cases). Traditional synthetic data pipelines attempt to solve this by generating fake data, but diffusion models inherently possess a strong "aesthetic bias." They generate 4K, studio-lit, perfectly centered images. When an AI model trained on these beautiful synthetic images is deployed to a dusty, vibrating manufacturing line with a 1080p CCTV camera, the model fails catastrophically. This failure point is known as the domain gap.

## The Kalp Solution
Kalp utilizes a multi-agent orchestration pipeline to take a tiny handful of real-world "seed" images and autonomously generate a massive, labeled dataset of highly realistic, intentionally "ugly" edge cases. 

### Core Architecture
The platform is powered by a FastAPI backend utilizing asynchronous WebSocket connections to drive a synchronized fleet of AI agents:

1. **Orchestrator Agent**: Analyzes the user's intent and dynamically allocates generation quotas across specialized sub-agents. It engineers aggressive "anti-aesthetic" prompts to circumvent diffusion model biases.
2. **Generation Agents**: Leverages `imagen-4.0-fast-generate-001` via the `google-genai` SDK to produce the core variations of the seed imagery.
3. **Defect Synthesis Engine**: A programmatic post-processing layer that mathematically injects true-to-life industrial distortions (Gaussian blur, algorithmic salt-and-pepper noise, exposure crushing, and occlusion rendering).
4. **Labeling Agent**: Powered by `gemini-2.5-flash`, this agent autonomously analyzes the newly generated synthetic images and draws pixel-perfect YOLO/COCO bounding boxes, eliminating the need for human-in-the-loop annotation.
5. **Packaging Agent**: Compiles the generated images and their corresponding label text files into a training-ready ZIP archive for immediate downstream deployment.

## Empirical Validation
To prove the efficacy of Kalp's zero-domain gap methodology, an A/B test was conducted using a YOLOv8 object detection model. The baseline model was trained strictly on real-world data, while the augmented model was trained on the real data plus Kalp-generated synthetic variations.

Even on a highly constrained micro-dataset, the Kalp-augmented model demonstrated a **+4.8% improvement in the mAP50-95 metric**, proving that Kalp's targeted injection of blur, noise, and occlusion directly enhances the robustness of downstream computer vision models. (Full methodology and results are available in the `/Proof_YOLO` directory).

## Technical Stack
* **Frontend**: React, TypeScript, Vite, Tailwind CSS
* **Backend**: Python, FastAPI, WebSockets
* **AI/ML**: Google GenAI SDK (Gemini 2.5 Flash, Imagen 4.0), Ultralytics YOLOv8
* **Image Processing**: Pillow (PIL)

## Installation & Usage
1. Clone the repository.
2. Ensure you have a valid `GEMINI_API_KEY` defined in a root `.env` file.
3. Start the backend: `cd backend && uvicorn main:app --reload`
4. Start the frontend: `cd frontend && npm install && npm run dev`
5. Navigate to the local host port, upload 1 to 5 seed images, define your generation parameters, and initiate the pipeline. The resulting ZIP file will download automatically upon completion.
