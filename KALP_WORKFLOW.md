# KALP — Synthetic Dataset Generation Pipeline
## Complete Workflow Specification Document

**Project Name:** Kalp
**Version:** 1.0.0
**Type:** Multi-Agent AI Pipeline
**Purpose:** Automated synthetic image dataset generation and labeling for computer vision teams

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Full Dataflow Diagram](#3-full-dataflow-diagram)
4. [Pipeline Stages](#4-pipeline-stages)
5. [Agent Specifications](#5-agent-specifications)
6. [Data Contracts Between Agents](#6-data-contracts-between-agents)
7. [Agent Interaction Rules](#7-agent-interaction-rules)
8. [Label Format Specifications](#8-label-format-specifications)
9. [Tech Stack](#9-tech-stack)
10. [Cost & Performance Targets](#10-cost--performance-targets)
11. [User Flow](#11-user-flow)
12. [Error Handling Rules](#12-error-handling-rules)
13. [Output Structure](#13-output-structure)
14. [Known Limitations](#14-known-limitations)
15. [Hackathon Positioning](#15-hackathon-positioning)

---

## 1. Project Overview

### 1.1 Problem Statement

Computer vision teams need hundreds to thousands of labeled images to train reliable models. The current landscape forces teams into one of two costly extremes:

| Approach | Cost | Time | Drawback |
|---|---|---|---|
| Manual real-world data collection | $1–$5 per labeled image | Weeks | Slow, expensive, coverage gaps |
| Enterprise synthetic data tools | $3,000–$15,000/month | Days | Unaffordable for small teams |
| No middle option existed | — | — | Indian startups, researchers, domain-specific CV projects are locked out |

### 1.2 Kalp's Solution

Kalp is a **5-agent autonomous pipeline** that accepts 5–20 real seed images and a natural language description, then delivers 100–1,000 fully labeled synthetic training images in under 5 minutes at a cost under ₹2 ($0.02).

### 1.3 Target Users

- Indian CV startups and researchers
- Agricultural disease detection teams
- Factory QC and industrial inspection engineers
- ML students and hobbyists
- Any small team that cannot afford enterprise tooling

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          KALP PIPELINE                                  │
│                                                                         │
│  ┌──────────────┐                                                       │
│  │  USER INPUT  │  → Seed Images (5–20) + Natural Language Description  │
│  └──────┬───────┘    + Quantity Request (100 / 500 / 1000)             │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────┐                                           │
│  │  AGENT 1                │                                           │
│  │  Image Transcription    │  Gemini 3.5 Flash Vision                  │
│  │  Agent                  │  Converts seed images → rich text         │
│  └──────────┬──────────────┘                                           │
│             │  [Transcription JSON]                                     │
│             ▼                                                           │
│  ┌─────────────────────────┐                                           │
│  │  AGENT 2                │                                           │
│  │  Orchestrator Agent     │  Gemini 3.5 Flash Text                    │
│  │                         │  Reads intent → builds generation plan    │
│  └──┬───┬────┬────┬────┬───┘                                           │
│     │   │    │    │    │    [Generation Plan JSON]                      │
│     ▼   ▼    ▼    ▼    ▼                                               │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                                            │
│  │N │ │B │ │S │ │D │ │O │  AGENT 3 — Generation Agents (NB2 Lite)     │
│  │o │ │l │ │i │ │a │ │c │  Run in parallel                             │
│  │i │ │u │ │m │ │r │ │c │                                             │
│  │s │ │r │ │i │ │k │ │l │                                             │
│  │y │ │  │ │l │ │  │ │u │                                             │
│  │  │ │  │ │a │ │  │ │d │                                             │
│  │  │ │  │ │r │ │  │ │e │                                             │
│  └──┘ └──┘ └──┘ └──┘ └──┘                                            │
│     │   │    │    │    │    [Generated Image Batches]                   │
│     └───┴────┴────┴────┘                                               │
│                  │                                                      │
│                  ▼                                                      │
│  ┌─────────────────────────┐                                           │
│  │  AGENT 4                │                                           │
│  │  Auto Labeling Agent    │  Grounding DINO + SAM 2 + Gemini Vision   │
│  │                         │  Generates bounding boxes + class labels  │
│  └──────────┬──────────────┘                                           │
│             │  [Images + Label Files]                                   │
│             ▼                                                           │
│  ┌─────────────────────────┐                                           │
│  │  AGENT 5                │                                           │
│  │  Formatter Agent        │  Python ZIP + YOLO Formatter              │
│  │                         │  Packages into YOLO / COCO / Pascal VOC   │
│  └──────────┬──────────────┘                                           │
│             │                                                           │
│             ▼                                                           │
│  ┌──────────────────┐                                                  │
│  │   ZIP DOWNLOAD   │  Images + Labels + dataset.yaml                  │
│  └──────────────────┘                                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Full Dataflow Diagram

```
USER
 │
 │  INPUT PAYLOAD
 │  ├─ seed_images[]      → array of image files (5–20 JPG/PNG)
 │  ├─ description        → plain English string
 │  ├─ quantity           → integer (100 | 500 | 1000)
 │  └─ export_format      → "yolo" | "coco" | "pascal_voc"
 │
 ▼
┌──────────────────────────────────────────────┐
│         FastAPI Backend — /generate          │
│         Validates input, starts pipeline     │
└──────────────────────────────────────────────┘
 │
 │  PIPELINE TRIGGER
 ├─ pipeline_id          → UUID
 ├─ seed_images[]        → stored to /tmp/kalp/{pipeline_id}/seeds/
 ├─ description          → string
 ├─ quantity             → int
 └─ export_format        → string
 │
 ▼
╔══════════════════════════════════════════════╗
║  AGENT 1 — IMAGE TRANSCRIPTION AGENT        ║
║  Model: Gemini 3.5 Flash Vision             ║
║  Runs: Once per pipeline (on seed images)   ║
╚══════════════════════════════════════════════╝
 │
 │  TRANSCRIPTION OUTPUT
 │  {
 │    "object_name": "cracked ceramic tile",
 │    "object_color": "grey-white",
 │    "object_material": "ceramic",
 │    "damage_type": "fracture",
 │    "fracture_description": "10cm wide diagonal crack",
 │    "background": "concrete warehouse floor",
 │    "lighting": "fluorescent overhead",
 │    "angle": "top-down (90°)",
 │    "distance": "30cm estimated",
 │    "context": "industrial QC inspection",
 │    "additional_details": "dust present on surface",
 │    "base_prompt": "A cracked ceramic tile with a 10cm diagonal
 │                   fracture, grey-white color, photographed
 │                   top-down under fluorescent warehouse light,
 │                   concrete floor background"
 │  }
 │
 ▼
╔══════════════════════════════════════════════╗
║  AGENT 2 — ORCHESTRATOR AGENT               ║
║  Model: Gemini 3.5 Flash Text               ║
║  Runs: Once per pipeline                    ║
╚══════════════════════════════════════════════╝
 │
 │  GENERATION PLAN OUTPUT
 │  {
 │    "pipeline_id": "uuid-xxx",
 │    "total_images": 500,
 │    "base_prompt": "(from transcription)",
 │    "user_description": "(original user text)",
 │    "agents": [
 │      { "agent": "noisy",    "count": 125, "ratio": 0.25,
 │        "prompt_suffix": "with gaussian noise, grain,
 │                          sensor artifacts, digital noise" },
 │      { "agent": "blur",     "count": 100, "ratio": 0.20,
 │        "prompt_suffix": "motion blurred, out of focus,
 │                          depth of field blur" },
 │      { "agent": "similar",  "count": 150, "ratio": 0.30,
 │        "prompt_suffix": "slight angle variation,
 │                          minor lighting change,
 │                          clean realistic version" },
 │      { "agent": "dark",     "count":  75, "ratio": 0.15,
 │        "prompt_suffix": "low light, night condition,
 │                          underexposed, dim environment" },
 │      { "agent": "occluded", "count":  50, "ratio": 0.10,
 │        "prompt_suffix": "partially hidden, overlapping objects,
 │                          edge crop, real-world clutter" }
 │    ]
 │  }
 │
 ▼
╔══════════════════════════════════════════════╗
║  AGENT 3 — GENERATION AGENTS (×5 PARALLEL) ║
║  Model: NB2 Lite (gemini-3.1-flash-lite-img)║
║  Runs: 5 agents concurrently                ║
╚══════════════════════════════════════════════╝
 │
 │  PER AGENT OUTPUT (example: Noisy Agent, 125 images)
 │  saved to /tmp/kalp/{pipeline_id}/generated/{agent_name}/
 │  ├─ noisy_001.jpg
 │  ├─ noisy_002.jpg
 │  └─ ... (count images)
 │
 ▼
╔══════════════════════════════════════════════╗
║  AGENT 4 — AUTO LABELING AGENT              ║
║  Tools: Grounding DINO + SAM 2 +            ║
║         Gemini Flash Vision                 ║
║  Runs: Per image (parallelized)             ║
╚══════════════════════════════════════════════╝
 │
 │  PER-IMAGE LABEL OUTPUT
 │  image_001.txt (YOLO format):
 │  "0 0.512 0.498 0.231 0.187"
 │
 │  image_001_seg.json (COCO format):
 │  { "bbox": [x, y, w, h], "segmentation": [[px1, py1, ...]] }
 │
 ▼
╔══════════════════════════════════════════════╗
║  AGENT 5 — FORMATTER AGENT                  ║
║  Tools: Python ZIP + YOLO Formatter         ║
║  Runs: Once, after all labels are ready     ║
╚══════════════════════════════════════════════╝
 │
 │  FINAL ZIP OUTPUT
 │  kalp_dataset_{pipeline_id}.zip
 │  ├─ dataset/
 │  │   ├─ images/
 │  │   │   ├─ image_001.jpg ... image_500.jpg
 │  │   ├─ labels/
 │  │   │   ├─ image_001.txt ... image_500.txt
 │  │   └─ dataset.yaml
 │
 ▼
USER DOWNLOADS ZIP
```

---

## 4. Pipeline Stages

### Stage 1 — Input Validation
- Accept 5–20 seed images (JPG or PNG, max 10MB each)
- Validate quantity is one of: 100, 500, 1000
- Validate export_format is one of: `yolo`, `coco`, `pascal_voc`
- Validate description is non-empty string, max 1000 characters
- Reject if fewer than 5 or more than 20 seed images provided
- Assign unique `pipeline_id` (UUID v4)
- Store seed images to `/tmp/kalp/{pipeline_id}/seeds/`
- Respond with `pipeline_id` to frontend for progress tracking

### Stage 2 — Image Transcription (Agent 1)
- Select the 3 most diverse/best-quality seed images.
- Run Gemini 3.5 Flash Vision on each.
- Parse responses and let Orchestrator synthesize a "consensus" Transcription JSON.
- **Human-in-the-Loop (HITL) Checkpoint**: Pause and prompt user in UI to confirm/edit the synthesized `base_prompt`.
- Cache confirmed transcription for entire pipeline (do not re-run per agent).
- Merge with user description to build `base_prompt`.

### Stage 3 — Orchestration (Agent 2)
- Read `quantity`, `description`, and `transcription`
- Extract intent signals from description (dark → increase Dark Agent ratio, blurry → increase Blur Agent ratio, etc.)
- Compute agent counts ensuring all counts sum exactly to `quantity`
- Emit Generation Plan JSON to queue

### Stage 4 — Parallel Image Generation (Agent 3, ×5)
- Launch all 5 generation agents simultaneously.
- Each agent operates in **micro-batches** (e.g., 10 images at a time) using **Image-to-Image** generation based on noisy seed images, preventing structural drift.
- Each agent randomly rotates from a pool of dynamic prompt suffixes to maintain diversity.
- **CLIP Similarity Validator**: After each micro-batch, check CLIP embedding similarity against seed images. Discard and retry if similarity drops below threshold.
- Failed generations are retried once; if retry fails, count is filled from the Similar Agent.
- Images saved to `/tmp/kalp/{pipeline_id}/generated/{agent_name}/`.
- Frontend progress counter updated via WebSocket after each batch is saved.

### Stage 5 — Auto Labeling (Agent 4)
- Merge all generated images from all 5 agent folders
- Rename sequentially: `image_001.jpg`, `image_002.jpg`, ...
- For each image run:
  1. Grounding DINO → bounding box(es)
  2. SAM 2 → segmentation mask(s)
  3. Gemini Flash Vision → confirm class label
- Write label file per image in requested format
- Save images to `/tmp/kalp/{pipeline_id}/final/images/`
- Save labels to `/tmp/kalp/{pipeline_id}/final/labels/`

### Stage 6 — Formatting & Export (Agent 5)
- Generate `dataset.yaml` (for YOLO) or `instances.json` (for COCO) or XML files (for Pascal VOC)
- ZIP everything into `kalp_dataset_{pipeline_id}.zip`
- Expose download URL to frontend
- Emit pipeline_complete event via WebSocket
- Cleanup `/tmp/kalp/{pipeline_id}/` after download or 1 hour timeout

---

## 5. Agent Specifications

---

### AGENT 1 — Image Transcription Agent

| Property | Value |
|---|---|
| **Agent ID** | `transcription_agent` |
| **Purpose** | Convert raw seed images into a structured, AI-readable text description |
| **Model** | Gemini 3.5 Flash Vision |
| **Runs** | Once per pipeline (consensus on 3 representative seed images) |
| **Input** | 3 diverse seed images |
| **Output** | Transcription JSON + `base_prompt` string |
| **Token Budget** | ~800 tokens output max |
| **Retry Policy** | Retry once on timeout; fail pipeline if second attempt fails |

**System Prompt Given to Agent:**
```
You are a computer vision dataset assistant. Analyze the provided image and
return a JSON object describing the object in extreme detail for use as a
synthetic image generation prompt. Include: object_name, object_color,
object_material, damage_type (if visible), background, lighting, angle,
distance, context, and a base_prompt string that can be used directly by
an image generation model. Return ONLY valid JSON, no extra text.
```

**Output Schema:**
```json
{
  "object_name":        "string — primary object class",
  "object_color":       "string — dominant color(s)",
  "object_material":    "string — material type",
  "damage_type":        "string | null — if defect/damage visible",
  "fracture_description": "string | null",
  "background":         "string — background scene",
  "lighting":           "string — lighting type and direction",
  "angle":              "string — camera angle",
  "distance":           "string — estimated camera distance",
  "context":            "string — use case / environment",
  "additional_details": "string — any notable surface features",
  "base_prompt":        "string — full generation-ready prompt"
}
```

**Rules:**
- Always pick the highest-resolution seed image for transcription
- If Gemini returns malformed JSON, retry once with explicit format instructions
- The `base_prompt` must be self-contained (usable without the full JSON)
- Do not include personally identifiable information in prompts
- Cap `base_prompt` at 300 characters

---

### AGENT 2 — Orchestrator Agent

| Property | Value |
|---|---|
| **Agent ID** | `orchestrator_agent` |
| **Purpose** | Parse user intent and build a structured generation plan |
| **Model** | Gemini 3.5 Flash Text |
| **Runs** | Once per pipeline |
| **Input** | User description + quantity + Transcription JSON |
| **Output** | Generation Plan JSON |
| **Token Budget** | ~500 tokens output max |
| **Retry Policy** | Retry once; if counts don't sum to quantity, force-correct in code |

**Default Generation Ratios (no user hints):**

| Agent | Default Ratio | Default Count (500 images) |
|---|---|---|
| Noisy | 25% | 125 |
| Blur | 20% | 100 |
| Similar | 30% | 150 |
| Dark | 15% | 75 |
| Occluded | 10% | 50 |

**Intent-to-Ratio Adjustment Rules:**

| User says... | Adjustment |
|---|---|
| "blurry" / "motion blur" | Blur Agent ratio +10%, Similar ratio −10% |
| "dark" / "night" / "dim" | Dark Agent ratio +10%, Noisy ratio −10% |
| "hidden" / "occluded" / "cluttered" | Occluded ratio +10%, Similar ratio −10% |
| "noisy" / "grainy" / "low quality" | Noisy ratio +10%, Dark ratio −10% |
| "clean" / "clear" / "perfect" | Similar ratio +20%, all others −5% each |
| No specific hint | Use default ratios exactly |

**Rules:**
- Agent counts must always sum exactly to the requested quantity
- Minimum count per agent is 5 (never assign 0 to any agent)
- If ratio adjustment causes an agent to drop below 5, floor it at 5 and redistribute remainder to Similar Agent
- Orchestrator must pass the full `base_prompt` to every generation agent unchanged
- Orchestrator must never truncate or modify user's description

**Output Schema:**
```json
{
  "pipeline_id": "uuid-string",
  "total_images": 500,
  "base_prompt": "string — from transcription agent",
  "user_description": "string — original user input",
  "agents": [
    {
      "agent": "noisy | blur | similar | dark | occluded",
      "count": 125,
      "ratio": 0.25,
      "prompt_suffix": "string — style modifier for this agent"
    }
  ]
}
```

---

### AGENT 3 — Generation Agents (5 Specialized Sub-Agents)

| Property | Value |
|---|---|
| **Agent Group ID** | `generation_agents` |
| **Purpose** | Generate synthetic images with style-specific variation |
| **Model** | NB2 Lite (`gemini-3.1-flash-lite-image`) |
| **Runs** | 5 agents in parallel, generating in micro-batches with CLIP validation |
| **Input** | `base_prompt` + `prompt_suffix` + `count` + `seed_image_reference` |
| **Output** | Batch of generated images saved to disk |
| **Image Resolution** | 1K (1024×1024) |
| **Cost** | $0.034 per 1,000 images |
| **Speed** | ~4 seconds per image |

#### Sub-Agent 3A — Noisy Agent

| Field | Value |
|---|---|
| **agent_name** | `noisy` |
| **Default Ratio** | 25% |
| **Prompt Suffix** | `"with gaussian noise, grain, sensor artifacts, digital noise, CCD noise pattern"` |
| **Simulates** | Low-quality cameras, aging sensors, high ISO photography |
| **Use Cases** | Factory floor cameras, surveillance footage, cheap mobile cameras |
| **Output Folder** | `/tmp/kalp/{pipeline_id}/generated/noisy/` |

#### Sub-Agent 3B — Blur Agent

| Field | Value |
|---|---|
| **agent_name** | `blur` |
| **Default Ratio** | 20% |
| **Prompt Suffix** | `"motion blurred, out of focus, depth of field blur, camera shake"` |
| **Simulates** | Fast conveyor belts, moving objects, shaky handheld cameras |
| **Use Cases** | Industrial production lines, outdoor monitoring |
| **Output Folder** | `/tmp/kalp/{pipeline_id}/generated/blur/` |

#### Sub-Agent 3C — Similar Agent

| Field | Value |
|---|---|
| **agent_name** | `similar` |
| **Default Ratio** | 30% |
| **Prompt Suffix** | `"slight angle variation, minor lighting change, clean realistic version, high quality"` |
| **Simulates** | Normal well-lit captures with minor variation |
| **Use Cases** | Core training set diversity; acts as distribution anchor |
| **Output Folder** | `/tmp/kalp/{pipeline_id}/generated/similar/` |

#### Sub-Agent 3D — Dark Agent

| Field | Value |
|---|---|
| **agent_name** | `dark` |
| **Default Ratio** | 15% |
| **Prompt Suffix** | `"low light, night condition, underexposed, dim environment, deep shadows"` |
| **Simulates** | Night shifts, basement environments, poor lighting conditions |
| **Use Cases** | 24/7 outdoor monitoring, night-time factory inspection |
| **Output Folder** | `/tmp/kalp/{pipeline_id}/generated/dark/` |

#### Sub-Agent 3E — Occluded Agent

| Field | Value |
|---|---|
| **agent_name** | `occluded` |
| **Default Ratio** | 10% |
| **Prompt Suffix** | `"partially hidden, overlapping objects, edge crop, real-world clutter, partial obstruction"` |
| **Simulates** | Stacked items, crowded shelves, items at frame edges |
| **Use Cases** | Warehouse robotics, retail shelf scanning |
| **Output Folder** | `/tmp/kalp/{pipeline_id}/generated/occluded/` |

**Rules Shared Across All Generation Sub-Agents:**
- Final prompt = `base_prompt` + `, ` + `prompt_suffix`
- Never include faces, people, or identifiable individuals in prompts
- Images must be saved immediately after generation (no batching in memory)
- If a generation call fails: wait 2 seconds, retry once
- If retry fails: log the failure and fill slot from Similar Agent's overflow pool
- Each agent reports progress to a shared pipeline counter
- Agents run concurrently using Python `asyncio` (or thread pool)

---

### AGENT 4 — Auto Labeling Agent

| Property | Value |
|---|---|
| **Agent ID** | `labeling_agent` |
| **Purpose** | Automatically generate bounding boxes and class labels for all generated images |
| **Tools** | Grounding DINO (detection) + SAM 2 (segmentation) + Gemini Flash Vision (label confirm) |
| **Runs** | Per image (parallelized across all generated images) |
| **Input** | A single generated image + `object_name` from transcription |
| **Output** | Label file per image (YOLO .txt / COCO JSON / Pascal VOC .xml) |
| **Human-in-loop** | None — fully autonomous |

**Labeling Sub-Pipeline per Image:**

```
Step 1: Grounding DINO
  Input:  image + text_prompt = object_name (e.g. "cracked ceramic tile")
  Output: bounding_box = [x_min, y_min, x_max, y_max] (pixel coords)
  Confidence threshold: 0.35 (discard detections below this)

Step 2: SAM 2
  Input:  image + bounding_box from Step 1
  Output: segmentation_mask (polygon points list)
  Used for: COCO and Pascal VOC export; stored even for YOLO pipelines

Step 3: Gemini Flash Vision (Confirmation)
  Input:  image + proposed bounding_box + candidate_class = object_name
  Output: confirmed_class (string) + confidence (float)
  Rules:  If confidence < 0.5, use object_name from transcription as fallback
          If Gemini suggests a different class, log it but keep original object_name
```

**Bounding Box Conversion to YOLO Format:**
```
x_center = (x_min + x_max) / 2 / image_width
y_center = (y_min + y_max) / 2 / image_height
width    = (x_max - x_min) / image_width
height   = (y_max - y_min) / image_height

YOLO line: "{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}"
```

**Rules:**
- class_id is always 0 (single-class pipeline; multi-class support is a future feature)
- If Grounding DINO detects zero objects: retry once with simplified prompt; if still zero, log and write empty label file
- If multiple bounding boxes returned: keep the highest-confidence one only (for simplicity)
- Segmentation masks are always computed even if export format is YOLO (stored for future use)
- Maximum parallelism: 20 images labeled simultaneously (rate-limit guard)

---

### AGENT 5 — Formatter Agent

| Property | Value |
|---|---|
| **Agent ID** | `formatter_agent` |
| **Purpose** | Package all images and labels into standard CV training formats |
| **Tools** | Python (shutil, zipfile, json, xml.etree) |
| **Runs** | Once, after all labeling is complete |
| **Input** | `/tmp/kalp/{pipeline_id}/final/` directory |
| **Output** | `kalp_dataset_{pipeline_id}.zip` |

**Output Format Rules:**

**YOLO Format (default):**
```
dataset/
  images/
    image_001.jpg
    image_002.jpg
    ...
  labels/
    image_001.txt   ← "0 0.512 0.498 0.231 0.187"
    image_002.txt
    ...
  dataset.yaml      ← ready for YOLOv8/v11 training
```

`dataset.yaml` contents:
```yaml
path: ./dataset
train: images
val: images
nc: 1
names:
  0: {object_name}
```

**COCO Format:**
```
dataset/
  images/
    image_001.jpg ...
  annotations/
    instances.json  ← single COCO-format JSON with all annotations
```

`instances.json` schema (abbreviated):
```json
{
  "info":        { "description": "Kalp Synthetic Dataset", "year": 2025 },
  "categories":  [ { "id": 0, "name": "{object_name}", "supercategory": "object" } ],
  "images":      [ { "id": 1, "file_name": "image_001.jpg", "height": 1024, "width": 1024 } ],
  "annotations": [ { "id": 1, "image_id": 1, "category_id": 0, "bbox": [x,y,w,h],
                     "segmentation": [[...]], "area": float, "iscrowd": 0 } ]
}
```

**Pascal VOC Format:**
```
dataset/
  JPEGImages/
    image_001.jpg ...
  Annotations/
    image_001.xml  ← one XML file per image
```

`image_001.xml` schema:
```xml
<annotation>
  <filename>image_001.jpg</filename>
  <size><width>1024</width><height>1024</height><depth>3</depth></size>
  <object>
    <name>{object_name}</name>
    <difficult>0</difficult>
    <bndbox>
      <xmin>{x_min}</xmin><ymin>{y_min}</ymin>
      <xmax>{x_max}</xmax><ymax>{y_max}</ymax>
    </bndbox>
  </object>
</annotation>
```

**Rules:**
- All image filenames must be zero-padded to width of total count
  (e.g., 500 images → `image_001.jpg` to `image_500.jpg`)
- ZIP file must be self-contained (no external dependencies)
- `dataset.yaml` object name must match the `object_name` from transcription exactly
- Empty label files (zero detections) must still be included in the ZIP (needed for YOLO training)
- Final ZIP is written to `/tmp/kalp/{pipeline_id}/output/kalp_dataset_{pipeline_id}.zip`

---

## 6. Data Contracts Between Agents

### Contract 1: Transcription Agent → Orchestrator Agent

```json
{
  "pipeline_id": "string",
  "object_name": "string",
  "base_prompt": "string (max 300 chars)",
  "lighting": "string",
  "angle": "string",
  "background": "string",
  "context": "string"
}
```

### Contract 2: Orchestrator Agent → Generation Agents

```json
{
  "pipeline_id": "string",
  "agent_name": "noisy | blur | similar | dark | occluded",
  "base_prompt": "string",
  "prompt_suffix": "string",
  "count": "integer",
  "output_folder": "string (absolute path)"
}
```

### Contract 3: Generation Agents → Labeling Agent

```
Directory: /tmp/kalp/{pipeline_id}/generated/
Structure:
  noisy/     → noisy_001.jpg ... noisy_N.jpg
  blur/      → blur_001.jpg ...
  similar/   → similar_001.jpg ...
  dark/      → dark_001.jpg ...
  occluded/  → occluded_001.jpg ...
Metadata file: manifest.json
  { "pipeline_id": "...", "object_name": "...", "total": 500,
    "by_agent": { "noisy": 125, "blur": 100, ... } }
```

### Contract 4: Labeling Agent → Formatter Agent

```
Directory: /tmp/kalp/{pipeline_id}/final/
Structure:
  images/
    image_001.jpg ... image_N.jpg   (renamed sequentially from all agents)
  labels_raw/
    image_001_yolo.txt              (YOLO format)
    image_001_coco.json             (COCO annotation fragment)
    image_001_voc.xml               (Pascal VOC fragment)
```

### Contract 5: Formatter Agent → User

```
File: kalp_dataset_{pipeline_id}.zip
Download URL: /api/download/{pipeline_id}
Expires: 1 hour after generation
```

---

## 7. Agent Interaction Rules

### 7.1 Execution Order Rules
1. Agent 1 (Transcription) **must complete** before Agent 2 (Orchestrator) starts
2. Agent 2 (Orchestrator) **must complete** before any Agent 3 (Generation) starts
3. All 5 Generation Sub-Agents **run in parallel** simultaneously
4. Agent 4 (Labeling) starts **only after all Generation Agents complete**
5. Agent 5 (Formatter) starts **only after all Labeling tasks complete**

### 7.2 Failure Propagation Rules
- If Agent 1 fails twice: abort pipeline, return error to user
- If Agent 2 fails twice: abort pipeline, return error to user
- If any Generation Sub-Agent fails to produce a single image: reassign its count to Similar Agent
- If a single image generation call fails: retry once, then skip and log
- If Labeling fails on an image: write an empty label file and continue
- If Agent 5 fails: retry ZIP creation once; if fails again, offer individual folder download

### 7.3 Communication Rules
- Agents communicate via shared filesystem (`/tmp/kalp/{pipeline_id}/`)
- Agents do **not** call each other directly (no inter-agent API calls)
- Orchestrator writes the Generation Plan to `plan.json` in the pipeline folder
- Each Generation Agent reads only its own slice from `plan.json`
- Progress events emitted to frontend via WebSocket (one event per image generated + labeled)

### 7.4 Prompt Rules
- `base_prompt` must never be modified by any agent downstream of Agent 1
- `prompt_suffix` is appended by each Generation Agent with `, ` separator
- Final image generation prompt = `f"{base_prompt}, {prompt_suffix}"`
- No agent may add instructions to reveal system internals in any prompt
- All prompts must remain under 400 characters total

### 7.5 Rate Limit Rules
- NB2 Lite: max 50 concurrent generation requests
- Grounding DINO: runs locally, no rate limit
- SAM 2: runs locally, no rate limit
- Gemini Vision (labeling confirmations): max 20 concurrent calls
- If rate limit hit: implement exponential backoff (2s, 4s, 8s, max 3 retries)

---

## 8. Label Format Specifications

### 8.1 YOLO Format
- One `.txt` file per image, same filename as the image
- Each line = one object: `{class_id} {x_center} {y_center} {width} {height}`
- All values normalized to [0.0, 1.0]
- class_id is integer (0 for single-class)
- Empty file = no detected objects in that image

**Example:**
```
0 0.512048 0.498432 0.231250 0.187500
```

### 8.2 COCO Format
- Single `instances.json` file containing all images and annotations
- `bbox` in COCO format: `[x_min, y_min, width, height]` (pixel values)
- `segmentation` in polygon format: `[[x1, y1, x2, y2, ...]]`
- `area` = width × height of bounding box
- `iscrowd` = 0 always (single instance per image in Kalp)

### 8.3 Pascal VOC Format
- One `.xml` file per image
- Bounding box in pixel coordinates: `xmin, ymin, xmax, ymax`
- `difficult` = 0 always
- Image depth = 3 (RGB)

---

## 9. Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | React + Tailwind CSS | Upload UI, progress counter, download button |
| **Backend** | Python 3.11 + FastAPI | API gateway, pipeline orchestration |
| **WebSocket** | FastAPI WebSockets | Real-time progress updates to frontend |
| **Task Queue** | Python asyncio (or Celery) | Parallel agent execution |
| **Transcription** | Gemini 3.5 Flash Vision | Seed image → structured text |
| **Orchestration** | Gemini 3.5 Flash Text | Intent parsing → generation plan |
| **Image Generation** | NB2 Lite (`gemini-3.1-flash-lite-image`) | Synthetic image creation |
| **Object Detection** | Grounding DINO (local) | Zero-shot bounding box generation |
| **Segmentation** | SAM 2 (local) | Pixel-level segmentation masks |
| **Label Confirmation** | Gemini Flash Vision | Class label verification |
| **Packaging** | Python `zipfile` + custom formatter | Export in YOLO/COCO/VOC |
| **Hosting** | Google Cloud Run | Container-based serverless deployment |
| **Storage (temp)** | `/tmp/` (Cloud Run ephemeral) | Pipeline working directory |
| **File Serving** | FastAPI FileResponse | Download endpoint |

---

## 10. Cost & Performance Targets

### 10.1 Cost Breakdown (500 images)

| Component | Cost per 500 images |
|---|---|
| Gemini 3.5 Flash Vision (transcription) | ~$0.0003 |
| Gemini 3.5 Flash Text (orchestration) | ~$0.0001 |
| NB2 Lite — 500 images @ $0.034/1000 | **$0.017** |
| Grounding DINO (local model) | $0.00 |
| SAM 2 (local model) | $0.00 |
| Gemini Flash Vision × 500 (labeling) | ~$0.002 |
| **TOTAL** | **< $0.02** |

### 10.2 Time Targets

| Stage | Target Time (500 images) |
|---|---|
| Image Transcription | < 10 seconds |
| Orchestration | < 5 seconds |
| Parallel Image Generation | ~4 sec × 500 / 5 agents = ~400 seconds (~6.5 min) |
| Auto Labeling (parallel) | ~2 sec × 500 / 20 parallel = ~50 seconds |
| Formatting + ZIP | < 30 seconds |
| **Total (500 images)** | **< 8 minutes** |
| **Total (100 images)** | **< 2 minutes** |

### 10.3 Scale Targets

| Metric | Target |
|---|---|
| Max images per pipeline | 1,000 |
| Max concurrent pipelines | 10 |
| Image resolution | 1024×1024 |
| Supported input formats | JPG, PNG |
| Supported export formats | YOLO, COCO, Pascal VOC |
| Seed image count | 5–20 |

---

## 11. User Flow

### Step 1 — Upload
- User lands on Kalp homepage
- Drags and drops 5–20 real images of their object
- Preview grid shows uploaded thumbnails

### Step 2 — Describe
- User types in natural language:
  > *"I need 500 images of rusted metal pipes for a manufacturing inspection model. Mix of different lighting, some blurry, some with dust"*

### Step 3 — Configure
- Select quantity: `100` / `500` / `1000`
- Select export format: `YOLO` / `COCO` / `Pascal VOC`
- Click **Generate Dataset**

### Step 4 — Watch Progress
- Live counter: `Generated: 47 / 500 images`
- Agent-level progress bars (Noisy ██░░, Blur █░░░, etc.)
- Estimated time remaining shown

### Step 5 — Download
- "Your dataset is ready!" notification
- Big **Download ZIP** button appears
- ZIP downloaded: `kalp_dataset_{id}.zip` (~200–400MB for 500 images)
- User plugs `dataset.yaml` directly into YOLOv8 training command

**YOLOv8 training command (what user runs after download):**
```bash
yolo train model=yolov8n.pt data=dataset/dataset.yaml epochs=50 imgsz=640
```

---

## 12. Error Handling Rules

| Error | Detection | Response |
|---|---|---|
| Fewer than 5 seed images | Input validation | Return 400: "Please upload at least 5 seed images" |
| More than 20 seed images | Input validation | Return 400: "Maximum 20 seed images allowed" |
| Invalid quantity | Input validation | Return 400: "Quantity must be 100, 500, or 1000" |
| Transcription model timeout | 30s timeout | Retry once; if fail, abort with "Service unavailable" |
| Transcription returns bad JSON | JSON parse error | Retry once with stricter prompt; if fail, use fallback prompt from description |
| Generation API rate limit | HTTP 429 | Exponential backoff: 2s, 4s, 8s; max 3 retries |
| Grounding DINO finds 0 objects | Empty result | Retry with simplified query; write empty label file; log |
| SAM 2 segmentation fails | Exception | Skip segmentation for that image; use bbox-only label |
| ZIP creation fails | Exception | Retry once; if fail, offer raw folder download |
| Pipeline timeout (>15 min) | Timer | Mark as failed; notify user; partial results preserved |
| User cancels mid-pipeline | Cancellation event | Stop all agents; delete pipeline temp folder |

---

## 13. Output Structure

### Full Output Directory (before ZIP)

```
/tmp/kalp/{pipeline_id}/
├── seeds/
│   ├── seed_1.jpg
│   ├── seed_2.jpg
│   └── ...
├── transcription.json
├── plan.json
├── generated/
│   ├── noisy/
│   │   ├── noisy_001.jpg ... noisy_125.jpg
│   ├── blur/
│   │   ├── blur_001.jpg ... blur_100.jpg
│   ├── similar/
│   │   ├── similar_001.jpg ... similar_150.jpg
│   ├── dark/
│   │   ├── dark_001.jpg ... dark_075.jpg
│   ├── occluded/
│   │   ├── occluded_001.jpg ... occluded_050.jpg
│   └── manifest.json
├── final/
│   ├── images/
│   │   ├── image_001.jpg ... image_500.jpg
│   ├── labels_raw/
│   │   ├── image_001_yolo.txt
│   │   ├── image_001_coco.json
│   │   └── image_001_voc.xml
└── output/
    └── kalp_dataset_{pipeline_id}.zip
```

### Final ZIP Contents (YOLO format)

```
kalp_dataset_{pipeline_id}.zip
└── dataset/
    ├── images/
    │   ├── image_001.jpg
    │   ├── image_002.jpg
    │   └── ... (500 images)
    ├── labels/
    │   ├── image_001.txt
    │   ├── image_002.txt
    │   └── ... (500 label files)
    └── dataset.yaml
```

---

## 14. Known Limitations

| Limitation | Details | Mitigation |
|---|---|---|
| Synthetic ≠ real | Domain gap between synthetic and real-world camera conditions | Position Kalp as augmentation (mix with real data); document this clearly |
| Single-class only | Current pipeline supports one object class per dataset | Multi-class support on roadmap |
| Complex occlusion labeling | Grounding DINO accuracy drops for heavily occluded objects | Confidence threshold filters worst cases; SAM 2 improves mask quality |
| NB2 Lite quality at scale | Model is new; CV training fitness is untested at 1000-image scale | Provide sample images in demo; show on clear objects first |
| 1K resolution | 1024×1024 max; some CV tasks need higher resolution | Sufficient for most YOLO training tasks |
| No train/val split | Pipeline generates one pool; user must split | Add `--split` flag as future feature; document manual split method |
| Temp storage ephemeral | Cloud Run temp folder wiped on instance restart | 1-hour download window; user must download promptly |

---

## 15. Hackathon Positioning

### Primary Problem Statement
**Problem Statement 3 — High Throughput Creative Workflows with NB2 Lite**
Kalp demonstrates NB2 Lite's capability to run at production-grade throughput (500 images in minutes) for a practical, economically impactful use case.

### Secondary Problem Statement
**Problem Statement 2 — Autonomous Multi-Agent Orchestration**
5 specialized agents — each with its own role, prompt, rules, and output contract — coordinate without human intervention from seed image to labeled ZIP.

### India Impact Angle
Indian CV startups, agricultural disease detection teams, and factory QC engineers cannot afford $3,000/month enterprise tools or wait weeks for manual labeling. Kalp delivers a 500-image labeled training dataset in under 5 minutes for less than ₹2 — democratizing computer vision development for resource-constrained builders.

### 3-Minute Demo Script

> *"Training a computer vision model needs hundreds of labeled images. Collecting them takes weeks. Labeling them costs thousands. We built a 5-agent pipeline called Kalp that takes 5 real photos and generates 500 fully labeled training images in under 5 minutes for less than ₹2. Watch."*

**Then:**
1. Upload 5–10 sample images live
2. Type a one-sentence description
3. Hit Generate — let the image counter tick up in real time
4. Show the downloaded ZIP structure
5. Plug `dataset.yaml` into a YOLOv8 command to demonstrate training-readiness

---

*Document: KALP_WORKFLOW.md | Project: Kalp | Version: 1.0.0*
*Generated for internal development, hackathon submission, and agent implementation reference.*
