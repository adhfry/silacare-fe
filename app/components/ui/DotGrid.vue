<script setup lang="ts">
const dots = Array.from({ length: 36 }, (_, i) => ({
  cx: 10 + (i % 6) * 20,
  cy: 10 + Math.floor(i / 6) * 20,
}))
</script>

<template>
  <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
    <circle v-for="(d, i) in dots" :key="i" :cx="d.cx" :cy="d.cy" r="2.5" fill="currentColor" fill-opacity="0.35" />
  </svg>
</template>
