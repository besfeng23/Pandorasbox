from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
import os

app = FastAPI()
model = None

async def get_model():
    global model
    if model is None:
        # Load the model only when it's needed
        model_name = os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5")
        model = SentenceTransformer(model_name)
    return model

class EmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str = "bge-small-en-v1.5"


@app.post("/v1/embeddings")
async def create_embedding(request: EmbeddingRequest):
    current_model = await get_model() # Get the model, loading it if necessary
    texts = [request.input] if isinstance(request.input, str) else request.input
    embeddings = current_model.encode(texts).tolist()
    return {"data": [{"embedding": emb, "index": i} for i, emb in enumerate(embeddings)]}


@app.get("/health")
async def health():
    return {"status": "healthy"}
