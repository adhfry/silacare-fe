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

interface ResultDetail {
  id: number
  tanggal: string | null
  status: string
  status_konfirmasi: string | null
  is_ready: boolean
  pdf_link: string | null
  kesimpulan: string | null
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
        <div class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
          <p class="text-xs text-neutral-400">Tanggal Pemeriksaan</p>
          <p class="font-heading text-base font-semibold text-neutral-900">{{ formatDate(detail.tanggal) }}</p>
        </div>

        <div v-if="!detail.is_ready" class="mt-4 flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          <FileWarning class="size-4.5 shrink-0" />
          Hasil masih diproses/menunggu konfirmasi petugas laboratorium.
        </div>

        <template v-else>
          <a
            v-if="detail.pdf_link" :href="detail.pdf_link" target="_blank" rel="noopener"
            class="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-600/25"
          >
            <Download class="size-4.5" /> Lihat / Unduh PDF Resmi
          </a>

          <div v-if="detail.kesimpulan" class="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <p class="text-xs font-semibold uppercase tracking-wide text-neutral-400">Kesimpulan</p>
            <p class="mt-1 text-sm text-neutral-700">{{ detail.kesimpulan }}</p>
          </div>

          <div class="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
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
      </template>
    </div>
  </div>
</template>
