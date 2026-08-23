/**
 * SEO ringkas untuk halaman PUBLIK saja (landing, CFD, daftar, login, dst) --
 * set title/description spesifik + canonical URL. Halaman dashboard SENGAJA
 * tidak memakai ini (lihat noindex global di layouts/dashboard.vue, data
 * pribadi pasien tidak boleh ter-index).
 */
export function usePageSeo(options: { title: string; description: string }) {
  const config = useRuntimeConfig()
  const route = useRoute()

  // ogUrl & ogImage SENGAJA diulang eksplisit (bukan cuma andalkan default
  // global di nuxt.config.ts) -- ogUrl beda per halaman (URL yang dibagikan),
  // ogImage tetap harus ABSOLUT (https://...) supaya preview WhatsApp/
  // Facebook muncul, lihat catatan di nuxt.config.ts.
  useSeoMeta({
    title: options.title,
    description: options.description,
    ogUrl: `${config.public.siteUrl}${route.path}`,
    ogTitle: `${options.title} · SiLACARE`,
    ogDescription: options.description,
    ogImage: `${config.public.siteUrl}/og-image.png`,
    twitterTitle: `${options.title} · SiLACARE`,
    twitterDescription: options.description,
    twitterImage: `${config.public.siteUrl}/og-image.png`,
  })

  useHead({
    link: [{ rel: 'canonical', href: `${config.public.siteUrl}${route.path}` }],
  })
}
