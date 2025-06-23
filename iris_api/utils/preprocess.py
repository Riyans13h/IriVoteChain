import cv2
import numpy as np
import logging

# Configure logging
logger = logging.getLogger(__name__)

def preprocess_iris_image(image_path, target_size=(224, 224)):
    """
    Preprocess iris image for model input
    Steps: Load, resize, normalize, enhance contrast, and mask
    """
    try:
        # Load image in grayscale
        img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise ValueError(f"Could not read image at {image_path}")
        
        logger.info(f"Original image shape: {img.shape}")
        
        # Resize to target size
        img = cv2.resize(img, target_size)
        logger.info(f"Resized image shape: {img.shape}")
        
        # Normalize pixel values
        img = img.astype('float32') / 255.0
        
        # Enhance contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img = clahe.apply((img * 255).astype('uint8'))
        img = img.astype('float32') / 255.0
        
        # Create circular mask (iris region)
        mask = np.zeros_like(img)
        center = (target_size[0]//2, target_size[1]//2)
        radius = min(target_size)//2 - 10
        cv2.circle(mask, center, radius, 1, -1)
        
        # Apply mask
        img = img * mask
        
        # Add channel dimension (required for model)
        img = np.expand_dims(img, axis=-1)
        logger.info(f"Final image shape: {img.shape}")
        
        return img
        
    except Exception as e:
        logger.error(f"Preprocessing failed: {str(e)}", exc_info=True)
        raise