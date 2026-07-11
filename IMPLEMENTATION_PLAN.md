# KALP — 10-Phase Implementation Plan

This plan integrates the core workflow with all identified critical gaps and structural improvements to ensure high-quality synthetic data generation.

### Phase 1: Project Setup & Core Infrastructure
*   **Goal**: Establish the foundational architecture.
*   **Tasks**:
    *   Set up the FastAPI backend and Python environment.
    *   Initialize the React + Tailwind CSS frontend.
    *   Set up WebSocket infrastructure for real-time progress updates.
    *   Configure Cloud storage or local `/tmp/` directory structures for pipeline stages.

### Phase 2: Input Handling & Validation
*   **Goal**: Build a robust entry point for users and prevent bad data from ruining the pipeline.
*   **Tasks**:
    *   Implement seed image upload UI (5-20 images) and basic validation.
    *   **[Gap 10] Seed Diversity Checker**: Add a lightweight checker to warn users if their uploaded seed images are too statistically similar before proceeding.
    *   **[Gap 8] UI Polish**: Add a live cost ticker in the UI next to the image quantity selector.

### Phase 3: Consensus Transcription & Dynamic Orchestration
*   **Goal**: Translate visual data into accurate, verified generation instructions.
*   **Tasks**:
    *   **[Gap 2] Multi-Seed Consensus**: Run Gemini 3.5 Flash Vision on the 3 most diverse seed images and synthesize a consensus `base_prompt`.
    *   **[Gap 2] Human-in-the-Loop (HITL) Checkpoint**: Pause the pipeline and show the synthesized prompt to the user for confirmation or editing before starting the costly generation loop.
    *   **[Gap 3] Multi-Class Foundation**: Update Agent 1's schema to detect and label multiple distinct classes if present.
    *   **[Gap 6] Dynamic Orchestrator**: Update the Orchestrator (Agent 2) to use LLM reasoning to determine the generation split (Noisy/Blur/Similar/Dark/Occluded) based on domain context, rather than using rigid templates.

### Phase 4: Anchored Synthetic Generation Engine
*   **Goal**: Connect the core generation models while preventing hallucination drift.
*   **Tasks**:
    *   Implement parallel processing for the 5 Generation Sub-Agents using **micro-batches** (e.g., 10 images at a time).
    *   **[Gap 3] Image-to-Image Anchoring**: Use NB2 Lite to perform Image-to-Image generation starting from noisy versions of the seed images (rather than pure text-to-image) to lock in structural geometry.
    *   **[Gap 3] Dynamic Prompt Rotation**: Have agents randomly select from a pool of varied prompt suffixes to maintain diversity.
    *   **[Gap 3] CLIP Similarity Validator**: After each micro-batch, check CLIP embedding similarity against seed images. Discard and retry if similarity drops below threshold.

### Phase 5: Classical Augmentation & Domain Adaptation
*   **Goal**: Improve dataset realism and volume efficiently.
*   **Tasks**:
    *   **[Gap 5] Layer Classical Augmentation**: Introduce a pipeline step that applies traditional augmentations (flip, crop, color jitter) to the original seed images to boost volume "for free".
    *   **[Gap 1] Domain Adaptation**: Implement a style-transfer or fine-tuning pass on generated images to statistically anchor them closer to the original seed images, reducing the critical domain gap.

### Phase 6: Auto-Labeling with Confidence Filtering
*   **Goal**: Label the generated images accurately.
*   **Tasks**:
    *   Integrate Grounding DINO (bounding boxes) and SAM 2 (segmentation).
    *   **[Gap 4] Confidence Thresholds**: Implement a strict confidence filter to discard or flag bounding boxes that fall below a certain certainty score to prevent silent failures.
    *   **[Gap 5] Multi-Class Support**: Ensure the labeling logic correctly tags multiple object types in the same image if identified in Phase 3.

### Phase 7: Validation & Outlier Removal (The Discriminator)
*   **Goal**: Ensure only high-quality synthetic data makes it to the user.
*   **Tasks**:
    *   **[Major Gap] Synthetic-vs-Real Discriminator**: Build a lightweight validation model that scores how realistic the newly generated images look compared to the original seeds.
    *   Automatically remove images that score too low (outliers) before they reach the packaging phase.

### Phase 8: Formatting & Export
*   **Goal**: Package the data for real-world ML training.
*   **Tasks**:
    *   Build the Formatter Agent (Agent 5) to export to YOLO, COCO, and Pascal VOC.
    *   **[Gap 11] Train/Val/Test Splits**: Update the Formatter to automatically apply stratified splits (e.g., 70/20/10) to the dataset rather than dumping everything into one folder.

### Phase 9: Feedback Loop & Dataset Quality Report
*   **Goal**: Build user trust by showing them what they generated.
*   **Tasks**:
    *   **[Gap 6] Quality Report**: Generate a simple HTML/PDF report included in the final ZIP (and shown on the UI) displaying class distributions, label confidence scores, and a sample preview grid.
    *   Finalize the download generation and cleanup logic.

### Phase 10: Iterative Refinement & Launch
*   **Goal**: Allow users to tweak their results and finalize the app.
*   **Tasks**:
    *   **[Gap 9] Iterative Refinement**: Add a "Refine" button on the UI that lets users say "make the pipes rustier" or "less blur," which re-triggers the Orchestrator with updated prompt weights without starting entirely from scratch.
    *   Conduct end-to-end testing, optimize API rate limits, and deploy to Google Cloud Run.
