<script setup lang="ts">
withDefaults(defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  maxlength?: number
  disabled?: boolean
  inputmode?: 'text' | 'numeric' | 'tel' | 'email'
}>(), {
  type: 'text',
})

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-neutral-700">{{ label }}</span>
    <input
      :value="modelValue"
      :type="type"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :inputmode="inputmode"
      class="w-full rounded-xl border-2 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400"
      :class="error ? 'border-danger focus:border-danger' : 'border-neutral-200 focus:border-primary-500'"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    >
    <span v-if="error" class="mt-1.5 block text-xs font-medium text-danger">{{ error }}</span>
    <span v-else-if="hint" class="mt-1.5 block text-xs text-neutral-400">{{ hint }}</span>
  </label>
</template>
