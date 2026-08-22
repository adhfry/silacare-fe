<script setup lang="ts">
import { FileText, CalendarClock, ChevronRight, HeartPulse, MapPin, CheckCircle2, Clock } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

// auth.profile sudah dipastikan terisi oleh middleware 'auth' (fetch /me
// kalau belum ada di store) sebelum halaman ini dirender.
const auth = useAuthStore()
const api = useApi()

const genderLabel = computed(() => (auth.profile?.patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'))

interface CategoryStatus {
  tersedia: boolean
  tanggal_terakhir: string | null
  tanggal_boleh_lagi: string | null
}
interface CfdStatus {
  jadwal: { hari: string; jam: string; lokasi: string }
  kelayakan: {
    is_layak: boolean
    kuota: { sisa: number; penuh: boolean }
    kategori: { asam_urat: CategoryStatus; cholesterol: CategoryStatus }
  }
  riwayat_terakhir: { tanggal: string; kategori: string[] } | null
}

const cfdStatus = ref<CfdStatus | null>(null)
onMounted(async () => {
  try {
    cfdStatus.value = await api.get<CfdStatus>('/patient-portal/cfd-status')
  } catch {
    // Kartu CFD bersifat informatif, bukan alur inti dashboard -- gagal ambil
    // status cukup disembunyikan (kartu tidak dirender), jangan mengganggu
    // sisa dashboard dengan pesan error.
  }
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const kategoriLabel: Record<string, string> = { asam_urat: 'Asam Urat', cholesterol: 'Kolesterol' }
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
      <AppLogo />
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

    <!-- Info & status CFD gratis -->
    <div v-if="cfdStatus" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
      <div class="flex items-center gap-3 bg-secondary-50 p-4">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-secondary-600">
          <HeartPulse class="size-4.5" />
        </div>
        <div>
          <p class="text-sm font-semibold text-secondary-800">Car Free Day Gratis</p>
          <p class="flex items-center gap-1 text-xs text-secondary-600">
            <MapPin class="size-3" /> Setiap {{ cfdStatus.jadwal.hari }}, {{ cfdStatus.jadwal.jam }} — {{ cfdStatus.jadwal.lokasi }}
          </p>
        </div>
      </div>

      <div class="space-y-2.5 p-4">
        <div v-for="key in ['asam_urat', 'cholesterol'] as const" :key="key" class="flex items-start gap-2 text-sm">
          <CheckCircle2 v-if="cfdStatus.kelayakan.kategori[key].tersedia" class="size-4.5 shrink-0 text-secondary-600" />
          <Clock v-else class="size-4.5 shrink-0 text-neutral-400" />
          <p class="text-neutral-600">
            <span class="font-medium text-neutral-800">{{ kategoriLabel[key] }}:</span>
            <span v-if="cfdStatus.kelayakan.kategori[key].tersedia"> bisa diperiksa sekarang</span>
            <span v-else> boleh diperiksa lagi mulai {{ formatDate(cfdStatus.kelayakan.kategori[key].tanggal_boleh_lagi!) }}</span>
          </p>
        </div>

        <p v-if="cfdStatus.kelayakan.kuota.penuh" class="text-xs text-neutral-400">
          Kuota hari ini sudah penuh, coba lagi di kesempatan berikutnya.
        </p>

        <div v-if="cfdStatus.riwayat_terakhir" class="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
          Pemeriksaan CFD terakhir Anda: {{ formatDate(cfdStatus.riwayat_terakhir.tanggal) }}
          <span v-if="cfdStatus.riwayat_terakhir.kategori.length">
            ({{ cfdStatus.riwayat_terakhir.kategori.map((k) => kategoriLabel[k]).join(', ') }})
          </span>
        </div>

        <NuxtLink to="/cfd" class="mt-1 block w-full rounded-xl bg-secondary-600 py-2.5 text-center text-sm font-semibold text-white active:scale-[0.98]">
          Daftar CFD
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
