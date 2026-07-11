# KALP: Zero-Domain Gap Synthetic Dataset Generator

<div align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React-18-blue.svg?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-green.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/GenAI-Nano%20Banana%202-orange.svg?style=for-the-badge&logo=google&logoColor=white" alt="GenAI" />
  <img src="https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge" alt="License" />
</div>

<br/>

**Kalp** is an enterprise-grade, multi-agent synthetic data generation platform designed explicitly for industrial computer vision applications. Built on top of Google's state-of-the-art **Nano Banana 2** models, Kalp solves one of the most persistent challenges in modern AI deployment: the **"Domain Gap."**

---

## 📖 Table of Contents
- [Executive Summary](#-executive-summary)
- [The Problem: The Domain Gap](#-the-problem-the-domain-gap)
- [The Kalp Solution](#-the-kalp-solution)
- [Core Architecture](#-core-architecture)
- [Empirical Validation (Proof of Concept)](#-empirical-validation-proof-of-concept)
- [Technical Stack](#-technical-stack)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [License](#-license)

---

## 🚀 Executive Summary
While traditional synthetic data generators produce pristine, cinematic imagery that fails to translate to real-world deployment, Kalp autonomously engineers targeted defects. By introducing controlled degradations—such as sensor noise, motion blur, poor lighting, and physical occlusion—Kalp generates zero-domain gap datasets that map perfectly to the cheap, chaotic, and unpredictable reality of factory floor cameras.

## ⚠️ The Problem: The Domain Gap
Computer vision teams often suffer from a severe lack of labeled anomaly data (e.g., specific manufacturing defects or rare edge cases). Traditional synthetic data pipelines attempt to solve this by generating fake data using generative models. 

However, diffusion models inherently possess a strong **"aesthetic bias."** They default to generating 4K, studio-lit, perfectly centered images. When an AI model trained on these beautiful synthetic images is deployed to a dusty, vibrating manufacturing line with a 1080p CCTV camera, the model fails catastrophically. This failure point is known as the **domain gap**.

## 💡 The Kalp Solution
Kalp utilizes a multi-agent orchestration pipeline. It takes a tiny handful of real-world "seed" images and autonomously generates a massive, fully-labeled dataset of highly realistic, intentionally "ugly" and challenging edge cases.

It achieves this through a hybrid approach:
1. **Aggressive Prompt Engineering**: Forcing the diffusion model to abandon its aesthetic bias.
2. **Programmatic Defect Injection**: Using deterministic image processing to apply industrial-grade degradations (e.g., ISO noise, motion blur).

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

## 📊 Empirical Validation (Proof of Concept)
To prove the efficacy of Kalp's zero-domain gap methodology, an A/B test was conducted using a **YOLOv8** object detection model. 
- **Baseline Model**: Trained strictly on real-world dataset samples.
- **Kalp-Augmented Model**: Trained on real-world data + Kalp-generated synthetic variations.

Even on a highly constrained micro-dataset, the Kalp-augmented model demonstrated a **+4.8% improvement in the mAP50-95 metric**, proving that Kalp's targeted injection of blur, noise, and occlusion directly enhances the robustness of downstream computer vision models. 

*(Full methodology, training scripts, and metric reports are available in the `/Proof_YOLO` directory).*

## 🛠️ Technical Stack

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Premium Glassmorphism UI)
- **Build Tool**: Vite

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Communication**: WebSockets (Real-time pipeline streaming)
- **Image Processing**: Pillow (PIL)

### AI / ML Infrastructure
- **Generation SDK**: Google GenAI SDK
- **Vision Models**: Nano Banana 2 Lite Image (Generation)
- **LLM/VLM Models**: Nano Banana 2 (Labeling & Orchestration)
- **Validation**: Ultralytics YOLOv8

---

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python 3.11+
- Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/kalp.git
cd kalp
```

### 2. Backend Setup
```bash
cd backend

# (Optional) Create a virtual environment
# python -m venv venv
# source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Environment Variables
# Create a .env file in the backend directory:
echo "GEMINI_API_KEY=your_api_key_here" > .env

# Start the FastAPI Server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Open a new terminal window.
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 🎯 Usage Guide
1. **Access the Dashboard**: Navigate to `http://localhost:5173` in your browser.
2. **Inject Seed Data**: Upload 5 to 20 control images (JPG/PNG) of your target object.
3. **Configure Parameters**:
   - Set the desired dataset yield (e.g., 10, 20, 30 images).
   - Provide a detailed contextual description of the object and the target environment.
   - Select your target annotation format (YOLO, COCO, Pascal VOC).
4. **Initialize Pipeline**: Click "Initialize Pipeline".
5. **Human-in-the-Loop Validation**: Review the auto-transcribed prompt and context generated by the Orchestrator Agent. Edit if necessary, then Authorize and Launch.
6. **Real-time Monitoring**: Watch the agents process, generate, apply drift control, and label your dataset in real-time.
7. **Download**: Once compiled, download the ZIP archive containing your fully annotated synthetic dataset.

---

<div align="center">
  <p>Engineered for Industrial AI • Zero Domain Gap • Zero Manual Labeling</p>
</div>
