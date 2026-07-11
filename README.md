# KALP: Zero-Domain Gap Synthetic Dataset Generator

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/GenAI-Gemini%20%7C%20Imagen-orange.svg?style=for-the-badge&logo=google&logoColor=white" alt="GenAI" />
  <img src="https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge" alt="License" />
</div>

<br/>

**Kalp** is an enterprise-grade, multi-agent synthetic data generation platform designed explicitly for industrial computer vision applications. Built on top of Google's state-of-the-art **Gemini** and **Imagen-4.0** models, Kalp solves one of the most persistent challenges in modern AI deployment: the **"Domain Gap."**

---



## 🏗️ Core Architecture
The platform is powered by a FastAPI backend utilizing asynchronous WebSocket connections to drive a synchronized fleet of AI agents:

1. **Orchestrator Agent** 🧠
   - Analyzes the user's intent.
   - Dynamically allocates generation quotas across specialized sub-agents. 
   - Engineers aggressive "anti-aesthetic" prompts to circumvent diffusion model biases.
2. **Generation Agents** 🎨
   - Leverages `nano-banana-2-lite-image` via the `google-genai` SDK to produce the core variations of the seed imagery.
3. **Defect Synthesis Engine** ⚙️
   - A programmatic post-processing layer that mathematically injects true-to-life industrial distortions:
     - Gaussian/Motion blur
     - Algorithmic salt-and-pepper noise
     - Exposure crushing and contrast reduction
4. **Labeling Agent** 🏷️
   - Powered by `nano-banana-2` (or equivalent multi-modal LLM).
   - Autonomously analyzes the newly generated synthetic images and draws pixel-perfect bounding boxes (YOLO/COCO format).
   - Eliminates the need for human-in-the-loop annotation.
5. **Packaging Agent** 📦
   - Compiles the generated images and their corresponding label text files into a training-ready ZIP archive.


