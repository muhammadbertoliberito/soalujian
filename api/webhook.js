import crypto from 'crypto';

export default async function handler(req, res) {
  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const KUNCI_RAHASIA = process.env.HMAC_SECRET || 'fallback_development_secret_key_12345';
  const stempel_dari_supabase = req.headers['x-signature']; // Cap stempel yang dikirim Supabase
  
  if (!stempel_dari_supabase) {
    return res.status(400).json({ error: 'Missing x-signature header' });
  }

  // Kita buat cap stempel tandingan dari isi surat yang diterima
  const bodyString = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const stempel_buatan_kita = crypto
    .createHmac('sha256', KUNCI_RAHASIA)
    .update(bodyString)
    .digest('hex');

  // Jika stempel tidak cocok, coret! Jangan kirim ke Telegram!
  if (stempel_dari_supabase !== stempel_buatan_kita) {
    console.warn('Signature mismatch!', { received: stempel_dari_supabase, expected: stempel_buatan_kita });
    return res.status(401).json({ 
      error: 'Palsu! Stempel HMAC tidak cocok!',
      received: stempel_dari_supabase,
      expected_for_debugging: stempel_buatan_kita // Helpful for debugging signature generation
    });
  }

  // Retrieve telegram credentials
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  const level = req.body && req.body.level ? req.body.level : 'UNKNOWN';
  const message = req.body && req.body.message ? req.body.message : 'No message body provided';

  console.log('Signature verified successfully. Processing Telegram dispatch...');

  // Jika lolos/cocok, kirim pesan ke Telegram
  if (telegramBotToken && telegramChatId) {
    try {
      const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: telegramChatId, 
          text: `⚠️ LAPORAN PERWIRA: Terdeteksi Ancaman Level ${level}\nDetail: ${message}` 
        })
      });
      const telegramResult = await response.json();
      
      return res.status(200).json({ 
        success: true, 
        message: 'Laporan valid dan dikirim ke Telegram.',
        telegram_response: telegramResult
      });
    } catch (error) {
      return res.status(500).json({ 
        success: true, 
        message: 'Laporan valid, tetapi gagal mengirim ke Telegram.', 
        error: error.message 
      });
    }
  } else {
    // If Telegram credentials are not set (local development / testing), log and return success
    return res.status(200).json({
      success: true,
      message: 'Laporan valid! (Notifikasi Telegram di-skip karena TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID belum di-set)',
      payload_received: req.body
    });
  }
}
