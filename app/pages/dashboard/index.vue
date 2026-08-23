<script setup lang="ts">
import { FileText, CalendarClock, ChevronRight, HeartPulse, MapPin, CheckCircle2, Clock, BadgeCheck, CircleHelp } from 'lucide-vue-next'

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
  alasan: 'sudah_cfd_hari_ini' | 'interval_28_hari' | null
}
interface CfdStatus {
  jadwal: { hari: string; jam: string; lokasi: string }
  kelayakan: {
    is_layak: boolean
    kuota: { sisa: number; penuh: boolean }
    kategori: { asam_urat: CategoryStatus; cholesterol: CategoryStatus }
    sudah_cfd_hari_ini: boolean
  }
  riwayat_terakhir: { tanggal: string; kategori: string[] } | null
}

const cfdStatus = ref<CfdStatus | null>(null)
const cfdLoading = ref(true)
onMounted(async () => {
  try {
    cfdStatus.value = await api.get<CfdStatus>('/patient-portal/cfd-status')
  } catch {
    // Kartu CFD bersifat informatif, bukan alur inti dashboard, gagal ambil
    // status cukup disembunyikan (kartu tidak dirender), jangan mengganggu
    // sisa dashboard dengan pesan error.
  } finally {
    cfdLoading.value = false
  }
})

const completenessTooltip = computed(() => {
  const percent = auth.profile?.completeness?.percent
  if (percent === undefined) return ''
  return percent >= 100
    ? 'Data diri Anda sudah lengkap.'
    : `Data diri Anda baru ${percent}% lengkap. Lengkapi di halaman Akun agar petugas dapat melayani Anda lebih cepat dan akurat.`
})

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// CFD cuma berlangsung hari Minggu, "tersedia" dari backend cuma berarti
// jeda 28 hari sudah lewat, BUKAN berarti bisa periksa hari ini juga kalau
// hari ini bukan Minggu. Baris ini cari tanggal Minggu berikutnya (atau hari
// ini kalau kebetulan hari ini Minggu) dari sebuah tanggal acuan.
function nextSunday(from: Date): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Minggu
  if (day !== 0) d.setDate(d.getDate() + (7 - day))
  return d
}

