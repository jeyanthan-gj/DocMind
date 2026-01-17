import gradio as gr
from sentence_transformers import SentenceTransformer

# Load the model once
model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embeddings(texts):
    if isinstance(texts, str):
        texts = [texts]
    embeddings = model.encode(texts)
    return embeddings.tolist()

# Define Gradio interface
iface = gr.Interface(
    fn=get_embeddings,
    inputs=gr.JSON(label="Input list of strings"),
    outputs=gr.JSON(label="Embeddings"),
    title="DocMind Embedding API",
    description="Dedicated embedding service for DocMind RAG."
)

if __name__ == "__main__":
    iface.launch()
