import numpy as np
from PIL import Image
from io import BytesIO
from typing import List
import math

def calculate_histogram(image_bytes: bytes) -> np.ndarray:
    """Calculates a normalized color histogram for an image."""
    try:
        img = Image.open(BytesIO(image_bytes)).convert('RGB')
        # Resize to a smaller standard size to speed up computation and reduce noise
        img = img.resize((100, 100))
        # Get histogram (R, G, B concatenated)
        hist = img.histogram()
        # Normalize
        hist = np.array(hist, dtype=np.float32)
        hist = hist / np.sum(hist)
        return hist
    except Exception as e:
        print(f"Error processing image for histogram: {e}")
        return np.zeros(768)

def compute_similarity(hist1: np.ndarray, hist2: np.ndarray) -> float:
    """Computes Bhattacharyya distance or intersection between two histograms."""
    # Using histogram intersection
    intersection = np.minimum(hist1, hist2)
    return np.sum(intersection)

def check_seed_diversity(images_bytes: List[bytes], similarity_threshold: float = 0.90) -> dict:
    """
    Checks if a set of seed images is too similar to each other.
    Returns a dictionary with 'is_diverse' boolean and 'average_similarity' float.
    """
    if len(images_bytes) < 2:
        return {"is_diverse": True, "average_similarity": 0.0, "message": "Not enough images to compare."}
        
    histograms = [calculate_histogram(img) for img in images_bytes]
    
    similarities = []
    num_images = len(histograms)
    
    for i in range(num_images):
        for j in range(i + 1, num_images):
            sim = compute_similarity(histograms[i], histograms[j])
            similarities.append(sim)
            
    avg_similarity = float(np.mean(similarities))
    
    # If the average similarity across all pairs is extremely high, they are not diverse enough.
    is_diverse = avg_similarity < similarity_threshold
    
    message = "Images are sufficiently diverse." if is_diverse else "Seed images are too statistically similar. This will collapse generation quality. Please upload a more varied set of angles, lighting, or backgrounds."
    
    return {
        "is_diverse": is_diverse,
        "average_similarity": avg_similarity,
        "message": message
    }