function formatMinggu(date: Date) {
  return `Minggu, ${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
}

// Prefix teks status kategori, BUKAN dipisah dari tanggalnya, supaya
// tanggal pada kasus limit 28 hari ASLI (alasan 'interval_28_hari') bisa
// ditebalkan + digarisbawahi secara terpisah dari kasus "sudah CFD hari ini"
// (yang teksnya beda & tanggalnya cukup semibold saja, bukan underline --
// itu bukan "kena limit", cuma jatah hari ini sudah dipakai).
function eligibilityPrefix(cat: CategoryStatus): string {
  if (cat.tersedia) {
    return new Date().getDay() === 0 ? 'bisa diperiksa sekarang' : 'Bisa Periksa'
  }
  return cat.alasan === 'sudah_cfd_hari_ini' ? 'Sudah periksa hari ini, boleh lagi' : 'Boleh Periksa Lagi Mulai'
}

function eligibilityDateText(cat: CategoryStatus): string {
  if (cat.tersedia) {
    return new Date().getDay() === 0 ? '' : formatMinggu(nextSunday(new Date()))
  }
  return formatMinggu(nextSunday(new Date(cat.tanggal_boleh_lagi!)))
}

// Limit 28 hari asli ditonjolkan (bold + underline) supaya beda kentara dari
// sekadar "kembali minggu depan karena jatah hari ini sudah dipakai".
function eligibilityDateClass(cat: CategoryStatus): string {
  if (cat.tersedia) return ''
  return cat.alasan === 'interval_28_hari' ? 'font-bold underline' : 'font-semibold'
}

const kategoriLabel: Record<string, string> = { asam_urat: 'Asam Urat', cholesterol: 'Kolesterol' }
</script>

<template>
  <div class="px-5 pt-5">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm text-neutral-500">Halo,</p>
        <h1 class="font-heading flex items-center gap-1.5 text-xl font-bold text-neutral-900">
          {{ auth.profile?.patient.name || '...' }}
          <tippy v-if="auth.profile?.completeness" :content="completenessTooltip" trigger="mouseenter click" theme="light">
            <BadgeCheck v-if="auth.profile.completeness.percent >= 100" class="size-5 shrink-0 text-primary-600" />
            <CircleHelp v-else class="size-5 shrink-0 text-amber-500" />
          </tippy>
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

    <!-- Info & status pemeriksaan gratis di CFD -->
    <div v-if="cfdLoading" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
      <div class="flex items-center gap-3 bg-neutral-50 p-4">
        <SkeletonBlock rounded="rounded-xl" class="size-9 shrink-0" />
        <div class="flex-1 space-y-2">
          <SkeletonBlock class="h-4 w-48" />
          <SkeletonBlock class="h-3 w-36" />
        </div>
      </div>
      <div class="space-y-2.5 p-4">
        <SkeletonBlock class="h-4 w-full" />
        <SkeletonBlock class="h-4 w-5/6" />
        <SkeletonBlock rounded="rounded-xl" class="mt-1 h-10 w-full" />
      </div>
    </div>

    <div v-else-if="cfdStatus" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
      <div class="flex items-center gap-3 bg-secondary-50 p-4">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-secondary-600">
          <HeartPulse class="size-4.5" />
        </div>
        <div>
          <p class="text-sm font-semibold text-secondary-800">Pemeriksaan Gratis di Car Free Day</p>
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
            <span class="font-bold text-neutral-800">{{ kategoriLabel[key] }}:</span>
            {{ eligibilityPrefix(cfdStatus.kelayakan.kategori[key]) }}
            <span :class="eligibilityDateClass(cfdStatus.kelayakan.kategori[key])">{{ eligibilityDateText(cfdStatus.kelayakan.kategori[key]) }}</span>
          </p>
        </div>

        <p class="flex items-start gap-1.5 text-xs text-neutral-400">
          <span>Setiap kunjungan CFD otomatis termasuk cek GDA/GDP & tensi. Anda cuma perlu pilih Asam Urat atau Kolesterol.</span>
          <tippy content="GDA/GDP (gula darah) dan tensi (tekanan darah) selalu ikut diperiksa gratis setiap kunjungan CFD, tanpa perlu dipilih. Yang Anda pilih di sini hanya pemeriksaan tambahannya: Asam Urat atau Kolesterol (pilih salah satu per kunjungan)." trigger="mouseenter click" theme="light">
            <CircleHelp class="size-3.5 shrink-0 cursor-pointer text-primary-500" />
          </tippy>
        </p>

        <p v-if="cfdStatus.kelayakan.kuota.penuh" class="text-xs font-medium text-red-600">
          Kuota hari ini sudah penuh, coba lagi di kesempatan berikutnya.
        </p>

        <div v-if="cfdStatus.riwayat_terakhir" class="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-500">
          Pemeriksaan CFD terakhir Anda: {{ formatDate(cfdStatus.riwayat_terakhir.tanggal) }}
          <span v-if="cfdStatus.riwayat_terakhir.kategori.length">
            ({{ cfdStatus.riwayat_terakhir.kategori.map((k) => kategoriLabel[k]).join(', ') }})
          </span>
        </div>

        <NuxtLink
          v-if="!cfdStatus.kelayakan.sudah_cfd_hari_ini && !cfdStatus.kelayakan.kuota.penuh"
          to="/cfd"
          class="mt-1 block w-full rounded-xl bg-secondary-600 py-2.5 text-center text-sm font-semibold text-white active:scale-[0.98]"
        >
          Daftar Pemeriksaan Gratis
        </NuxtLink>
        <button
          v-else-if="cfdStatus.kelayakan.kuota.penuh" type="button" disabled
          class="mt-1 block w-full cursor-not-allowed rounded-xl bg-neutral-200 py-2.5 text-center text-sm font-semibold text-neutral-500"
        >
          Daftar Pemeriksaan Gratis
        </button>
        <button
          v-else type="button" disabled
          class="mt-1 block w-full cursor-not-allowed rounded-xl bg-neutral-200 py-2.5 text-center text-sm font-semibold text-neutral-500"
        >
          Kembali Minggu Depan
        </button>
      </div>
    </div>
  </div>
</template>
