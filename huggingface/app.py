import gradio as gr
from sentence_transformers import SentenceTransformer

# Load the model once
print("📦 Loading Sentence Transformer...")
model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embeddings(texts):
    if not texts:
        return []
    if isinstance(texts, str):
        texts = [texts]
    embeddings = model.encode(texts)
    return embeddings.tolist()

# Use gr.Interface - it is the most stable for API access via Gradio Client
# It automatically exposes the endpoint at "/predict"
demo = gr.Interface(
    fn=get_embeddings,
    inputs=gr.JSON(label="Texts to Embed"),
    outputs=gr.JSON(label="Generated Embeddings"),
    api_name="predict"
)

if __name__ == "__main__":
    demo.launch()
