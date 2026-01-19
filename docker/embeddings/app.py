import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()

# Load model from env var or default
MODEL_NAME = os.getenv("MODEL_NAME", "BAAI/bge-small-en-v1.5")
model = SentenceTransformer(MODEL_NAME)

class EmbeddingRequest(BaseModel):
    input: str | List[str]
    model: Optional[str] = None
    encoding_format: Optional[str] = "float"

class EmbeddingData(BaseModel):
    object: str = "embedding"
    embedding: List[float]
    index: int

class EmbeddingResponse(BaseModel):
    object: str = "list"
    data: List[EmbeddingData]
    model: str
    usage: dict

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dimension": model.get_sentence_embedding_dimension()
    }

@app.post("/v1/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request: EmbeddingRequest):
    try:
        sentences = request.input
        if isinstance(sentences, str):
            sentences = [sentences]
            
        embeddings = model.encode(sentences, normalize_embeddings=True)
        
        data = []
        for i, emb in enumerate(embeddings):
            data.append(EmbeddingData(
                embedding=emb.tolist(),
                index=i
            ))
            
        return EmbeddingResponse(
            data=data,
            model=MODEL_NAME,
            usage={
                "prompt_tokens": 0,
                "total_tokens": 0
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

