<script setup lang="ts">
import { Download, FileWarning } from 'lucide-vue-next'

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
  status: string
  status_konfirmasi: string | null
  is_ready: boolean
  pdf_link: string | null
  kesimpulan: string | null
  layanan: LayananItem[]
  biaya: Biaya
  items: ResultItem[]
}

const route = useRoute()
const api = useApi()

const detail = ref<ResultDetail | null>(null)
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    detail.value = await api.get(`/patient-portal/history/${route.params.id}`)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memuat detail hasil'
  } finally {
    loading.value = false
  }
})

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatRupiah(value: number) {
  return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
}
</script>

<template>
  <div>
    <PageHeader title="Detail Hasil Pemeriksaan" />

    <div class="px-5 pb-8">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <div v-else-if="loading" class="flex justify-center py-16">
        <div class="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
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
        <div class="divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
          <div v-for="(item, idx) in detail.items" :key="idx" class="flex items-center justify-between p-4">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-neutral-800">{{ item.parameter || item.nama }}</p>
              <p class="text-xs text-neutral-400">Rujukan: {{ item.nilai_rujukan || '-' }}</p>
            </div>
            <div class="shrink-0 text-right">
              <p class="text-sm font-bold text-neutral-900">{{ item.hasil ?? '-' }} <span class="text-xs font-normal text-neutral-400">{{ item.satuan }}</span></p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
