import VueTippy from 'vue-tippy'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/themes/light.css'

// Dipakai lewat komponen <tippy> (huruf kecil -- nama registrasi bawaan
// plugin ini, lihat app.component() di dalam paketnya), BUKAN directive
// v-tippy -- directive kustom butuh getSSRProps supaya aman di Nuxt SSR,
// vue-tippy tidak menyediakannya sehingga v-tippy crash saat SSR. Dipakai
// untuk ikon info di samping label field yang butuh penjelasan (mis. FKTP),
// trigger hover (desktop) atau klik (mobile/touch, tidak ada hover).
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueTippy, {
    defaultProps: {
      theme: 'light',
      trigger: 'mouseenter click',
      arrow: true,
      maxWidth: 260,
    },
  })
})
