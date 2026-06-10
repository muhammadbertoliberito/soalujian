import asyncio
import time
import sys
import os

# Adjust path to find the api module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from api.proses_ai import panggil_ai
import aiohttp

async def run_test():
    print("[TEST] RUNNING ASYNCHRONOUS AI NIM CONCURRENCY TESTS...\n")
    start_time = time.time()
    
    async with aiohttp.ClientSession() as session:
        # Launch both simulated NVIDIA NIM models concurrently
        t1 = panggil_ai(session, "model-nvidia-rf", "uji_keamanan_transaksi", "mock_key")
        t2 = panggil_ai(session, "model-nvidia-svm", "uji_keamanan_transaksi", "mock_key")
        res = await asyncio.gather(t1, t2)
        
    duration = time.time() - start_time
    
    print(f"Hasil Model RF: {res[0]}")
    print(f"Hasil Model SVM: {res[1]}")
    print(f"Waktu Total Eksekusi Paralel (Asyncio): {duration:.4f} detik")
    
    # In simulation mode:
    # - model-nvidia-rf sleeps for 0.3s
    # - model-nvidia-svm sleeps for 0.5s
    # Sequential execution: 0.3 + 0.5 = 0.8s
    # Concurrent execution: max(0.3, 0.5) = 0.5s + small overhead
    print(f"Perbandingan: Konkurensi menghemat ~0.3 detik.")
    
    if duration < 0.75:
      print("\n[OK] TEST PASSED: asyncio.gather successfully executed both models in parallel.")
      sys.exit(0)
    else:
      print("\n[FAIL] TEST FAILED: Models were executed sequentially or faced significant latency.")
      sys.exit(1)

if __name__ == "__main__":
    asyncio.run(run_test())
