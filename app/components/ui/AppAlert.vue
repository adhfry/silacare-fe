<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Info } from 'lucide-vue-next'

withDefaults(defineProps<{ variant?: 'error' | 'success' | 'info' }>(), { variant: 'error' })
</script>

<template>
  <div
    class="flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium"
    :class="{
      'bg-red-50 text-red-700': variant === 'error',
      'bg-secondary-50 text-secondary-700': variant === 'success',
      'bg-primary-50 text-primary-700': variant === 'info',
    }"
  >
    <AlertTriangle v-if="variant === 'error'" class="size-4.5 mt-0.5 shrink-0" />
    <CheckCircle2 v-else-if="variant === 'success'" class="size-4.5 mt-0.5 shrink-0" />
    <Info v-else class="size-4.5 mt-0.5 shrink-0" />
    <div><slot /></div>
  </div>
</template>
