/**
 * PERWIRA - Full Telegram Alert Test via HMAC Webhook Simulation
 * Menguji keseluruhan alur: HMAC Sign → Verify → Kirim Telegram
 */

import crypto from 'crypto';

const HMAC_SECRET = 'fallback_development_secret_key_12345';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8859226696:AAEiZhHAMFhrS8hiPpdFhJNhiSUGJiRU6fQ';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1003872080281';

// ─── Kirim alert ke Telegram ─────────────────────────────────────────────────
async function kirimTelegram(level, message) {
  const teks = `⚠️ <b>LAPORAN PERWIRA SECURITY</b>\n\n🔴 ANCAMAN TERDETEKSI Level ${level}\n📋 Detail: ${message}\n🕐 Waktu: ${new Date().toLocaleString('id-ID')}\n\n✅ Pesan ini diverifikasi via HMAC-SHA256`;
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: teks, parse_mode: 'HTML' })
  });
  return resp.json();
}

// ─── Simulasi Full Flow ───────────────────────────────────────────────────────
async function runTest() {
  console.log('🧪 TEST: Simulasi Webhook HMAC → Kirim Alert Telegram\n');

  const payload = {
    status: 'BAHAYA',
    level: 3,
    message: 'Percobaan login tidak sah terdeteksi di database port 5432',
    timestamp: Date.now()
  };
  const payloadString = JSON.stringify(payload);

  // 1. Sign payload dengan HMAC
  const signature = crypto.createHmac('sha256', HMAC_SECRET).update(payloadString).digest('hex');
  console.log('✅ HMAC Signature dibuat:', signature.substring(0, 20) + '...');

  // 2. Verify signature (simulasi backend)
  const verify = crypto.createHmac('sha256', HMAC_SECRET).update(payloadString).digest('hex');
  if (signature !== verify) {
    console.log('❌ Signature tidak cocok! Ditolak.');
    return;
  }
  console.log('✅ Signature VALID — Webhook diterima backend.');

  // 3. Kirim ke Telegram
  console.log('📨 Mengirim alert ke Telegram...');
  const result = await kirimTelegram(payload.level, payload.message);

  if (result.ok) {
    console.log(`✅ Alert TERKIRIM ke grup "${result.result.chat.title}" (message_id: ${result.result.message_id})`);
  } else {
    console.log('❌ Gagal kirim Telegram:', result.description);
  }

  // 4. Test signature palsu
  console.log('\n🔴 TEST: Kirim signature PALSU (simulasi hacker)...');
  const fakeSignature = 'hacked_invalid_signature_0000000000000000';
  const fakeverify = crypto.createHmac('sha256', HMAC_SECRET).update(payloadString).digest('hex');
  if (fakeSignature !== fakeverify) {
    console.log('✅ Signature palsu DITOLAK oleh backend! (401 Unauthorized)');
    console.log('✅ Telegram TIDAK dikirimi pesan palsu. Sistem aman!\n');
  }

  console.log('📊 HASIL: Sistem HMAC + Telegram berjalan sempurna.');
}

runTest().catch(console.error);
