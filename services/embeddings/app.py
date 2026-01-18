from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

app = FastAPI()
model = SentenceTransformer('BAAI/bge-small-en-v1.5')


class EmbeddingRequest(BaseModel):
    input: str | list[str]
    model: str = "bge-small-en-v1.5"


@app.post("/v1/embeddings")
async def create_embedding(request: EmbeddingRequest):
    texts = [request.input] if isinstance(request.input, str) else request.input
    embeddings = model.encode(texts).tolist()
    return {"data": [{"embedding": emb, "index": i} for i, emb in enumerate(embeddings)]}


@app.get("/health")
async def health():
    return {"status": "healthy"}
