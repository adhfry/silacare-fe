/**
 * Kebalikan dari middleware auth.ts, halaman "pintu masuk" (landing, login,
 * daftar, lupa password) TIDAK boleh dilihat pasien yang sudah login,
 * langsung dialihkan ke dashboard. Kalau ingin ganti akun, pasien harus
 * logout dulu (auth.logout() menghapus token, baru middleware ini lewat).
 *
 * SENGAJA tidak diterapkan ke /cfd & /cfd/daftar-baru, keduanya memang
 * dipakai baik oleh pasien yang sudah login maupun yang belum (lihat alur
 * konfirmasi ringkas untuk pasien yang sudah login di /cfd).
 */
export default defineNuxtRouteMiddleware(() => {
  if (import.meta.server) return

  const auth = useAuthStore()
  if (auth.token) {
    return navigateTo('/dashboard')
  }
})
