/**
 * SEO ringkas untuk halaman PUBLIK saja (landing, CFD, daftar, login, dst) --
 * set title/description spesifik + canonical URL. Halaman dashboard SENGAJA
 * tidak memakai ini (lihat noindex global di layouts/dashboard.vue, data
 * pribadi pasien tidak boleh ter-index).
 */
export function usePageSeo(options: { title: string; description: string }) {
  const config = useRuntimeConfig()
  const route = useRoute()

  useSeoMeta({
    title: options.title,
    description: options.description,
    ogTitle: `${options.title} · SiLACARE`,
    ogDescription: options.description,
    twitterTitle: `${options.title} · SiLACARE`,
    twitterDescription: options.description,
  })

  useHead({
    link: [{ rel: 'canonical', href: `${config.public.siteUrl}${route.path}` }],
  })
}
