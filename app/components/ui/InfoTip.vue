<script setup lang="ts">
import { Info } from 'lucide-vue-next'

defineProps<{ text: string }>()

// Komponen <Tippy>, BUKAN directive v-tippy -- directive kustom butuh
// getSSRProps untuk aman di-render server-side (Nuxt SSR), sedangkan
// vue-tippy tidak menyediakannya, jadi v-tippy crash saat SSR. Komponen biasa
// tidak punya masalah itu, perilakunya sama persis (hover ATAU klik, penting
// untuk mobile/touch yang tidak punya hover sama sekali).
</script>

<template>
  <!-- Komponen didaftarkan sebagai "tippy" (huruf kecil) oleh plugin, BUKAN
       "Tippy" -- lihat plugins/tippy.ts (app.component('tippy', ...)). -->
  <tippy :content="text" trigger="mouseenter click" theme="light">
    <button
      type="button"
      class="inline-flex size-4 shrink-0 items-center justify-center align-text-bottom text-neutral-400"
      aria-label="Info"
      @click.prevent
    >
      <Info class="size-3.5" />
    </button>
  </tippy>
</template>
