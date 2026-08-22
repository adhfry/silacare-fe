<script setup lang="ts">
import { Plus, CalendarClock, X, Search, AlertCircle, Ban, PencilLine, QrCode, ScanLine, CircleHelp, CheckCircle2 } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface QueueLayanan {
  id: number
  name: string
  price: string
}

interface QueueItem {
  id: number
  tanggal: string | null
  jam_kedatangan: string | null
  antrian_ke: number | null
  status: string
  dibatalkan: boolean
  dibatalkan_at: string | null
  can_cancel: boolean
  revisi_count: number
  revisi_sisa: number
  can_revise: boolean
  qr_available: boolean
  qr_expired: boolean
  qr_image: string | null
  sudah_diverifikasi: boolean
  layanan: QueueLayanan[]
  pembayaran: { total_biaya: string | null; status: string }
}

interface Quota {
  used: number
  limit: number
  remaining: number
}

// Labkesda buka 08.00-20.30, tapi booking online dibatasi sampai jam 20.00
// (di atas itu petugas mulai persiapan tutup, tidak menerima pasien online).
const JAM_BUKA_ONLINE = '08:00'
const JAM_TUTUP_ONLINE = '20:00'

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

const showForm = ref(false)
const showActiveModal = ref(false)
const showQuotaModal = ref(false)
const layananList = ref<Layanan[]>([])
const layananLoading = ref(false)
const selectedLayanan = ref<number[]>([])
const tanggal = ref('')
const jam = ref('')
const submitting = ref(false)
const formError = ref('')
const successMessage = ref('')

const quota = ref<Quota | null>(null)

// Batalkan janji
const cancelTarget = ref<QueueItem | null>(null)
const cancelling = ref(false)

// Revisi layanan (tambah/hapus) pada janji yang masih pending
const revisingQueueId = ref<number | null>(null)
const reviseTargetQueue = ref<QueueItem | null>(null)
const reviseSelectedLayanan = ref<number[]>([])
const revising = ref(false)
const reviseError = ref('')
const reviseSearch = ref('')
const reviseCategory = ref<string | 'Semua'>('Semua')
const showReviseConfirm = ref(false)

const reviseCategories = computed(() => ['Semua', ...new Set(layananList.value.map((l) => l.category))])

// Layanan yang SUDAH dipilih ditaruh di bagian atas sendiri (biar checkbox-nya
// langsung kelihatan untuk di-uncheck), sisanya baru dikelompokkan per kategori
// di bawahnya seperti biasa -- dan dua-duanya tetap ikut filter cari/kategori.
const reviseFilteredLayanan = computed(() => {
  const q = reviseSearch.value.trim().toLowerCase()
  return layananList.value.filter((l) => {
    const matchesCategory = reviseCategory.value === 'Semua' || l.category === reviseCategory.value
    const matchesSearch = !q || l.name.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })
})

const reviseSelectedItems = computed(() =>
  reviseFilteredLayanan.value.filter((l) => reviseSelectedLayanan.value.includes(l.id)),
)

const reviseGroupedUnselected = computed(() => {
  const map = new Map<string, Layanan[]>()
  for (const l of reviseFilteredLayanan.value) {
    if (reviseSelectedLayanan.value.includes(l.id)) continue
    if (!map.has(l.category)) map.set(l.category, [])
    map.get(l.category)!.push(l)
  }
  return map
})

// Total harga dihitung dari SELURUH layanan terpilih (bukan cuma yang lolos
// filter saat ini), supaya tidak berubah-ubah saat pasien sedang mencari/
// memfilter kategori lain.
const reviseTotalBiaya = computed(() =>
  layananList.value
    .filter((l) => reviseSelectedLayanan.value.includes(l.id))
    .reduce((sum, l) => sum + Number(l.price), 0),
)

const reviseDiff = computed(() => {
  if (!reviseTargetQueue.value) return { add: [] as Layanan[], remove: [] as QueueLayanan[] }
  const originalIds = reviseTargetQueue.value.layanan.map((l) => l.id)
  const add = layananList.value.filter((l) => reviseSelectedLayanan.value.includes(l.id) && !originalIds.includes(l.id))
  const remove = reviseTargetQueue.value.layanan.filter((l) => !reviseSelectedLayanan.value.includes(l.id))
  return { add, remove }
})

