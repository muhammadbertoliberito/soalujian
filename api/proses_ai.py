from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import aiohttp
import os
import time

app = FastAPI()

# Allow CORS for client-side frontend calls
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def panggil_ai(session, nama_model, data, nvidia_api_key):
    url = f"https://api.nvidia.com/v1/models/{nama_model}"
    headers = {"Authorization": f"Bearer {nvidia_api_key}"}
    
    # If the token is not set, or is the placeholder, run a simulated NIM model response
    if not nvidia_api_key or nvidia_api_key == "TOKEN_NVIDIA_ANDA" or nvidia_api_key.startswith("mock_"):
        # Simulate NIM model latency (RF: 300ms, SVM: 500ms)
        delay = 0.3 if "rf" in nama_model else 0.5
        await asyncio.sleep(delay)
        
        # Determine dummy prediction based on inputs
        prediction = "BAHAYA" if "bahaya" in str(data).lower() or "threat" in str(data).lower() else "AMAN"
        confidence = 0.95 if "rf" in nama_model else 0.89
        
        return {
            "model": nama_model,
            "status": "success",
            "prediction": prediction,
            "confidence": confidence,
            "simulated": True,
            "execution_delay": delay
        }
        
    try:
        async with session.post(url, json={"input": data}, headers=headers, timeout=10) as respon:
            if respon.status == 200:
                return await respon.json()
            else:
                text = await respon.text()
                return {"error": f"NVIDIA NIM API Error: {respon.status}", "details": text}
    except Exception as e:
        return {"error": f"Request failed: {str(e)}"}

@app.post("/api/proses_ai")
@app.get("/api/proses_ai")
async def proses_dua_ai_sekaligus(request: Request):
    # Retrieve input data from JSON body or query parameters
    data_user = "test_check"
    if request.method == "POST":
        try:
            body = await request.json()
            data_user = body.get("input", "test_check")
        except Exception:
            pass
    else:
        data_user = request.query_params.get("input", "test_check")
        
    nvidia_api_key = os.environ.get("NVIDIA_API_KEY", "TOKEN_NVIDIA_ANDA")
    
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        # Run model-nvidia-rf and model-nvidia-svm concurrently (parallel)
        tugas1 = panggil_ai(session, "model-nvidia-rf", data_user, nvidia_api_key)
        tugas2 = panggil_ai(session, "model-nvidia-svm", data_user, nvidia_api_key)
        
        # Await both tasks together
        hasil = await asyncio.gather(tugas1, tugas2)
        
    end_time = time.time()
    duration = end_time - start_time
    
    return {
        "status": "success",
        "timestamp": time.time(),
        "input_evaluated": data_user,
        "duration_seconds": duration,
        "async_optimized": True,
        "results": {
            "model_rf": hasil[0],
            "model_svm": hasil[1]
        }
    }
