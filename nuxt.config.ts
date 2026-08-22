import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@pinia/nuxt', '@vueuse/nuxt', '@nuxt/fonts', '@vite-pwa/nuxt'],

  // Aplikasi bisa di-install (Add to Home Screen) di HP pasien -- ikon &
  // manifest digenerate dari public/pwa/*.png (lihat public/logo/silacare-logo.png
  // sebagai sumber). registerType 'autoUpdate' supaya versi baru otomatis
  // terpasang tanpa pasien perlu uninstall-install manual.
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'SiLACARE — Portal Pasien Labkesda Sumenep',
      short_name: 'SiLACARE',
      description: 'Portal digital pasien UPTD Laboratorium Kesehatan Daerah Kabupaten Sumenep. Lihat riwayat pemeriksaan, antre online, dan daftar Car Free Day gratis.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#0C79D4',
      background_color: '#F8FAFC',
      icons: [
        { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/pwa/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Halaman dashboard berisi data pribadi pasien -- JANGAN pernah
      // disimpan ke cache offline service worker.
      navigateFallbackDenylist: [/^\/dashboard/],
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
    },
    client: {
      installPrompt: true,
    },
  },

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
        // Open Graph & Twitter Card default -- dioverride per halaman lewat
        // useSeoMeta() kalau perlu judul/deskripsi yang lebih spesifik.
        { property: 'og:site_name', content: 'SiLACARE' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'id_ID' },
        { property: 'og:title', content: 'SiLACARE — Portal Pasien Labkesda Sumenep' },
        {
          property: 'og:description',
          content: 'Portal digital pasien UPTD Laboratorium Kesehatan Daerah Kabupaten Sumenep. Lihat riwayat pemeriksaan, antre online, dan daftar Car Free Day gratis.',
        },
        { property: 'og:image', content: '/og-image.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SiLACARE — Portal Pasien Labkesda Sumenep' },
        {
          name: 'twitter:description',
          content: 'Portal digital pasien UPTD Laboratorium Kesehatan Daerah Kabupaten Sumenep. Lihat riwayat pemeriksaan, antre online, dan daftar Car Free Day gratis.',
        },
        { name: 'twitter:image', content: '/og-image.png' },
      ],
      link: [
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/pwa/icon-180.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/pwa/icon-192.png' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'https://api.silakes.labkesdasumenep.id/api',
      // Dipakai untuk canonical URL & og:url absolut -- ganti lewat env
      // NUXT_PUBLIC_SITE_URL begitu domain produksi SiLACARE sudah aktif.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://silacare.labkesdasumenep.id',
    },
  },
})
