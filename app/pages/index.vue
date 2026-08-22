<script setup lang="ts">
import { FileText, CalendarClock, HeartPulse, ArrowRight, UserPlus } from 'lucide-vue-next'

definePageMeta({ layout: 'guest' })

const features = [
  { icon: FileText, text: 'Lihat riwayat & hasil pemeriksaan lab kapan saja' },
  { icon: CalendarClock, text: 'Antre online, bayar tunai langsung di lokasi' },
  { icon: HeartPulse, text: 'Pemeriksaan Gratis di Car Free Day, tanpa perlu login' },
]
</script>

<template>
  <div class="flex flex-1 flex-col justify-between py-8">
    <div>
      <div class="relative flex flex-col items-center pt-6 text-center animate-rise">
        <DotGrid class="pointer-events-none absolute -left-4 -top-2 text-primary-300" />
        <DotGrid class="pointer-events-none absolute -right-4 top-10 text-secondary-300" />
        <img src="/logo/silacare-logo.png" alt="SiLACARE" class="relative h-28 w-28 object-contain">
        <h1 class="font-heading relative mt-4 text-2xl font-bold text-neutral-900">SiLACARE</h1>
        <p class="relative mt-1.5 max-w-xs text-sm text-neutral-500">
          Portal digital pasien UPTD Laboratorium Kesehatan Daerah Kabupaten Sumenep
        </p>
      </div>

      <div class="mt-10 space-y-3">
        <div
          v-for="(f, i) in features"
          :key="f.text"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60 animate-rise"
          :style="{ animationDelay: `${0.08 * (i + 1)}s` }"
        >
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <component :is="f.icon" class="size-5" />
          </div>
          <p class="text-sm font-medium text-neutral-700">{{ f.text }}</p>
        </div>
      </div>
    </div>

    <div class="mt-10 space-y-3 animate-rise" style="animation-delay: 0.3s">
      <!-- CTA utama: kebanyakan pengunjung belum pernah terdaftar di Labkesda,
           jadi "Daftar" ditonjolkan sebagai aksi pertama, bukan "Masuk". -->
      <NuxtLink to="/daftar" class="block">
        <AppButton class="w-full">
          <UserPlus class="size-4.5" /> Daftar Akun SiLACARE
        </AppButton>
      </NuxtLink>
      <NuxtLink to="/cfd" class="block">
        <AppButton variant="secondary" class="w-full">
          Daftar Pemeriksaan Gratis CFD
          <ArrowRight class="size-4" />
        </AppButton>
      </NuxtLink>
      <NuxtLink to="/login" class="block text-center text-sm font-medium text-neutral-500 py-2">
        Sudah punya akun? <span class="text-primary-600">Masuk</span>
      </NuxtLink>
    </div>
  </div>
</template>
