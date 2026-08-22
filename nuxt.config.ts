import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts'],

  css: ['~/assets/css/main.css'],

  // Tanpa ini, Nuxt otomatis mem-prefix nama komponen di subfolder
  // (components/ui/AppButton.vue -> <UiAppButton>), jadi <AppButton> dkk di
  // halaman tidak ter-resolve dan render sebagai elemen custom kosong tanpa
  // style sama sekali. pathPrefix:false membuatnya tetap terdaftar sebagai
  // <AppButton>, <AppInput>, dst.
  components: [{ path: '~/components/ui', pathPrefix: false }, '~/components'],

  vite: {
    plugins: [tailwindcss()],
    server: {
      // Vite 5+ menolak request dengan header Host yang tidak dikenal secara
      // default -- tanpa ini, akses dev server lewat tunnel.silacare....id
      // (reverse tunnel ke VPS) akan diblokir dengan "Blocked request. This
      // host is not allowed."
      allowedHosts: ['silacare.labkesdasumenep.id', 'tunnel.silacare.labkesdasumenep.id'],
    },
  },

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      title: 'SiLACARE',
      titleTemplate: '%s · SiLACARE',
      htmlAttrs: { lang: 'id' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0C79D4' },
        {
          name: 'description',
          content: 'SiLACARE — Portal Digital Pasien UPTD Laboratorium Kesehatan Daerah Kabupaten Sumenep. Lihat riwayat pemeriksaan, antre online, dan daftar Car Free Day gratis.',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.silakes.labkesdasumenep.id/api',
    },
  },
})
