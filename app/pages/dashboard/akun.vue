<script setup lang="ts">
import { LogOut, MapPin, Phone, Fingerprint } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div>
    <PageHeader title="Akun Saya" :back="false" />

    <div class="px-5 pb-8">
      <div class="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm shadow-neutral-200/60">
        <div class="flex size-16 items-center justify-center rounded-full bg-primary-50 text-2xl font-bold text-primary-600">
          {{ auth.profile?.patient.name?.charAt(0) || '?' }}
        </div>
        <h2 class="font-heading mt-3 text-lg font-bold text-neutral-900">{{ auth.profile?.patient.name }}</h2>
        <p class="text-sm text-neutral-400">{{ auth.profile?.patient.no_reg }}</p>
      </div>

      <div class="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
        <div class="flex items-center gap-3 p-4">
          <Fingerprint class="size-4.5 text-neutral-400" />
          <div>
            <p class="text-xs text-neutral-400">NIK</p>
            <p class="text-sm font-medium text-neutral-700">{{ auth.profile?.patient.nik_masked }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4">
          <Phone class="size-4.5 text-neutral-400" />
          <div>
            <p class="text-xs text-neutral-400">Nomor HP</p>
            <p class="text-sm font-medium text-neutral-700">{{ auth.profile?.phone }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3 p-4">
          <MapPin class="size-4.5 text-neutral-400" />
          <div>
            <p class="text-xs text-neutral-400">Alamat</p>
            <p class="text-sm font-medium text-neutral-700">{{ auth.profile?.patient.alamat || '-' }}</p>
          </div>
        </div>
      </div>

      <button
        class="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 py-3.5 text-[15px] font-semibold text-red-600"
        @click="logout"
      >
        <LogOut class="size-4.5" /> Keluar
      </button>
    </div>
  </div>
</template>
