// PERWIRA Security Dashboard App Logic

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const metricCard = document.getElementById('metric-card');
  const statusBadge = document.getElementById('status-badge');
  const statusText = document.getElementById('status-text');
  const statusDesc = document.getElementById('status-desc');
  const dangerLevelVal = document.getElementById('danger-level');
  const lastUpdateVal = document.getElementById('last-update');
  
  const webhookForm = document.getElementById('webhook-form');
  const selectStatus = document.getElementById('simulate-status');
  const selectLevel = document.getElementById('threat-level');
  const alertMsgInput = document.getElementById('alert-message');
  const hmacSecretInput = document.getElementById('hmac-secret-input');
  const tamperCheckbox = document.getElementById('tamper-signature');
  
  const aiInputData = document.getElementById('ai-input-data');
  const btnRunAi = document.getElementById('btn-run-ai');
  const aiResultsPanel = document.getElementById('ai-results-panel');
  const aiDuration = document.getElementById('ai-duration');
  const rfPred = document.getElementById('rf-pred');
  const rfConf = document.getElementById('rf-conf');
  const svmPred = document.getElementById('svm-pred');
  const svmConf = document.getElementById('svm-conf');
  
  const consoleLogs = document.getElementById('console-logs');
  const btnClearConsole = document.getElementById('clear-console');

  // Helper: Log message to virtual console
  function logToConsole(message, type = 'system-msg') {
    const timestamp = new Date().toLocaleTimeString();
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    logLine.innerText = `[${timestamp}] ${message}`;
    consoleLogs.appendChild(logLine);
    consoleLogs.scrollTop = consoleLogs.scrollHeight;
  }

  // Clear Console
  btnClearConsole.addEventListener('click', () => {
    consoleLogs.innerHTML = '';
    logToConsole('Logs cleared.', 'system-msg');
  });

  // Helper: Calculate HMAC SHA-256 using browser Web Crypto API
  async function computeHMAC(secret, message) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw', 
      keyData, 
      { name: 'HMAC', hash: 'SHA-256' }, 
      false, 
      ['sign']
    );
    
    const signatureBuffer = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Update Security Metric Card (Langkah 9)
  function updateMetricCard(status, level, message) {
    const now = new Date().toLocaleTimeString();
    lastUpdateVal.innerText = now;
    dangerLevelVal.innerText = level;

    if (status === 'BAHAYA') {
      // Transition card background to Red (danger state)
      metricCard.className = 'metric-card card-danger';
      statusBadge.innerText = 'BAHAYA';
      statusText.innerText = 'LEVEL ALERT: CRITICAL';
      statusDesc.innerText = message || 'Sistem mendeteksi ancaman aktif di database!';
      logToConsole(`Metric Card updated: BAHAYA (Level ${level})`, 'webhook-out-fail');
    } else {
      // Transition card background to Green (safe state)
      metricCard.className = 'metric-card card-safe';
      statusBadge.innerText = 'AMAN';
      statusText.innerText = 'SYSTEM SECURED';
      statusDesc.innerText = 'Seluruh gerbang database dan API berjalan normal tanpa gangguan.';
      logToConsole(`Metric Card updated: AMAN (Level ${level})`, 'webhook-out-success');
    }
  }

  // Submit Webhook Form (Langkah 8 & 9)
  webhookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const status = selectStatus.value;
    const level = selectLevel.value;
    const message = alertMsgInput.value;
    const secret = hmacSecretInput.value;
    const shouldTamper = tamperCheckbox.checked;

    const payload = {
      status: status,
      level: parseInt(level),
      message: message,
      timestamp: Date.now()
    };

    const payloadString = JSON.stringify(payload);
    logToConsole(`Simulasi Payload: ${payloadString}`, 'webhook-in');

    try {
      // Generate HMAC signature
      let signature = await computeHMAC(secret, payloadString);
      
      if (shouldTamper) {
        // Tamper signature to simulate a spoofing attack
        signature = 'invalid_tampered_signature_' + signature.substring(20);
        logToConsole(`MENYUAP SIGNATURE (Simulasi Serangan): ${signature}`, 'webhook-out-fail');
      } else {
        logToConsole(`Signature HMAC Terbuat: ${signature}`, 'system-msg');
      }

      logToConsole('Mengirim webhook laporan ke /api/webhook...', 'system-msg');

      // Send to Vercel backend webhook
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-signature': signature
        },
        body: payloadString
      });

      const result = await response.json();

      if (response.ok) {
        logToConsole(`Webhook Berhasil Diterima: ${result.message}`, 'webhook-out-success');
        // Update metric card UI dynamically on success
        updateMetricCard(status, level, message);
      } else {
        logToConsole(`Webhook Ditolak Backend (Status ${response.status}): ${result.error}`, 'webhook-out-fail');
        if (result.expected_for_debugging) {
          logToConsole(`Bocoran stempel benar dari backend: ${result.expected_for_debugging}`, 'system-msg');
        }
      }
    } catch (error) {
      logToConsole(`Koneksi Gagal: ${error.message}`, 'webhook-out-fail');
    }
  });

  // Call Asynchronous AI (Langkah 7)
  btnRunAi.addEventListener('click', async () => {
    const inputVal = aiInputData.value;
    logToConsole(`Memicu panggilan 2 model AI NVIDIA NIM secara paralel...`, 'ai-log');
    btnRunAi.disabled = true;
    btnRunAi.innerText = 'Menunggu AI...';
    aiResultsPanel.style.display = 'none';

    try {
      const response = await fetch(`/api/proses_ai?input=${encodeURIComponent(inputVal)}`);
      const result = await response.json();
      
      btnRunAi.disabled = false;
      btnRunAi.innerText = 'Jalankan Rantai AI (Parallel)';

      if (response.ok && result.status === 'success') {
        logToConsole(`AI selesai dieksekusi dalam ${result.duration_seconds.toFixed(4)} detik tanpa antre!`, 'ai-log');
        
        // Display benchmarks
        aiDuration.innerText = `${result.duration_seconds.toFixed(3)}s`;
        aiResultsPanel.style.display = 'block';

        const rf = result.results.model_rf;
        const svm = result.results.model_svm;

        // Populate card RF
        if (rf.error) {
          rfPred.innerText = 'Error';
          rfConf.innerText = rf.error;
          rfPred.style.color = 'var(--color-danger)';
        } else {
          rfPred.innerText = rf.prediction;
          rfConf.innerText = `Confidence: ${(rf.confidence * 100).toFixed(0)}%`;
          rfPred.style.color = rf.prediction === 'BAHAYA' ? 'var(--color-danger)' : 'var(--color-safe)';
        }

        // Populate card SVM
        if (svm.error) {
          svmPred.innerText = 'Error';
          svmConf.innerText = svm.error;
          svmPred.style.color = 'var(--color-danger)';
        } else {
          svmPred.innerText = svm.prediction;
          svmConf.innerText = `Confidence: ${(svm.confidence * 100).toFixed(0)}%`;
          svmPred.style.color = svm.prediction === 'BAHAYA' ? 'var(--color-danger)' : 'var(--color-safe)';
        }
      } else {
        logToConsole(`Gagal mengevaluasi AI: ${result.error || 'Server error'}`, 'webhook-out-fail');
      }
    } catch (error) {
      btnRunAi.disabled = false;
      btnRunAi.innerText = 'Jalankan Rantai AI (Parallel)';
      logToConsole(`Koneksi API AI Gagal: ${error.message}`, 'webhook-out-fail');
    }
  });
});
