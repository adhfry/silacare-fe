// Port dari FE_SiLAKES src/services/ktpOcr.ts, SENGAJA memakai model, prompt,
// dan key JSON yang SAMA PERSIS (nik/nama/tempat_lahir/tanggal_lahir/
// jenis_kelamin/alamat/rt_rw/kel_desa/kecamatan/agama/status_perkawinan/
// pekerjaan) per instruksi eksplisit user, supaya perilaku OCR KTP konsisten
// antara SiLAKES (internal) dan SiLACARE (pasien). OCR berjalan client-side
// (browser pasien -> Gemini langsung), TIDAK ada endpoint OCR di backend.
import { GoogleGenAI } from '@google/genai'

// Client dibuat LAZY (bukan langsung di top-level module) -- top-level
// `new GoogleGenAI(...)` dieksekusi begitu modul ini di-import, termasuk
// saat SSR (server-side render halaman yang memuat komponen ini, mis.
// /daftar). Di server, import.meta.env.VITE_GEMINI_API_KEY TIDAK tersedia
// (variabel VITE_* hanya di-inject ke bundle client), jadi constructor-nya
// throw ("An API Key must be set when running in a browser") dan menjatuhkan
// SELURUH render halaman dengan 500 -- padahal OCR ini murni client-side,
// baru benar-benar dipanggil saat pasien memfoto KTP di browser.
let ai: any = null
function getAi() {
  if (!ai) {
    const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  }
  return ai
}

const KTP_OCR_PROMPT = `Anda adalah sistem OCR untuk membaca KTP Indonesia. Ekstrak informasi dari gambar KTP ini dengan sangat teliti.

Kembalikan data dalam format JSON berikut (pastikan valid JSON):
{
  "nik": "16 digit NIK",
  "nama": "Nama lengkap",
  "tempat_lahir": "Tempat lahir",
  "tanggal_lahir": "Format: DD-MM-YYYY",
  "jenis_kelamin": "LAKI-LAKI atau PEREMPUAN",
  "alamat": "Alamat lengkap",
  "rt_rw": "RT/RW (contoh: 001/002)",
  "kel_desa": "Kelurahan/Desa",
  "kecamatan": "Kecamatan",
  "agama": "Agama",
  "status_perkawinan": "BELUM KAWIN, KAWIN, CERAI HIDUP, atau CERAI MATI",
  "pekerjaan": "Pekerjaan"
}

Penting:
1. Ekstrak field-field yang disebutkan di atas
2. Jika field tidak terlihat jelas, berikan nilai null
3. NIK harus 16 digit angka
4. Tanggal lahir dalam format DD-MM-YYYY
5. Jenis kelamin harus UPPERCASE
6. Return HANYA JSON, tanpa teks lain
7. Pastikan JSON valid dan bisa di-parse
8. JANGAN ekstrak field "kewarganegaraan" dan "berlaku_hingga"`

export interface KtpOcrResult {
  nik: string | null
  nama: string | null
  tempat_lahir: string | null
  tanggal_lahir: string | null
  jenis_kelamin: string | null
  alamat: string | null
  rt_rw: string | null
  kel_desa: string | null
  kecamatan: string | null
  agama: string | null
  status_perkawinan: string | null
  pekerjaan: string | null
}

export async function scanKtpWithGemini(base64Image: string): Promise<KtpOcrResult> {
  const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image

  const response = await getAi().models.generateContent({
    model: 'gemini-3.5-flash-lite',
    contents: [
      {
        role: 'user',
        parts: [
          { text: KTP_OCR_PROMPT },
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      topP: 0.9,
      maxOutputTokens: 500,
      candidateCount: 1,
    },
  })

  const rawText = (await response.text).trim()
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim()

  let parsed: KtpOcrResult
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('Format JSON hasil OCR tidak valid.')
  }

  if (!parsed.nik || !/^\d{16}$/.test(parsed.nik)) {
    throw new Error('NIK tidak terbaca jelas, silakan isi manual.')
  }

  return parsed
}