// Fallback kalau petugas tidak bisa scan QR pasien -- pasien sendiri yang
// memindai QR (rotasi 15 detik) yang ditampilkan di layar admin. Backend
// menentukan sendiri janji mana yang di-check-in (janji hari ini yang
// berlaku, lihat PatientCheckinService::findCheckinTarget()), jadi tidak
// perlu tahu dari kartu mana tombol ini diklik.
const showScanner = ref(false)

function openScanner() {
  showScanner.value = true
}

async function onQrDetected(code: string) {
  showScanner.value = false
  try {
    await api.post('/patient-portal/checkin/verify', { code })
    successMessage.value = 'Kedatangan Anda berhasil diverifikasi. Silakan tunggu, pemeriksaan Anda akan segera diproses.'
    await loadQueues()
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memverifikasi QR'
  }
}

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

// Pasien cuma boleh punya satu janji AKTIF (belum selesai) per hari -- kalau
// hari ini masih ada surat dengan status 'pending', tolak buat janji baru
// dan arahkan untuk menyelesaikan yang sudah ada dulu.
const activeTodayQueue = computed(() => {
  const todayStr = new Date().toISOString().slice(0, 10)
  return queues.value.find((q) => q.tanggal === todayStr && q.status !== 'completed') || null
})

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

async function loadQuota() {
  try {
    quota.value = await api.get('/patient-portal/queues/quota')
  } catch {
    // Kuota gagal dimuat bukan penghalang -- validasi tetap dijaga di backend
    // saat submit, tombol "Buat Janji Baru" tetap bisa dicoba.
  }
}

