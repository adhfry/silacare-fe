<script setup lang="ts">
import { Plus, CalendarClock, X, Search } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface QueueItem {
  id: number
  tanggal: string | null
  antrian_ke: number | null
  status: string
  pembayaran: { total_biaya: string | null; status: string }
}

interface Layanan {
  id: number
  name: string
  price: string
  category: string
}

const api = useApi()
const route = useRoute()
const router = useRouter()

const queues = ref<QueueItem[]>([])
const loading = ref(true)
const errorMessage = ref('')

const showForm = ref(route.query.booking === '1')
const layananList = ref<Layanan[]>([])
const layananLoading = ref(false)
const selectedLayanan = ref<number[]>([])
const tanggal = ref('')
const submitting = ref(false)
const formError = ref('')
const successMessage = ref('')

const layananSearch = ref('')
const activeCategory = ref<string | 'Semua'>('Semua')

const categories = computed(() => ['Semua', ...new Set(layananList.value.map((l) => l.category))])

const filteredLayanan = computed(() => {
  const q = layananSearch.value.trim().toLowerCase()
  return layananList.value.filter((l) => {
    const matchesCategory = activeCategory.value === 'Semua' || l.category === activeCategory.value
    const matchesSearch = !q || l.name.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })
})

const grouped = computed(() => {
  const map = new Map<string, Layanan[]>()
  for (const l of filteredLayanan.value) {
    if (!map.has(l.category)) map.set(l.category, [])
    map.get(l.category)!.push(l)
  }
  return map
})

const totalBiaya = computed(() =>
  layananList.value
    .filter((l) => selectedLayanan.value.includes(l.id))
    .reduce((sum, l) => sum + Number(l.price), 0),
)

async function loadQueues() {
  loading.value = true
  try {
    queues.value = await api.get('/patient-portal/queues')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memuat antrean'
  } finally {
    loading.value = false
  }
}

async function openForm() {
  showForm.value = true
  if (layananList.value.length) return
  layananLoading.value = true
  try {
    layananList.value = await api.get('/patient-portal/layanan')
  } catch {
    formError.value = 'Gagal memuat daftar layanan'
  } finally {
    layananLoading.value = false
  }
}

function toggleLayanan(id: number) {
  const idx = selectedLayanan.value.indexOf(id)
  if (idx === -1) selectedLayanan.value.push(id)
  else selectedLayanan.value.splice(idx, 1)
}

