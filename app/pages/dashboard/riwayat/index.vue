<script setup lang="ts">
import { FileText, ChevronRight, CheckCircle2, Clock, QrCode } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()

interface HistoryItem {
  id: number
  tanggal: string | null
  jenis: string
  antrian_ke: number | null
  status: string
  status_konfirmasi: string | null
  is_ready: boolean
  qr_available: boolean
  qr_expired: boolean
}

const items = ref<HistoryItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

const jenisLabel: Record<string, string> = {
  narkoba: 'Narkoba',
  bakteriologi: 'Bakteriologi',
  surat_keterangan_sehat: 'Surat Keterangan Sehat',
  surat_keterangan_sakit: 'Surat Keterangan Sakit',
  cfd: 'Car Free Day',
  prolanis: 'Prolanis',
  pemeriksaan_umum: 'Pemeriksaan Umum',
}

onMounted(async () => {
  try {
    const data = await api.get('/patient-portal/history')
    items.value = data.items
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memuat riwayat'
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
    <PageHeader title="Riwayat Pemeriksaan" :back="false" />

    <div class="px-5 pb-6">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <div v-else-if="loading" class="flex justify-center py-16">
        <div class="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>

      <div v-else-if="!items.length" class="flex flex-col items-center py-16 text-center">
        <FileText class="size-12 text-neutral-300" />
        <p class="mt-3 text-sm text-neutral-400">Belum ada riwayat pemeriksaan</p>
      </div>

      <div v-else class="space-y-3">
        <NuxtLink
          v-for="item in items" :key="item.id" :to="`/dashboard/riwayat/${item.id}`"
          class="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60"
        >
          <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl"
            :class="item.is_ready ? 'bg-secondary-50 text-secondary-600' : 'bg-neutral-100 text-neutral-400'"
          >
            <CheckCircle2 v-if="item.is_ready" class="size-5" />
            <Clock v-else class="size-5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="flex items-center gap-1.5 truncate text-sm font-semibold text-neutral-800">
              {{ jenisLabel[item.jenis] || item.jenis }}
              <QrCode v-if="item.qr_available" class="size-3.5 shrink-0 text-primary-500" />
            </p>
            <p class="text-xs text-neutral-400">
              {{ formatDate(item.tanggal) }}<span v-if="item.antrian_ke"> · Antrean #{{ item.antrian_ke }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
            :class="item.is_ready ? 'bg-secondary-100 text-secondary-700' : 'bg-amber-100 text-amber-700'"
          >
            {{ item.is_ready ? 'Selesai' : 'Diproses' }}
          </span>
          <ChevronRight class="size-4 shrink-0 text-neutral-300" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