async function loadLayananList() {
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

async function openForm() {
  if (activeTodayQueue.value) {
    showActiveModal.value = true
    return
  }
  if (quota.value && quota.value.remaining <= 0) {
    showQuotaModal.value = true
    return
  }

  showForm.value = true
  await loadLayananList()
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
  if (!jam.value) {
    formError.value = 'Pilih jam kedatangan'
    return
  }
  if (jam.value < JAM_BUKA_ONLINE || jam.value > JAM_TUTUP_ONLINE) {
    formError.value = `Jam kedatangan harus antara ${JAM_BUKA_ONLINE} - ${JAM_TUTUP_ONLINE}`
    return
  }
  const isToday = tanggal.value === new Date().toISOString().slice(0, 10)
  if (isToday && jam.value < new Date().toTimeString().slice(0, 5)) {
    formError.value = 'Jam kedatangan yang dipilih sudah lewat, silakan pilih jam lain'
    return
  }

  submitting.value = true
  try {
    await api.post('/patient-portal/queues', { layanan_ids: selectedLayanan.value, tanggal: tanggal.value, jam: jam.value })
    successMessage.value = 'Booking berhasil! Silakan datang sesuai jadwal dan bawa uang tunai sesuai total biaya.'
    selectedLayanan.value = []
    tanggal.value = ''
    jam.value = ''
    showForm.value = false
    await router.replace('/dashboard/antrean')
    await Promise.all([loadQueues(), loadQuota()])
  } catch (err) {
    formError.value = err instanceof ApiError ? err.message : 'Gagal membuat booking'
  } finally {
    submitting.value = false
  }
}

async function confirmCancel() {
  if (!cancelTarget.value) return
  cancelling.value = true
  try {
    await api.post(`/patient-portal/queues/${cancelTarget.value.id}/cancel`, {})
    cancelTarget.value = null
    successMessage.value = 'Janji pemeriksaan Anda telah dibatalkan.'
    await loadQueues()
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal membatalkan janji'
  } finally {
    cancelling.value = false
  }
}

async function openRevise(q: QueueItem) {
  revisingQueueId.value = q.id
  reviseTargetQueue.value = q
  reviseSelectedLayanan.value = q.layanan.map((l) => l.id)
  reviseSearch.value = ''
  reviseCategory.value = 'Semua'
  reviseError.value = ''
  await loadLayananList()
}

function closeRevise() {
  revisingQueueId.value = null
  reviseTargetQueue.value = null
  reviseSelectedLayanan.value = []
  reviseError.value = ''
  showReviseConfirm.value = false
}

function toggleReviseLayanan(id: number) {
  const idx = reviseSelectedLayanan.value.indexOf(id)
  if (idx === -1) reviseSelectedLayanan.value.push(id)
  else reviseSelectedLayanan.value.splice(idx, 1)
}

function openReviseConfirm(q: QueueItem) {
  reviseError.value = ''
  const { add, remove } = reviseDiff.value
  const totalAksi = add.length + remove.length

  if (!totalAksi) {
    reviseError.value = 'Belum ada perubahan layanan yang dipilih'
    return
  }
  if (totalAksi > q.revisi_sisa) {
    reviseError.value = `Perubahan ini membutuhkan ${totalAksi} aksi revisi, sedangkan sisa kuota revisi Anda tinggal ${q.revisi_sisa}.`
    return
  }

  showReviseConfirm.value = true
}

async function confirmRevise() {
  const q = reviseTargetQueue.value
  if (!q) return

  const { add, remove } = reviseDiff.value

  revising.value = true
  try {
    await api.patch(`/patient-portal/queues/${q.id}/layanan`, {
      add: add.map((l) => l.id),
      remove: remove.map((l) => l.id),
    })
    successMessage.value = 'Perubahan layanan berhasil disimpan.'
    closeRevise()
    await loadQueues()
  } catch (err) {
    showReviseConfirm.value = false
    reviseError.value = err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan layanan'
  } finally {
    revising.value = false
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

onMounted(async () => {
  await Promise.all([loadQueues(), loadQuota()])
  if (route.query.booking === '1') openForm()
})
</script>

<template>
  <div>
    <PageHeader title="Antrean Online" :back="false" />

    <div class="px-5 pb-8">
      <AppButton v-if="!showForm" class="w-full" @click="openForm">
        <Plus class="size-4.5" /> Buat Janji Baru
      </AppButton>
      <p v-if="!showForm && quota" class="mt-2 text-center text-xs text-neutral-400">
        Sisa kuota pembuatan janji hari ini: {{ quota.remaining }} dari {{ quota.limit }} kali
      </p>

      <!-- Modal: masih ada janji hari ini yang belum selesai -->
      <Teleport to="body">
        <div v-if="showActiveModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" @click.self="showActiveModal = false">
          <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div class="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertCircle class="size-6" />
            </div>
            <h2 class="font-heading mt-3 text-base font-bold text-neutral-900">Masih Ada Janji Hari Ini</h2>
            <p class="mt-1.5 text-sm text-neutral-500">
              Anda sudah memiliki janji pemeriksaan hari ini
              <template v-if="activeTodayQueue?.jam_kedatangan"> pukul {{ activeTodayQueue.jam_kedatangan }} WIB</template>
              <template v-if="activeTodayQueue?.antrian_ke"> (antrean nomor {{ activeTodayQueue.antrian_ke }})</template>
              yang belum selesai. Selesaikan janji tersebut terlebih dahulu sebelum membuat janji baru.
            </p>
            <AppButton class="mt-4 w-full" @click="showActiveModal = false">Mengerti</AppButton>
          </div>
        </div>
      </Teleport>

      <!-- Modal: kuota pembuatan janji hari ini sudah habis -->
      <Teleport to="body">
        <div v-if="showQuotaModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" @click.self="showQuotaModal = false">
          <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div class="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <AlertCircle class="size-6" />
            </div>
            <h2 class="font-heading mt-3 text-base font-bold text-neutral-900">Kuota Janji Hari Ini Sudah Habis</h2>
            <p class="mt-1.5 text-sm text-neutral-500">
              Anda telah mencapai batas maksimal {{ quota?.limit }} kali pembuatan janji secara online untuk hari ini.
              Apabila Anda memerlukan pemeriksaan pada hari ini, silakan datang langsung ke Labkesda.
            </p>
            <AppButton class="mt-4 w-full" @click="showQuotaModal = false">Mengerti</AppButton>
          </div>
        </div>
      </Teleport>

      <!-- Modal: konfirmasi batalkan janji -->
      <Teleport to="body">
        <div v-if="cancelTarget" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" @click.self="cancelTarget = null">
          <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div class="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Ban class="size-6" />
            </div>
            <h2 class="font-heading mt-3 text-base font-bold text-neutral-900">Batalkan Janji Pemeriksaan?</h2>
            <p class="mt-1.5 text-sm text-neutral-500">
              Janji pemeriksaan pada {{ formatDate(cancelTarget.tanggal) }}
              <template v-if="cancelTarget.jam_kedatangan"> pukul {{ cancelTarget.jam_kedatangan }} WIB</template>
              akan dibatalkan dan tidak dapat diaktifkan kembali. Kuota pembuatan janji hari ini yang sudah terpakai
              tidak akan dikembalikan.
            </p>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <AppButton variant="outline" :disabled="cancelling" @click="cancelTarget = null">Tidak Jadi</AppButton>
              <AppButton variant="secondary" :loading="cancelling" @click="confirmCancel">Ya, Batalkan</AppButton>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Booking form -->
      <div v-if="showForm" class="mt-4 rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="font-heading text-base font-semibold text-neutral-900">Buat Janji Pemeriksaan</h2>
          <button class="text-neutral-400" @click="showForm = false"><X class="size-5" /></button>
        </div>

        <AppAlert v-if="formError" variant="error" class="mb-3">{{ formError }}</AppAlert>

        <div v-if="layananLoading" class="space-y-1.5">
          <div v-for="i in 5" :key="i" class="flex items-center justify-between rounded-xl border-2 border-neutral-100 px-3 py-2.5">
            <SkeletonBlock class="h-4 w-40" />
            <SkeletonBlock class="h-4 w-14" />
          </div>
        </div>

        <template v-else>
          <div class="mb-4 grid grid-cols-2 gap-3">
            <AppInput v-model="tanggal" label="Tanggal Kedatangan" type="date" required />
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-neutral-700">Jam Kedatangan<span class="text-danger"> *</span></span>
              <input
                v-model="jam" type="time" :min="JAM_BUKA_ONLINE" :max="JAM_TUTUP_ONLINE"
                class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none focus:border-primary-500"
              >
            </label>
          </div>
          <p class="-mt-2.5 mb-4 text-xs text-neutral-400">
            Labkesda menerima pasien online pukul {{ JAM_BUKA_ONLINE }}-{{ JAM_TUTUP_ONLINE }} WIB.
          </p>

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

        <div v-else-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <div class="flex items-start justify-between">
              <div class="space-y-2">
                <SkeletonBlock class="h-4 w-36" />
                <SkeletonBlock class="h-3 w-24" />
              </div>
              <SkeletonBlock rounded="rounded-full" class="h-5 w-24" />
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
              <SkeletonBlock class="h-3 w-20" />
              <SkeletonBlock class="h-4 w-16" />
            </div>
          </div>
        </div>

        <div v-else-if="!queues.length" class="flex flex-col items-center py-12 text-center">
          <CalendarClock class="size-12 text-neutral-300" />
          <p class="mt-3 text-sm text-neutral-400">Belum ada booking antrean online</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="q in queues" :key="q.id" class="rounded-2xl bg-white p-4 shadow-sm shadow-neutral-200/60">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-sm font-semibold text-neutral-800">
                  {{ formatDate(q.tanggal) }}<span v-if="q.jam_kedatangan"> · {{ q.jam_kedatangan }} WIB</span>
                </p>
                <p class="text-xs text-neutral-400">Nomor antrean: {{ q.antrian_ke ?? '-' }}</p>
              </div>
              <span
                v-if="q.dibatalkan"
                class="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-semibold text-neutral-500"
              >
                Dibatalkan
              </span>
              <span
                v-else
                class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                :class="q.pembayaran.status === 'PAID' ? 'bg-secondary-100 text-secondary-700' : 'bg-amber-100 text-amber-700'"
              >
                {{ paymentStatusLabel[q.pembayaran.status] || q.pembayaran.status }}
              </span>
            </div>

            <div v-if="q.layanan.length" class="mt-2 border-t border-neutral-100 pt-2">
              <p v-for="l in q.layanan" :key="l.id" class="flex items-center justify-between py-0.5 text-xs">
                <span class="text-neutral-500">{{ l.name }}</span>
                <span class="font-medium text-neutral-600">{{ formatRupiah(Number(l.price)) }}</span>
              </p>
            </div>

            <div class="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
              <span class="text-xs text-neutral-400">Total Tagihan</span>
              <span class="text-sm font-bold text-neutral-800">
                {{ q.pembayaran.total_biaya ? formatRupiah(Number(q.pembayaran.total_biaya)) : '-' }}
              </span>
            </div>

            <!-- Sudah check-in (via QR pribadi discan petugas ATAU fallback
                 QR admin discan sendiri) -- tidak perlu tampilkan QR lagi. -->
            <div v-if="q.sudah_diverifikasi" class="mt-3 flex items-center gap-2.5 rounded-xl border-t border-neutral-100 bg-secondary-50 p-4 pt-4">
              <CheckCircle2 class="size-4.5 shrink-0 text-secondary-600" />
              <p class="text-xs font-medium text-secondary-700">Kedatangan Anda telah diverifikasi, menunggu hasil pemeriksaan.</p>
            </div>

            <!-- QR check-in: tunjukkan ke petugas di loket pendaftaran saat
                 datang -- petugas scan, seluruh layanan yang dipesan otomatis
                 terisi. Blur+Expired kalau sudah tidak berlaku (hasil sudah
                 diproses atau janji dibatalkan). -->
            <div v-else-if="q.qr_image" class="mt-3 rounded-xl border-t border-neutral-100 bg-neutral-50 p-4 pt-4 text-center">
              <p class="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700">
                <QrCode class="size-3.5" /> Tunjukkan QR ini di loket pendaftaran
              </p>
              <img :src="q.qr_image" alt="QR check-in" class="mx-auto size-36 rounded-xl border border-neutral-200 bg-white">

              <div class="mt-3 border-t border-neutral-200 pt-3">
                <p class="mb-1.5 flex items-center justify-center gap-1 text-[11px] text-neutral-400">
                  Petugas tidak bisa memindai QR Anda?
                  <tippy content="Berikan HP Anda kepada petugas di loket. Petugas akan menampilkan QR di layar admin, lalu Anda memindainya dari HP ini untuk verifikasi kedatangan." trigger="mouseenter click" theme="light">
                    <CircleHelp class="size-3.5 shrink-0 cursor-help text-neutral-400" />
                  </tippy>
                </p>
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-primary-600"
                  @click="openScanner"
                >
                  <ScanLine class="size-3.5" /> Scan QR Admin
                </button>
              </div>
            </div>
            <div v-else-if="q.qr_expired" class="relative mt-3 overflow-hidden rounded-xl border-t border-neutral-100 bg-neutral-50 p-4 pt-4 text-center">
              <div class="pointer-events-none select-none blur-sm">
                <p class="mb-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <QrCode class="size-3.5" /> QR Check-in
                </p>
                <div class="mx-auto size-36 rounded-xl bg-neutral-200" />
              </div>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="rounded-full bg-neutral-800 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">Expired</span>
              </div>
            </div>

            <div v-if="q.can_cancel || q.can_revise" class="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
              <button
                v-if="q.can_revise" type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-200 py-2 text-xs font-semibold text-neutral-600"
                @click="revisingQueueId === q.id ? closeRevise() : openRevise(q)"
              >
                <PencilLine class="size-3.5" /> Ubah Layanan ({{ q.revisi_sisa }} sisa)
              </button>
              <button
                v-if="q.can_cancel" type="button"
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-red-100 py-2 text-xs font-semibold text-red-600"
                @click="cancelTarget = q"
              >
                <Ban class="size-3.5" /> Batalkan Janji
              </button>
            </div>

            <!-- Panel revisi layanan -->
            <div v-if="revisingQueueId === q.id" class="mt-3 rounded-xl bg-neutral-50 p-3">
              <AppAlert v-if="reviseError" variant="error" class="mb-2.5">{{ reviseError }}</AppAlert>

              <div v-if="layananLoading" class="flex justify-center py-6">
                <div class="size-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
              </div>
              <template v-else>
                <div class="relative mb-2">
                  <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    v-model="reviseSearch" type="text" placeholder="Cari nama layanan..."
                    class="w-full rounded-lg border-2 border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs outline-none focus:border-primary-500"
                  >
                </div>
                <div class="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
                  <button
                    v-for="cat in reviseCategories" :key="cat" type="button"
                    class="shrink-0 rounded-full border-2 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
                    :class="reviseCategory === cat ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
                    @click="reviseCategory = cat"
                  >
                    {{ cat }}
                  </button>
                </div>

                <div class="max-h-60 space-y-3 overflow-y-auto pr-1">
                  <!-- Layanan yang sudah dipilih ditaruh paling atas -- checkbox
                       langsung kelihatan untuk di-uncheck, tidak perlu dicari lagi. -->
                  <div v-if="reviseSelectedItems.length">
                    <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary-600">Dipilih ({{ reviseSelectedItems.length }})</p>
                    <label
                      v-for="l in reviseSelectedItems" :key="l.id"
                      class="mb-1.5 flex items-center justify-between rounded-lg border-2 border-primary-500 bg-primary-50 px-3 py-2 last:mb-0"
                    >
                      <span class="flex items-center gap-2">
                        <input
                          type="checkbox" class="size-4 accent-primary-600" checked
                          @change="toggleReviseLayanan(l.id)"
                        >
                        <span class="text-xs text-neutral-700">{{ l.name }}</span>
                      </span>
                      <span class="shrink-0 text-[11px] font-semibold text-neutral-500">{{ formatRupiah(Number(l.price)) }}</span>
                    </label>
                  </div>

                  <p v-if="!reviseSelectedItems.length && !reviseGroupedUnselected.size" class="py-6 text-center text-xs text-neutral-400">
                    Layanan tidak ditemukan.
                  </p>
                  <div v-for="[category, list] in reviseGroupedUnselected" :key="category">
                    <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{{ category }}</p>
                    <label
                      v-for="l in list" :key="l.id"
                      class="mb-1.5 flex items-center justify-between rounded-lg border-2 bg-white px-3 py-2 last:mb-0 border-neutral-100"
                    >
                      <span class="flex items-center gap-2">
                        <input
                          type="checkbox" class="size-4 accent-primary-600"
                          :checked="false"
                          @change="toggleReviseLayanan(l.id)"
                        >
                        <span class="text-xs text-neutral-700">{{ l.name }}</span>
                      </span>
                      <span class="shrink-0 text-[11px] font-semibold text-neutral-500">{{ formatRupiah(Number(l.price)) }}</span>
                    </label>
                  </div>
                </div>

                <div class="mt-2.5 flex items-center justify-between rounded-lg bg-white px-3 py-2">
                  <span class="text-xs font-medium text-neutral-600">Total Tagihan Setelah Diubah</span>
                  <span class="font-heading text-sm font-bold text-neutral-900">{{ formatRupiah(reviseTotalBiaya) }}</span>
                </div>

                <p class="mt-2 text-[11px] text-neutral-400">
                  Setiap layanan yang ditambah atau dihapus dihitung sebagai satu aksi revisi. Sisa kuota revisi janji ini: {{ q.revisi_sisa }}.
                </p>

                <div class="mt-2.5 grid grid-cols-2 gap-2">
                  <AppButton variant="outline" class="!py-2.5 !text-sm" @click="closeRevise">Batal</AppButton>
                  <AppButton class="!py-2.5 !text-sm" @click="openReviseConfirm(q)">Tinjau Perubahan</AppButton>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal konfirmasi perubahan layanan -->
    <Teleport to="body">
      <div v-if="showReviseConfirm && reviseTargetQueue" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" @click.self="showReviseConfirm = false">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <h2 class="font-heading text-base font-bold text-neutral-900">Konfirmasi Perubahan Layanan</h2>
          <p class="mt-1 text-xs text-neutral-500">Tinjau perubahan berikut sebelum disimpan.</p>

          <div v-if="reviseDiff.add.length" class="mt-3">
            <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-600">Ditambahkan</p>
            <p v-for="l in reviseDiff.add" :key="l.id" class="flex items-center justify-between py-0.5 text-xs">
              <span class="text-neutral-700">+ {{ l.name }}</span>
              <span class="font-medium text-neutral-600">{{ formatRupiah(Number(l.price)) }}</span>
            </p>
          </div>
          <div v-if="reviseDiff.remove.length" class="mt-3">
            <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-red-600">Dihapus</p>
            <p v-for="l in reviseDiff.remove" :key="l.id" class="flex items-center justify-between py-0.5 text-xs">
              <span class="text-neutral-500 line-through">- {{ l.name }}</span>
              <span class="font-medium text-neutral-400 line-through">{{ formatRupiah(Number(l.price)) }}</span>
            </p>
          </div>

          <div class="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
            <span class="text-xs font-medium text-neutral-600">Total Tagihan Setelah Diubah</span>
            <span class="font-heading text-sm font-bold text-neutral-900">{{ formatRupiah(reviseTotalBiaya) }}</span>
          </div>

          <p class="mt-2.5 text-[11px] text-neutral-400">
            {{ reviseDiff.add.length + reviseDiff.remove.length }} aksi revisi akan digunakan. Sisa kuota revisi janji ini setelah ini: {{ reviseTargetQueue.revisi_sisa - (reviseDiff.add.length + reviseDiff.remove.length) }}.
          </p>

          <div class="mt-4 grid grid-cols-2 gap-3">
            <AppButton variant="outline" :disabled="revising" @click="showReviseConfirm = false">Batal</AppButton>
            <AppButton :loading="revising" @click="confirmRevise">Ya, Simpan</AppButton>
          </div>
        </div>
      </div>
    </Teleport>

    <QrScannerModal v-model="showScanner" @detected="onQrDetected" />
  </div>
</template>
