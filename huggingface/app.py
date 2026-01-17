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
with gr.Blocks() as iface:
    input_list = gr.JSON(label="Input list of strings")
    output_list = gr.JSON(label="Embeddings")
    btn = gr.Button("Embed")
    btn.click(fn=get_embeddings, inputs=input_list, outputs=output_list, api_name="predict")

if __name__ == "__main__":
    iface.launch()
