
# this code is for googgle colab
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Model
from tensorflow.keras.layers import Input, Conv2D, MaxPooling2D, Flatten, Dense
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.losses import MeanSquaredError
from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
from tensorflow.keras.utils import to_categorical
import cv2
import os
from sklearn.model_selection import train_test_split

# Configuration
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 50
EMBEDDING_SIZE = 128

def load_dataset(dataset_path):
    """Load and preprocess iris dataset"""
    images = []
    labels = []
    class_names = sorted(os.listdir(dataset_path))
    
    for class_idx, class_name in enumerate(class_names):
        class_path = os.path.join(dataset_path, class_name)
        for img_file in os.listdir(class_path):
            img_path = os.path.join(class_path, img_file)
            
            # Load and preprocess image
            img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
            img = cv2.resize(img, IMG_SIZE)
            img = img.astype('float32') / 255.0
            
            # Add channel dimension
            img = np.expand_dims(img, axis=-1)
            
            images.append(img)
            labels.append(class_idx)
    
    return np.array(images), np.array(labels), class_names

def build_embedding_model(input_shape, embedding_size):
    """Build iris embedding model"""
    inputs = Input(shape=input_shape)
    
    # Feature extraction
    x = Conv2D(32, (3, 3), activation='relu')(inputs)
    x = MaxPooling2D((2, 2))(x)
    x = Conv2D(64, (3, 3), activation='relu')(x)
    x = MaxPooling2D((2, 2))(x)
    x = Conv2D(128, (3, 3), activation='relu')(x)
    x = MaxPooling2D((2, 2))(x)
    
    # Flatten and embedding
    x = Flatten()(x)
    embeddings = Dense(embedding_size, activation='relu', name='embedding')(x)
    
    # Classification head (for training only)
    outputs = Dense(len(class_names), activation='softmax')(embeddings)
    
    return Model(inputs=inputs, outputs=[embeddings, outputs])

# Load dataset
dataset_path = "/content/iris_dataset"  # Update with your dataset path
images, labels, class_names = load_dataset(dataset_path)

# Split dataset
X_train, X_val, y_train, y_val = train_test_split(
    images, labels, test_size=0.2, random_state=42
)

# Build model
model = build_embedding_model(images[0].shape, EMBEDDING_SIZE)
model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss={'embedding': MeanSquaredError(), 'dense': 'sparse_categorical_crossentropy'},
    metrics={'dense': 'accuracy'}
)

# Callbacks
callbacks = [
    EarlyStopping(patience=5, restore_best_weights=True),
    ModelCheckpoint('best_model.h5', save_best_only=True)
]

# Train model
history = model.fit(
    X_train,
    {'embedding': X_train, 'dense': y_train},
    validation_data=(X_val, {'embedding': X_val, 'dense': y_val}),
    epochs=EPOCHS,
    batch_size=BATCH_SIZE,
    callbacks=callbacks
)

# Create embedding-only model for inference
embedding_model = Model(
    inputs=model.input,
    outputs=model.get_layer('embedding').output
)

# Save final model
embedding_model.save('iris_embedding_model.h5')
print("Embedding model saved successfully!")

# Optional: Test model
test_image = X_val[0]
embedding = embedding_model.predict(np.expand_dims(test_image, axis=0))
print(f"Generated embedding shape: {embedding.shape}")