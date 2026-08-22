<script setup lang="ts">
import { Download, FileWarning, QrCode, Clock3, ScanLine, CircleHelp, CheckCircle2, Bell } from 'lucide-vue-next'
import { isAbnormalResult } from '~/utils/resultStatus'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface ResultItem {
  nama: string | null
  parameter: string | null
  hasil: string | null
  satuan: string | null
  nilai_rujukan: string | null
  flag: string | null
}

interface LayananItem {
  nama: string
  harga: number
}
interface Biaya {
  total_biaya: number
  diskon: number | null
  total_tagihan: number
}
interface ResultDetail {
  id: number
  tanggal: string | null
  jam: string | null
  jenis_spesimen: string | null
  antrian_ke: number | null
  is_kunjungan_cfd: boolean
  status: string
  status_konfirmasi: string | null
  is_ready: boolean
  pdf_link: string | null
  kesimpulan: string | null
  qr_expired: boolean
  qr_image: string | null
  sudah_diverifikasi: boolean
  dibatalkan: boolean
  ditolak: boolean
  ditolak_alasan: string | null
  can_follow_up: boolean
  follow_up_next_at: string | null
  layanan: LayananItem[]
  biaya: Biaya
  items: ResultItem[]
}

const route = useRoute()
const api = useApi()
const auth = useAuthStore()

const detail = ref<ResultDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')

const suratHasilLabId = computed(() => detail.value?.id ?? null)
const { status: queueStatus, start: startQueuePolling } = useCfdQueueStatus(suratHasilLabId)

// Fallback kalau petugas tidak bisa scan QR pasien.
const showScanner = ref(false)

async function onQrDetected(code: string) {
  showScanner.value = false
  try {
    await api.post('/patient-portal/checkin/verify', { code })
    if (detail.value) detail.value.sudah_diverifikasi = true
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memverifikasi QR'
  }
}

// Follow up "saya sudah tiba" -- notice tambahan ke petugas, BUKAN pengganti
// QR check-in. Sama seperti halaman Antrean.
const followUpCountdownText = ref('')
const followUpSubmitting = ref(false)
let followUpTimer: ReturnType<typeof setInterval> | undefined

function tickFollowUpCountdown() {
  if (!detail.value?.follow_up_next_at) {
    followUpCountdownText.value = ''
    return
  }
  const remainMs = new Date(detail.value.follow_up_next_at).getTime() - Date.now()
  if (remainMs <= 0) {
    followUpCountdownText.value = ''
    return
  }
  const totalSec = Math.ceil(remainMs / 1000)
  followUpCountdownText.value = `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`
}

async function sendFollowUp() {
  if (!detail.value || followUpCountdownText.value || followUpSubmitting.value) return
  followUpSubmitting.value = true
  try {
    const data = await api.post<{ next_available_at: string }>(`/patient-portal/queues/${detail.value.id}/follow-up`, {})
    detail.value.follow_up_next_at = data.next_available_at
  } catch (err) {
    if (err instanceof ApiError) {
      const nextAt = err.fieldErrors && 'next_available_at' in err.fieldErrors ? (err.fieldErrors as any).next_available_at : null
      if (nextAt && detail.value) detail.value.follow_up_next_at = nextAt
      errorMessage.value = err.message
    }
  } finally {
    followUpSubmitting.value = false
    tickFollowUpCountdown()
  }
}

onMounted(async () => {
  try {
    detail.value = await api.get(`/patient-portal/history/${route.params.id}`)
    if (detail.value?.is_kunjungan_cfd && detail.value.status === 'pending') {
      startQueuePolling()
    }
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memuat detail hasil'
  } finally {
    loading.value = false
  }
  tickFollowUpCountdown()
  followUpTimer = setInterval(tickFollowUpCountdown, 1000)
})

onBeforeUnmount(() => {
  clearInterval(followUpTimer)
})

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatRupiah(value: number) {
  return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
}

// Umur pasien -- dipakai aturan nilai rujukan berbasis usia (mis. "th:<=12:...").
// Perhitungan sama seperti umur() di FE_SiLAKES, supaya hasil konsisten.
const patientAge = computed<number | null>(() => {
  const tglLahir = auth.profile?.patient.tgl_lahir
  if (!tglLahir) return null
  const birthDate = new Date(tglLahir)
  const today = new Date()
  let usia = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  const dayDiff = today.getDate() - birthDate.getDate()
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) usia--
  return usia
})

function isAbnormal(item: ResultItem): boolean {
  return isAbnormalResult(item.hasil, item.nilai_rujukan, {
    age: patientAge.value,
    gender: auth.profile?.patient.gender ?? null,
  })
}
</script>

