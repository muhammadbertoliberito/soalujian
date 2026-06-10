# LAPORAN TEKNIS: INTEGRASI KEAMANAN WEB & SISTEM AI (PERWIRA)

Laporan ini menyajikan analisis hasil implementasi infrastruktur deteksi ancaman otomatis, performa konkurensi model AI, dan mekanisme pertahanan siber (HMAC) pada web dashboard PERWIRA.

---

## 1. LAPORAN EVALUASI PERFORMA MODEL AI

Dalam sistem deteksi ancaman PERWIRA, dua model AI dari NVIDIA NIM dijalankan untuk menganalisis risiko keamanan transaksi/database: **Model A (Random Forest)** dan **Model B (Support Vector Machine)**.

### Perbandingan Efisiensi & Kecepatan:
- **Random Forest (RF) lebih cepat:** Random Forest bekerja dengan membagi input ke beberapa pohon keputusan (Decision Trees) secara paralel. Pada tahap inferensi (prediction), kompleksitas komputasinya relatif rendah karena hanya memerlukan penelusuran jalur pohon keputusan (kompleksitas waktu $O(D \times T)$ dengan $D$ sebagai kedalaman pohon dan $T$ jumlah pohon).
- **SVM lebih lambat:** SVM harus menghitung jarak hyperplane terhadap seluruh vektor pendukung (Support Vectors) di ruang dimensi tinggi (terutama jika menggunakan kernel non-linear seperti RBF). Kompleksitas inferensinya bergantung pada jumlah *support vectors* ($O(N \times M)$), menjadikannya lebih intensif secara komputasi dan memakan waktu lebih lama.

### Perbandingan Akurasi:
- **Random Forest** memiliki ketahanan yang lebih baik terhadap *noise* dan data pencilan (outliers) pada logs keamanan karena mekanisme voting dari banyak pohon (bagging). Ini meminimalkan risiko overfitting pada pola log palsu.
- **SVM** sangat akurat pada data dimensi tinggi dengan batas pemisah yang jelas, namun sangat sensitif terhadap skala data dan parameter kernel. Pada data log keamanan yang bervariasi, Random Forest cenderung memberikan akurasi dasar yang lebih stabil tanpa *tuning* berlebihan.

---

## 2. LAPORAN KINERJA SISTEM WEB & KEAMANAN

### A. Optimalisasi Konkurensi dengan `asyncio`
Menunggu respons dari beberapa model AI sekaligus (NVIDIA NIM APIs) sering kali menyebabkan penumpukan antrean pada server (*blocking code*). Jika dijalankan secara sekilas/sekuensial:
$$\text{Total Waktu} = \text{Waktu RF (0.3s)} + \text{Waktu SVM (0.5s)} = 0.8 \text{ detik}$$

Dengan mengimplementasikan **`asyncio.gather`** di Python/FastAPI:
- Eksekusi model dilakukan secara asinkronus dan paralel (bersamaan).
- Waktu respons total dipangkas menjadi hanya mengikuti model yang paling lambat:
$$\text{Total Waktu} = \max(\text{Waktu RF (0.3s)}, \text{Waktu SVM (0.5s)}) = 0.5 \text{ detik}$$
- **Pencegahan Crash/Timeout:** Konkurensi ini memastikan server tidak mengalami *hang* atau *request timeout* dari platform hosting (seperti batas 10-detik Vercel Serverless Functions) saat volume trafik tinggi.

### B. Proteksi Integritas dengan Stempel Digital HMAC
Untuk mencegah penyusup mengirimkan data ancaman palsu (spoofing alert) yang dapat mengacaukan respons keamanan dan memicu notifikasi spam di Telegram, kami menerapkan otentikasi **HMAC-SHA256**:
- Setiap laporan webhook yang dikirim oleh Supabase ditandatangani dengan kunci rahasia (`HMAC_SECRET`) menghasilkan stempel unik di header `x-signature`.
- Vercel API secara instan memvalidasi stempel ini dengan merekonstruksi HMAC dari isi data (*request body*) menggunakan kunci rahasia yang sama.
- **Hasil Pengujian Keamanan:**
  1. **Akses Sah:** Webhook dengan signature valid langsung diteruskan dan notifikasi dikirim ke Telegram.
  2. **Akses Palsu:** Serangan dengan signature yang dirusak/kosong terdeteksi secara instan oleh backend Node.js dan diblokir dengan kode respon `401 Unauthorized`. Sistem aman dari manipulasi data eksternal.
