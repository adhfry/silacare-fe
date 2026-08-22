<script setup lang="ts">
import { FileText, CalendarClock, ChevronRight } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// auth.profile sudah dipastikan terisi oleh middleware 'auth' (fetch /me
// kalau belum ada di store) sebelum halaman ini dirender.
const auth = useAuthStore()

const genderLabel = computed(() => (auth.profile?.patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'))
</script>

<template>
  <div class="px-5 pt-5">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-neutral-500">Halo,</p>
        <h1 class="font-heading text-xl font-bold text-neutral-900">
          {{ auth.profile?.patient.name || '...' }}
        </h1>
      </div>
      <img src="/logo/silacare-logo.png" alt="SiLACARE" class="h-10 w-10 object-contain">
    </div>

    <div class="mt-5 rounded-2xl bg-brand-gradient p-5 text-white shadow-lg shadow-primary-600/20">
      <p class="text-xs font-medium text-white/80">No. Registrasi</p>
      <p class="font-heading mt-0.5 text-lg font-bold">{{ auth.profile?.patient.no_reg || '-' }}</p>
      <div class="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p class="text-white/70">NIK</p>
          <p class="font-semibold">{{ auth.profile?.patient.nik_masked || '-' }}</p>
        </div>
        <div>
          <p class="text-white/70">Jenis Kelamin</p>
          <p class="font-semibold">{{ genderLabel }}</p>
        </div>
      </div>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-3">
      <NuxtLink
        to="/dashboard/riwayat"
        class="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60"
      >
        <div class="flex size-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <FileText class="size-4.5" />
        </div>
        <p class="text-sm font-semibold text-neutral-800">Riwayat Pemeriksaan</p>
        <p class="text-xs text-neutral-400">Lihat hasil lab Anda</p>
      </NuxtLink>
      <NuxtLink
        to="/dashboard/antrean"
        class="flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60"
      >
        <div class="flex size-9 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
          <CalendarClock class="size-4.5" />
        </div>
        <p class="text-sm font-semibold text-neutral-800">Antrean Online</p>
        <p class="text-xs text-neutral-400">Daftar & pantau antrean</p>
      </NuxtLink>
    </div>

    <NuxtLink
      to="/dashboard/antrean?booking=1"
      class="mt-4 flex items-center justify-between rounded-2xl border-2 border-dashed border-primary-200 bg-primary-50/50 p-4"
    >
      <div>
        <p class="text-sm font-semibold text-primary-700">Buat Janji Pemeriksaan</p>
        <p class="text-xs text-primary-500">Pilih layanan & tanggal kedatangan</p>
      </div>
      <ChevronRight class="size-5 text-primary-400" />
    </NuxtLink>
  </div>
</template>