<template>
  <div>
    <PageHeader title="Detail Hasil Pemeriksaan" />

    <div class="px-5 pb-8">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <div v-else-if="loading">
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <SkeletonBlock class="h-3 w-24" />
            <SkeletonBlock class="mt-2 h-5 w-32" />
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <SkeletonBlock class="h-3 w-16" />
            <SkeletonBlock class="mt-2 h-5 w-20" />
          </div>
        </div>

        <div class="mt-3 rounded-2xl bg-white p-5 text-center shadow-sm shadow-neutral-200/60">
          <SkeletonBlock class="mx-auto h-4 w-40" />
          <SkeletonBlock rounded="rounded-xl" class="mx-auto mt-3 size-48" />
        </div>

        <SkeletonBlock class="mt-5 mb-2 h-4 w-24" />
        <div class="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
          <div v-for="i in 2" :key="i" class="flex items-center justify-between p-4">
            <SkeletonBlock class="h-4 w-32" />
            <SkeletonBlock class="h-4 w-16" />
          </div>
        </div>

        <SkeletonBlock class="mt-5 mb-2 h-4 w-32" />
        <div class="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
          <div v-for="i in 4" :key="i" class="flex items-center justify-between p-4">
            <div class="space-y-2">
              <SkeletonBlock class="h-4 w-28" />
              <SkeletonBlock class="h-3 w-20" />
            </div>
            <SkeletonBlock class="h-4 w-12" />
          </div>
        </div>
      </div>

      <template v-else-if="detail">
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <p class="text-xs text-neutral-400">Tanggal Pemeriksaan</p>
            <p class="font-heading text-base font-semibold text-neutral-900">{{ formatDate(detail.tanggal) }}</p>
          </div>
          <div class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <p class="text-xs text-neutral-400">Jam</p>
            <p class="font-heading text-base font-semibold text-neutral-900">{{ detail.jam ? `${detail.jam} WIB` : '-' }}</p>
          </div>
        </div>

        <div v-if="detail.jenis_spesimen" class="mt-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
          <p class="text-xs text-neutral-400">Jenis Spesimen</p>
          <p class="text-sm font-semibold text-neutral-900">{{ detail.jenis_spesimen }}</p>
        </div>

        <div v-if="detail.antrian_ke" class="mt-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
          <p class="text-xs text-neutral-400">Nomor Antrean</p>
          <p class="font-heading text-2xl font-bold text-primary-600">{{ detail.antrian_ke }}</p>
        </div>

        <div v-if="detail.is_kunjungan_cfd && detail.status === 'pending' && queueStatus" class="mt-3 rounded-2xl bg-secondary-50 p-4 text-center">
          <p class="text-xs text-secondary-600">Sisa antrean di depan Anda</p>
          <p class="font-heading mt-1 text-3xl font-bold tabular-nums text-secondary-700">
            {{ queueStatus.status === 'pending' ? queueStatus.sisa_di_depan : 0 }}
          </p>
          <p class="mt-1 text-xs text-secondary-600">orang, diperbarui otomatis</p>
        </div>

        <!-- Ditolak petugas -->
        <div v-if="detail.ditolak" class="mt-3 rounded-2xl bg-red-50 p-4 shadow-sm shadow-neutral-200/60">
          <p class="text-sm font-semibold text-red-600">Pendaftaran online ini ditolak petugas.</p>
          <p v-if="detail.ditolak_alasan" class="mt-1 text-xs text-red-500">Alasan: {{ detail.ditolak_alasan }}</p>
        </div>

        <!-- Sudah check-in (via QR pribadi discan petugas ATAU fallback QR
             admin discan sendiri). -->
        <div v-if="detail.sudah_diverifikasi" class="mt-3 flex items-center gap-3 rounded-2xl bg-secondary-50 p-4 shadow-sm shadow-neutral-200/60">
          <CheckCircle2 class="size-5 shrink-0 text-secondary-600" />
          <p class="text-sm font-medium text-secondary-700">Kedatangan Anda telah diverifikasi, menunggu hasil pemeriksaan.</p>
        </div>

        <!-- QR check-in: cuma untuk kunjungan online non-CFD (CFD punya worklist
             realtime sendiri, tidak perlu scan). Blur+Expired kalau sudah lewat
             masa berlaku, supaya tidak bisa dipakai check-in dua kali. -->
        <div v-else-if="detail.qr_image" class="mt-3 rounded-2xl bg-white p-5 text-center shadow-sm shadow-neutral-200/60">
          <p class="mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-700">
            <QrCode class="size-4.5" /> Tunjukkan QR ini saat datang
          </p>
          <img :src="detail.qr_image" alt="QR check-in" class="mx-auto size-48 rounded-xl border border-neutral-100">
          <p class="mt-3 text-xs text-neutral-400">Petugas akan memindai QR ini agar pemeriksaan Anda otomatis terisi</p>

          <div class="mt-4 border-t border-neutral-100 pt-4">
            <p class="mb-1.5 flex items-center justify-center gap-1 text-xs text-neutral-400">
              Petugas tidak bisa memindai QR Anda?
              <tippy content="Berikan HP Anda kepada petugas di loket. Petugas akan menampilkan QR di layar admin, lalu Anda memindainya dari HP ini untuk verifikasi kedatangan." trigger="mouseenter click" theme="light">
                <CircleHelp class="size-3.5 shrink-0 cursor-help text-neutral-400" />
              </tippy>
            </p>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-neutral-50 px-3 py-1.5 text-xs font-medium text-primary-600"
              @click="showScanner = true"
            >
              <ScanLine class="size-3.5" /> Scan QR Admin
            </button>
          </div>
        </div>
        <div v-else-if="detail.qr_expired" class="relative mt-3 overflow-hidden rounded-2xl bg-white p-5 text-center shadow-sm shadow-neutral-200/60">
          <div class="pointer-events-none select-none blur-sm">
            <p class="mb-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-neutral-700">
              <QrCode class="size-4.5" /> QR Check-in
            </p>
            <div class="mx-auto size-48 rounded-xl bg-neutral-200" />
          </div>
          <div class="absolute inset-0 flex items-center justify-center bg-white/50">
            <span class="rounded-full bg-neutral-800 px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white">Expired</span>
          </div>
        </div>

        <!-- Follow up "saya sudah tiba" -- blok terpisah dari QR di atas,
             keduanya SAMA-SAMA tampil sekaligus, bukan alternatif satu sama
             lain. -->
        <div v-if="detail.can_follow_up" class="mt-3">
          <button
            type="button"
            class="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-primary-100 bg-white py-3 text-sm font-semibold text-primary-600 shadow-sm shadow-neutral-200/60 disabled:opacity-50"
            :disabled="!!followUpCountdownText || followUpSubmitting"
            @click="sendFollowUp"
          >
            <Bell class="size-4" />
            <template v-if="followUpCountdownText">Sudah diberi tahu · {{ followUpCountdownText }}</template>
            <template v-else>Saya Sudah Tiba, Beri Tahu Petugas</template>
          </button>
        </div>

        <div v-if="!detail.is_ready" class="mt-4 flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <FileWarning class="size-4.5 shrink-0" />
          Hasil masih diproses/menunggu konfirmasi petugas laboratorium.
        </div>

        <a
          v-if="detail.is_ready && detail.pdf_link" :href="detail.pdf_link" target="_blank" rel="noopener"
          class="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-600/25"
        >
          <Download class="size-4.5" /> Lihat / Unduh PDF Resmi
        </a>

        <div v-if="detail.is_ready && detail.kesimpulan" class="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
          <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Kesimpulan</p>
          <p class="mt-1 text-sm text-neutral-700">{{ detail.kesimpulan }}</p>
        </div>

        <!-- Layanan yang dipesan -- tetap ditampilkan walau hasil belum keluar,
             supaya pasien tahu kelengkapan pemeriksaan yang sedang diproses. -->
        <p class="mt-5 mb-2 text-sm font-medium text-neutral-700">Layanan</p>
        <div class="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
          <div v-for="l in detail.layanan" :key="l.nama" class="flex items-center justify-between p-4">
            <p class="text-sm font-medium text-neutral-800">{{ l.nama }}</p>
            <p class="text-sm font-semibold text-neutral-600">{{ formatRupiah(l.harga) }}</p>
          </div>
        </div>

        <div class="mt-3 space-y-1.5 rounded-2xl bg-neutral-50 p-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-neutral-500">Total Biaya</span>
            <span class="font-medium text-neutral-700">{{ formatRupiah(detail.biaya.total_biaya) }}</span>
          </div>
          <div v-if="detail.biaya.diskon" class="flex items-center justify-between text-sm">
            <span class="text-neutral-500">Diskon/Potongan</span>
            <span class="font-medium text-secondary-600">-{{ formatRupiah(detail.biaya.diskon) }}</span>
          </div>
          <div class="flex items-center justify-between border-t border-neutral-200 pt-1.5 text-sm">
            <span class="font-semibold text-neutral-700">Total Tagihan</span>
            <span class="font-heading font-bold text-neutral-900">{{ formatRupiah(detail.biaya.total_tagihan) }}</span>
          </div>
        </div>

        <p class="mt-5 mb-2 text-sm font-medium text-neutral-700">Detail Parameter</p>

        <div v-if="!detail.is_ready" class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock3 class="size-4.5" />
          </div>
          <p class="text-sm text-neutral-500">
            Detail parameter belum tersedia saat ini. Akan tampil begitu hasil dikonfirmasi oleh petugas laboratorium.
          </p>
        </div>

        <div v-else class="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
          <div v-for="(item, idx) in detail.items" :key="idx" class="flex items-center justify-between p-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-neutral-800">{{ item.parameter || item.nama }}</p>
              <p class="text-xs text-neutral-400">Rujukan: {{ item.nilai_rujukan || '-' }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-bold" :class="isAbnormal(item) ? 'text-red-600' : 'text-neutral-900'">
                {{ item.hasil ?? '-' }} <span class="text-xs font-normal text-neutral-400">{{ item.satuan }}</span>
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>

    <QrScannerModal v-model="showScanner" @detected="onQrDetected" />
  </div>
</template>