async function submitBooking() {
  formError.value = ''
  if (!selectedLayanan.value.length) {
    formError.value = 'Pilih minimal satu layanan'
    return
  }
  if (!tanggal.value) {
    formError.value = 'Pilih tanggal kedatangan'
    return
  }

  submitting.value = true
  try {
    await api.post('/patient-portal/queues', { layanan_ids: selectedLayanan.value, tanggal: tanggal.value })
    successMessage.value = 'Booking berhasil! Silakan datang sesuai jadwal dan bawa uang tunai sesuai total biaya.'
    selectedLayanan.value = []
    tanggal.value = ''
    showForm.value = false
    await router.replace('/dashboard/antrean')
    await loadQueues()
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : 'Gagal membuat booking'
  } finally {
    submitting.value = false
  }
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRupiah(value: number) {
  return value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
}

const paymentStatusLabel: Record<string, string> = { WAITING_PAYMENT: 'Menunggu Pembayaran', PAID: 'Lunas' }

onMounted(() => {
  loadQueues()
  if (showForm.value) openForm()
})
</script>

<template>
  <div>
    <PageHeader title="Antrean Online" :back="false" />

    <div class="px-5 pb-8">
      <AppButton v-if="!showForm" class="w-full" @click="openForm">
        <Plus class="size-4.5" /> Buat Janji Baru
      </AppButton>

      <!-- Booking form -->
      <div v-if="showForm" class="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-heading text-base font-semibold text-neutral-900">Buat Janji Pemeriksaan</h2>
          <button class="text-neutral-400" @click="showForm = false"><X class="size-5" /></button>
        </div>

        <AppAlert v-if="formError" variant="error" class="mb-3">{{ formError }}</AppAlert>

        <div v-if="layananLoading" class="flex justify-center py-8">
          <div class="size-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>

        <template v-else>
          <AppInput v-model="tanggal" label="Tanggal Kedatangan" type="date" class="mb-4" required />

          <p class="mb-2 text-sm font-medium text-neutral-700">Pilih Layanan</p>

          <div class="relative mb-2.5">
            <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <input
              v-model="layananSearch" type="text" placeholder="Cari nama layanan..."
              class="w-full rounded-xl border-2 border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary-500"
            >
          </div>

          <div class="mb-3 flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="cat in categories" :key="cat" type="button"
              class="shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
              :class="activeCategory === cat ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="activeCategory = cat"
            >
              {{ cat }}
            </button>
          </div>

          <div class="max-h-72 space-y-3 overflow-y-auto pr-1">
            <p v-if="!grouped.size" class="py-6 text-center text-sm text-neutral-400">
              Layanan tidak ditemukan.
            </p>
            <div v-for="[category, list] in grouped" :key="category">
              <p class="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">{{ category }}</p>
              <label
                v-for="l in list" :key="l.id"
                class="mb-1.5 flex items-center justify-between rounded-xl border-2 px-3 py-2.5 last:mb-0"
                :class="selectedLayanan.includes(l.id) ? 'border-primary-500 bg-primary-50' : 'border-neutral-100'"
              >
                <span class="flex items-center gap-2.5">
                  <input
                    type="checkbox" class="size-4 accent-primary-600"
                    :checked="selectedLayanan.includes(l.id)"
                    @change="toggleLayanan(l.id)"
                  >
                  <span class="text-sm text-neutral-700">{{ l.name }}</span>
                </span>
                <span class="shrink-0 text-xs font-semibold text-neutral-500">{{ formatRupiah(Number(l.price)) }}</span>
              </label>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
            <span class="text-sm font-medium text-neutral-600">Total Tagihan</span>
            <span class="font-heading text-base font-bold text-neutral-900">{{ formatRupiah(totalBiaya) }}</span>
          </div>
          <p class="mt-1.5 text-xs text-neutral-400">Pembayaran tunai di lokasi, diverifikasi petugas administrasi saat kedatangan.</p>

          <AppButton class="mt-4 w-full" :loading="submitting" @click="submitBooking">Konfirmasi Booking</AppButton>
        </template>
      </div>

      <AppAlert v-if="successMessage" variant="success" class="mt-4">{{ successMessage }}</AppAlert>

      <!-- Queue list -->
      <div class="mt-6">
        <h2 class="font-heading mb-3 text-base font-semibold text-neutral-900">Riwayat Booking</h2>

        <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

        <div v-else-if="loading" class="flex justify-center py-12">
          <div class="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>

        <div v-else-if="!queues.length" class="flex flex-col items-center py-12 text-center">
          <CalendarClock class="size-12 text-neutral-300" />
          <p class="mt-3 text-sm text-neutral-400">Belum ada booking antrean online</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="q in queues" :key="q.id" class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-semibold text-neutral-800">{{ formatDate(q.tanggal) }}</p>
                <p class="text-xs text-neutral-400">Nomor antrean: {{ q.antrian_ke ?? '-' }}</p>
              </div>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                :class="q.pembayaran.status === 'PAID' ? 'bg-secondary-100 text-secondary-700' : 'bg-amber-100 text-amber-700'"
              >
                {{ paymentStatusLabel[q.pembayaran.status] || q.pembayaran.status }}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
              <span class="text-xs text-neutral-400">Total Tagihan</span>
              <span class="text-sm font-bold text-neutral-800">
                {{ q.pembayaran.total_biaya ? formatRupiah(Number(q.pembayaran.total_biaya)) : '-' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
