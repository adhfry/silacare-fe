<script setup lang="ts">
import { Eye, EyeOff } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  modelValue: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  maxlength?: number
  disabled?: boolean
  inputmode?: 'text' | 'numeric' | 'tel' | 'email'
  required?: boolean
  // Tombol mata show/hide -- cuma relevan untuk type="password", dipakai
  // login/daftar/lupa-password supaya pengguna bisa cek ulang ketikannya
  // sebelum submit (form password tanpa preview rawan salah ketik di HP).
  showToggle?: boolean
}>(), {
  type: 'text',
})

defineEmits<{ 'update:modelValue': [value: string] }>()

const passwordVisible = ref(false)
const effectiveType = computed(() => {
  if (props.type !== 'password' || !props.showToggle) return props.type
  return passwordVisible.value ? 'text' : 'password'
})
</script>

<template>
  <label class="block">
    <span v-if="label" class="mb-1.5 block text-sm font-medium text-neutral-700">
      {{ label }}<span v-if="required" class="text-danger"> *</span>
    </span>
    <div class="relative">
      <input
        :value="modelValue"
        :type="effectiveType"
        :placeholder="placeholder"
        :maxlength="maxlength"
        :disabled="disabled"
        :inputmode="inputmode"
        class="w-full rounded-xl border-2 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:text-neutral-400"
        :class="[error ? 'border-danger focus:border-danger' : 'border-neutral-200 focus:border-primary-500', type === 'password' && showToggle ? 'pr-11' : '']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      >
      <button
        v-if="type === 'password' && showToggle"
        type="button"
        class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-neutral-400"
        :aria-label="passwordVisible ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
        @click="passwordVisible = !passwordVisible"
      >
        <EyeOff v-if="passwordVisible" class="size-4.5" />
        <Eye v-else class="size-4.5" />
      </button>
    </div>
    <span v-if="error" class="mt-1.5 block text-xs font-medium text-danger">{{ error }}</span>
    <span v-else-if="hint" class="mt-1.5 block text-xs text-neutral-400">{{ hint }}</span>
  </label>
</template>
