/**
 * Simpan progres alur multi-langkah (aktivasi/daftar) ke localStorage supaya
 * tahan refresh, skenario nyata: user isi NIK+HP, buka WhatsApp untuk lihat
 * kode OTP, balik ke tab/app ini (kadang ke-refresh oleh OS/browser), progres
 * TIDAK BOLEH hilang. Di-key per nama alur, bukan per device-id (localStorage
 * SUDAH per-browser/per-device secara alami, tidak perlu fingerprinting).
 *
 * SENGAJA TIDAK menyimpan foto KTP (base64 bisa besar, berisiko kena limit
 * localStorage ~5-10MB), kalau refresh terjadi tepat di langkah foto/form
 * pasien baru, user diminta foto ulang saja, bukan seluruh NIK/HP dari awal.
 */
export function usePersistedFlow<T extends Record<string, any>>(key: string, initial: T) {
  const storageKey = `silacare_flow_${key}`
  const state = reactive({ ...initial }) as T

  if (import.meta.client) {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) Object.assign(state, JSON.parse(saved))
    } catch {
      // Data korup/lama, abaikan, mulai dari initial.
    }

    watch(
      () => ({ ...state }),
      (val) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(val))
        } catch {
          // localStorage penuh/nonaktif (mode privat), progres cukup hilang
          // saat refresh, tidak perlu menghentikan alur.
        }
      },
      { deep: true },
    )
  }

  function clear() {
    Object.assign(state, initial)
    if (import.meta.client) {
      try {
        localStorage.removeItem(storageKey)
      } catch {
        // no-op
      }
    }
  }

  return { state, clear }
}
