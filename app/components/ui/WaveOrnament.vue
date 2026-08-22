<script setup lang="ts">
withDefaults(defineProps<{ position?: 'top' | 'bottom'; flip?: boolean }>(), {
  position: 'top',
  flip: false,
})
</script>

<template>
  <div
    class="pointer-events-none absolute inset-x-0 overflow-hidden leading-[0]"
    :class="position === 'top' ? 'top-0' : 'bottom-0 rotate-180'"
  >
    <svg
      viewBox="0 0 1440 220" preserveAspectRatio="none"
      class="h-28 w-full sm:h-36" :class="flip ? '-scale-x-100' : ''"
    >
      <defs>
        <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="var(--color-primary-600)" />
          <stop offset="55%" stop-color="var(--color-accent-500)" />
          <stop offset="100%" stop-color="var(--color-secondary-500)" />
        </linearGradient>
      </defs>
      <path
        fill="url(#wave-grad)" fill-opacity="0.16"
        d="M0,96 C240,160 480,20 720,64 C960,108 1200,180 1440,110 L1440,0 L0,0 Z"
      />
      <path
        fill="url(#wave-grad)" fill-opacity="0.28"
        d="M0,140 C260,90 500,190 740,130 C980,70 1220,150 1440,100 L1440,0 L0,0 Z"
      />
    </svg>
  </div>
</template>
