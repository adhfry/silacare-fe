<script setup lang="ts">
withDefaults(defineProps<{ rounded?: string }>(), { rounded: 'rounded-lg' })
</script>

<template>
  <div class="animate-pulse bg-neutral-200/80" :class="rounded" />
</template>
