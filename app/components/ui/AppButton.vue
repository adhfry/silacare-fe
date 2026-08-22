<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), {
  variant: 'primary',
  loading: false,
  disabled: false,
  type: 'button',
})
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
    :class="{
      'bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700': variant === 'primary',
      'bg-secondary-500 text-white shadow-lg shadow-secondary-500/25 hover:bg-secondary-600': variant === 'secondary',
      'border-2 border-neutral-200 text-neutral-700 hover:bg-neutral-100': variant === 'outline',
      'text-primary-600 hover:bg-primary-50': variant === 'ghost',
    }"
  >
    <Loader2 v-if="loading" class="size-4 animate-spin" />
    <slot />
  </button>
</template>
