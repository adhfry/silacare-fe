<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const showBack = computed(() => route.path !== '/' && route.meta.hideBack !== true)
</script>

<template>
  <div class="relative min-h-dvh overflow-hidden bg-neutral-50 flex flex-col">
    <WaveOrnament position="top" />

    <header v-if="showBack" class="relative z-10 flex items-center px-4 pt-[calc(2.5rem+env(safe-area-inset-top))]">
      <button
        class="flex size-9 items-center justify-center rounded-full bg-white/80 text-neutral-600 shadow-sm backdrop-blur active:scale-95"
        aria-label="Kembali"
        @click="router.back()"
      >
        <ChevronLeft class="size-5" />
      </button>
    </header>

    <div class="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto px-5" :class="showBack ? '' : 'safe-top'">
      <slot />
    </div>
  </div>
</template>
