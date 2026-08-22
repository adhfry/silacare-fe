export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return

  const auth = useAuthStore()
  if (!auth.token) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }

  // Pinia state tidak ikut ter-restore dari localStorage saat hard refresh/
  // navigasi langsung ke halaman selain dashboard/index.vue (yang sebelumnya
  // satu-satunya tempat fetch profil) -- ambil ulang di sini kalau kosong,
  // supaya SEMUA halaman dashboard (akun, riwayat, antrean, dst) selalu
  // punya auth.profile siap pakai.
  if (!auth.profile) {
    try {
      const api = useApi()
      const profile = await api.get('/patient-portal/me')
      auth.setProfile(profile)
    } catch {
      auth.logout()
      return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
    }
  }
})
