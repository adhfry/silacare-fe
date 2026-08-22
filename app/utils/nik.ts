// Parsing NIK sisi klien -- HANYA untuk UX instan (auto-isi tanggal
// lahir/gender di form), BUKAN validator otoritatif. Backend
// (App\Services\PatientPortal\NikValidationService) tetap memvalidasi ulang
// secara penuh (termasuk kode wilayah lewat data creasi/laravel-nusa, yang
// tidak tersedia di klien) -- di sini SENGAJA tidak membatasi ke provinsi
// tertentu (Jatim), karena CFD gratis & pendaftaran mandiri terbuka untuk
// NIK dari seluruh Indonesia.

export interface ParsedNik {
  valid: boolean
  tglLahir?: string // format YYYY-MM-DD
  gender?: 'L' | 'P'
  reason?: string
}

export function isLikelyRegisterNumber(value: string): boolean {
  const digits = (value || '').replace(/\D/g, '')
  // Nomor register SiLAKES persis 13 digit -- dicek pada panjang itu saja,
  // BUKAN dari digit awal (provinsi Sumatra/Kepri juga berawalan 1/2 pada
  // NIK 16 digit yang sah).
  return digits.length === 13 && (digits[0] === '1' || digits[0] === '2')
}

export function parseNik(value: string): ParsedNik {
  const digits = (value || '').replace(/\D/g, '')

  if (isLikelyRegisterNumber(digits)) {
    return { valid: false, reason: 'Terdeteksi sebagai nomor register, bukan NIK' }
  }

  if (digits.length !== 16) {
    return { valid: false, reason: 'NIK harus 16 digit' }
  }

  let day = parseInt(digits.slice(6, 8), 10)
  const month = parseInt(digits.slice(8, 10), 10)
  const twoDigitYear = parseInt(digits.slice(10, 12), 10)

  let gender: 'L' | 'P' = 'L'
  if (day > 40) {
    gender = 'P'
    day -= 40
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return { valid: false, reason: 'Tanggal lahir hasil parsing NIK tidak masuk akal' }
  }

  const currentTwoDigitYear = new Date().getFullYear() % 100
  const century = twoDigitYear <= currentTwoDigitYear ? 2000 : 1900
  const fullYear = century + twoDigitYear

  const pad = (n: number) => String(n).padStart(2, '0')
  const tglLahir = `${fullYear}-${pad(month)}-${pad(day)}`

  const dateObj = new Date(`${tglLahir}T00:00:00`)
  if (dateObj.getFullYear() !== fullYear || dateObj.getMonth() + 1 !== month || dateObj.getDate() !== day) {
    return { valid: false, reason: 'Tanggal lahir hasil parsing NIK tidak valid' }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  if (tglLahir > todayStr || fullYear < new Date().getFullYear() - 120) {
    return { valid: false, reason: 'Tanggal lahir hasil parsing NIK tidak masuk akal' }
  }

  return { valid: true, tglLahir, gender }
}
