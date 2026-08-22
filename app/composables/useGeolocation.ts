/**
 * Ambil koordinat GPS browser sekali pakai (bukan watch terus-menerus) --
 * dipakai untuk verifikasi lokasi pendaftaran CFD (wajib dalam radius 400m
 * dari lokasi acara, dicek ulang di backend, ini murni supaya pesan error
 * di FE lebih cepat/jelas daripada nunggu balasan API kalau GPS device
 * sendiri saja sudah menolak/tidak tersedia).
 */
export interface GeoResult {
  latitude: number
  longitude: number
}

export function useGeolocation() {
  function getCurrentPosition(): Promise<GeoResult> {
    return new Promise((resolve, reject) => {
      if (!import.meta.client || !navigator.geolocation) {
        reject(new Error('Perangkat Anda tidak mendukung deteksi lokasi'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => {
          const messages: Record<number, string> = {
            1: 'Akses lokasi ditolak. Aktifkan izin lokasi untuk mendaftar CFD.',
            2: 'Lokasi tidak dapat dideteksi. Pastikan GPS aktif.',
            3: 'Deteksi lokasi memakan waktu terlalu lama, silakan coba lagi.',
          }
          reject(new Error(messages[err.code] || 'Gagal mendeteksi lokasi Anda'))
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })
  }

  return { getCurrentPosition }
}
