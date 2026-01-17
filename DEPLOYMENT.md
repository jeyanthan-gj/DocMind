# DocMind AI Hub - Deployment Guide

This repository contains two main folders: `frontend` and `backend`.

## 📦 Backend Deployment (Render)
1.  Go to [Render.com](https://render.com) and create a new **Web Service**.
2.  Connect your GitHub repository.
3.  Set the **Root Directory** to `backend`.
4.  **Environment**: `Python 3`.
5.  **Build Command**: `pip install -r requirements.txt`.
6.  **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`.
7.  Add the following **Environment Variables** in the Render Dashboard:
    - `SUPABASE_URL`: Your Supabase URL.
    - `SUPABASE_SERVICE_KEY`: Your Supabase Service Role Key.
    - (API Keys like Groq/Typesense are fetched from your Supabase `system_settings` table automatically).

## 🎨 Frontend Deployment (Netlify)
1.  Go to [Netlify.com](https://www.netlify.com) and create a new site from GitHub.
2.  Set the **Base Directory** to `frontend`.
3.  **Build Command**: `npm run build`.
4.  **Publish Directory**: `dist`.
5.  Add the following **Environment Variable** in the Netlify Dashboard:
    - `VITE_BACKEND_URL`: The URL of your Render backend (e.g., `https://docmind-backend.onrender.com`).

## 🛠️ Supabase Setup
Ensure your `system_settings` table in Supabase contains:
- `GROQ_API_KEY`: Your Groq API key.
- `TYPESENSE_API_KEY`: Your Typesense API key.
- `TYPESENSE_HOST`: Your Typesense endpoint (without https://).
