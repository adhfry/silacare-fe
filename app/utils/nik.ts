// Port dari FE_SiLAKES src/utils/nik.ts -- SENGAJA disamakan persis (termasuk
// hard-check awalan provinsi "3"/Jawa Timur) supaya validasi NIK di SiLACARE
// konsisten dengan SiLAKES. Backend (App\Services\PatientPortal\NikValidationService)
// adalah port PHP dari logika yang sama -- tetap divalidasi ulang di server,
// ini hanya untuk UX instan (auto-isi tanggal lahir/gender) di form.

export interface ParsedNik {
  valid: boolean
  tglLahir?: string // format YYYY-MM-DD
  gender?: 'L' | 'P'
  reason?: string
}

export function isLikelyRegisterNumber(value: string): boolean {
  const digits = (value || '').replace(/\D/g, '')
  return digits.length > 0 && (digits[0] === '1' || digits[0] === '2')
}

export function parseNik(value: string): ParsedNik {
  const digits = (value || '').replace(/\D/g, '')

  if (digits.length !== 16) {
    return { valid: false, reason: 'NIK harus 16 digit' }
  }

  if (isLikelyRegisterNumber(digits)) {
    return { valid: false, reason: 'Terdeteksi sebagai nomor register, bukan NIK' }
  }

  if (digits[0] !== '3') {
    return { valid: false, reason: 'Awalan kode wilayah NIK tidak dikenali (bukan awalan 3/Jawa Timur)' }
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

  return { valid: true, tglLahir, gender }
}
