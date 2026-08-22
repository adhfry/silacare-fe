<script setup lang="ts">
import { LogOut, X } from 'lucide-vue-next'

defineProps<{ modelValue: boolean; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [] }>()

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5">
        <div class="mb-1 flex items-center justify-between">
          <h3 class="font-heading flex items-center gap-1.5 text-base font-bold text-neutral-900">
            <LogOut class="size-4.5 text-red-600" /> Keluar dari Akun?
          </h3>
          <button type="button" class="text-neutral-400" aria-label="Tutup" @click="close"><X class="size-5" /></button>
        </div>
        <p class="mt-2 text-sm text-neutral-500">
          Anda akan keluar dari akun SiLACARE ini. Untuk masuk kembali, Anda perlu memasukkan
          nomor HP dan kata sandi Anda.
        </p>

        <div class="mt-5 flex gap-3">
          <button
            type="button"
            class="flex-1 rounded-xl border-2 border-neutral-200 py-3 text-sm font-semibold text-neutral-600"
            @click="close"
          >
            Batal
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? 'Memproses...' : 'Ya, Keluar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
