import os
from sentence_transformers import SentenceTransformer

model_name = os.getenv("MODEL_NAME", "BAAI/bge-small-en-v1.5")
print(f"Pre-downloading model: {model_name}")
SentenceTransformer(model_name)
print("Model downloaded successfully.")

