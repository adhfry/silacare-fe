<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

withDefaults(defineProps<{ title: string; back?: boolean }>(), { back: true })
const router = useRouter()
</script>

<template>
  <header class="sticky top-0 z-30 flex items-center gap-3 bg-neutral-50/90 px-4 py-4 backdrop-blur">
    <button
      v-if="back"
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-neutral-600 shadow-sm active:scale-95"
      aria-label="Kembali"
      @click="router.back()"
    >
      <ChevronLeft class="size-5" />
    </button>
    <h1 class="font-heading text-lg font-semibold text-neutral-900">{{ title }}</h1>
  </header>
</template>
