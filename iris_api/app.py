from flask import Flask, request, jsonify
import os
import uuid
import logging
import numpy as np
from utils.preprocess import preprocess_iris_image
from utils.match import generate_iris_embedding, verify_iris_match
from utils.sqlite_utils import get_iris_hash, register_voter, init_db

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
MODEL_PATH = 'model/iris_embedding_model.h5'  # Use .h5 for compatibility
DATABASE = 'voters.db'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Configure logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# Ensure upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize database
init_db(DATABASE)

# CORS Middleware
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    return response

@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    """Register a new voter with their iris data"""
    if request.method == 'OPTIONS':
        return jsonify(), 200

    try:
        wallet_address = request.form['wallet_address']
        # wallet_address = request.form['wallet_address'].strip().lower()
        if 'iris_image' not in request.files:
            return jsonify({'error': 'No iris image provided'}), 400

        file = request.files['iris_image']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        # Save uploaded file
        filename = f"{uuid.uuid4().hex}.bmp"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        app.logger.info(f"Saved registration image to: {file_path}")

        # Preprocess and generate iris hash
        processed_image = preprocess_iris_image(file_path)
        app.logger.info(f"Preprocessed image shape: {processed_image.shape}")

        iris_hash = generate_iris_embedding(processed_image)
        app.logger.info(f"Iris hash shape: {iris_hash.shape}")

        # Store in database
        register_voter(DATABASE, wallet_address, iris_hash)

        # Cleanup
        os.remove(file_path)

        return jsonify({
            'success': True,
            'message': 'Voter registered successfully'
        })

    except Exception as e:
        app.logger.error(f"Registration error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/verify', methods=['POST', 'OPTIONS'])
def verify():
    """Verify a voter's identity using iris recognition"""
    if request.method == 'OPTIONS':
        return jsonify(), 200

    try:
        wallet_address = request.form['wallet_address']
        # wallet_address = request.form['wallet_address'].strip().lower()
        if 'iris_image' not in request.files:
            return jsonify({'error': 'No iris image provided'}), 400

        file = request.files['iris_image']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400

        # Save uploaded file
        filename = f"verify_{uuid.uuid4().hex}.bmp"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        app.logger.info(f"Saved verification image to: {file_path}")

        # Get stored hash from database
        stored_hash = get_iris_hash(DATABASE, wallet_address)
        if stored_hash is None:
            app.logger.warning(f"Voter not registered: {wallet_address}")
            os.remove(file_path)
            return jsonify({
                'verified': False,
                'error': 'Voter not registered'
            }), 404

        # Preprocess and generate verification hash
        processed_image = preprocess_iris_image(file_path)
        app.logger.info(f"Preprocessed image shape: {processed_image.shape}")

        verification_hash = generate_iris_embedding(processed_image)
        app.logger.info(f"Verification hash shape: {verification_hash.shape}")

        # Compare hashes
        match, similarity = verify_iris_match(stored_hash, verification_hash)
        app.logger.info(f"Match result: {match}, Similarity: {similarity}")

        # Cleanup
        os.remove(file_path)

        return jsonify({
            'verified': bool(match),
            'similarity': float(similarity)
        })

    except Exception as e:
        app.logger.error(f"Verification error: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
