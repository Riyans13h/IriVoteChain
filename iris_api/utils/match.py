import numpy as np
from tensorflow.keras.models import load_model
from sklearn.metrics.pairwise import cosine_similarity
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Global model instance
MODEL = None
MODEL_PATH = 'model/iris_embedding_model.h5'

def load_iris_model():
    """Load the iris model once and cache it"""
    global MODEL
    if MODEL is None:
        logger.info("Loading iris embedding model...")
        MODEL = load_model(MODEL_PATH, compile=False)
        logger.info(f"Model loaded! Input shape: {MODEL.input_shape}, Output shape: {MODEL.output_shape}")
    return MODEL

def generate_iris_embedding(preprocessed_image):
    """Generate iris embedding using pre-trained CNN"""
    model = load_iris_model()
    logger.info(f"Input image shape: {preprocessed_image.shape}")
    
    # Add batch dimension
    input_batch = np.expand_dims(preprocessed_image, axis=0)
    logger.info(f"Model input shape: {input_batch.shape}")
    
    # Generate embedding
    embedding = model.predict(input_batch, verbose=0)
    logger.info(f"Embedding shape: {embedding.shape}")
    
    return embedding[0]  # Return first element of batch

def verify_iris_match(stored_hash, verification_hash, threshold=0.85):
    """Compare two iris hashes using cosine similarity"""
    # Ensure both are 1D arrays
    stored_flat = stored_hash.flatten()
    verification_flat = verification_hash.flatten()
    
    # Log shapes for debugging
    logger.info(f"Stored hash shape: {stored_flat.shape}")
    logger.info(f"Verification hash shape: {verification_flat.shape}")
    
    # Reshape for cosine similarity calculation
    stored_2d = stored_flat.reshape(1, -1)
    verification_2d = verification_flat.reshape(1, -1)
    
    # Calculate similarity
    similarity = cosine_similarity(stored_2d, verification_2d)[0][0]
    logger.info(f"Similarity score: {similarity}")
    
    # Determine match
    match = similarity > threshold
    
    return match, similarity