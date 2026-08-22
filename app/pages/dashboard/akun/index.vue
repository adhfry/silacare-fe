<script setup lang="ts">
import { LogOut, MapPin, Phone, Fingerprint, Eye, EyeOff, UserPen, ChevronRight } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const auth = useAuthStore()
const router = useRouter()

const nikVisible = ref(false)
const displayedNik = computed(() => {
  if (nikVisible.value) return auth.profile?.patient.nik || '-'
  return auth.profile?.patient.nik_masked || '-'
})

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
        <div class="flex items-center justify-between gap-3 p-4">
          <div class="flex items-center gap-3">
            <Fingerprint class="size-4.5 text-neutral-400" />
            <div>
              <p class="text-xs text-neutral-400">NIK</p>
              <p class="text-sm font-medium text-neutral-700">{{ displayedNik }}</p>
            </div>
          </div>
          <button
            type="button" class="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 active:bg-neutral-100"
            :aria-label="nikVisible ? 'Sembunyikan NIK' : 'Tampilkan NIK'"
            @click="nikVisible = !nikVisible"
          >
            <EyeOff v-if="nikVisible" class="size-4.5" />
            <Eye v-else class="size-4.5" />
          </button>
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

      <div v-if="auth.profile?.completeness" class="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium text-neutral-700">Kelengkapan Data</span>
          <span class="font-semibold text-primary-600">{{ auth.profile.completeness.percent }}%</span>
        </div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
          <div
            class="h-full rounded-full bg-primary-500 transition-all"
            :style="{ width: `${auth.profile.completeness.percent}%` }"
          />
        </div>
      </div>

      <NuxtLink
        to="/dashboard/akun/update-data"
        class="mt-4 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60"
      >
        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <UserPen class="size-4.5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-neutral-800">Update Informasi Pasien</p>
          <p class="text-xs text-neutral-400">Ajukan koreksi/pelengkapan data diri</p>
        </div>
        <ChevronRight class="size-4 shrink-0 text-neutral-300" />
      </NuxtLink>

      <button
        class="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-100 py-3.5 text-[15px] font-semibold text-red-600"
        @click="logout"
      >
        <LogOut class="size-4.5" /> Keluar
      </button>
    </div>
  </div>
</template>
