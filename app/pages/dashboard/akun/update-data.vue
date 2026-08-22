<script setup lang="ts">
import { Send, Clock, History, CheckCircle2, XCircle, Hourglass } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface UpdateField {
  field_name: string
  label: string
  old_value: string | null
  new_value: string
  status: 'pending_review' | 'approved' | 'rejected'
  reviewed_at: string | null
  reviewer_name: string | null
  catatan_reviewer: string | null
}

interface UpdateBatch {
  batch_id: string
  diajukan_at: string
  status: 'pending' | 'selesai'
  fields: UpdateField[]
}

const auth = useAuthStore()
const api = useApi()
const router = useRouter()

const patient = auth.profile?.patient

const history = ref<UpdateBatch[]>([])
const historyLoading = ref(true)
const pendingBatch = computed(() => history.value.find((b) => b.status === 'pending') || null)

function formatDateTime(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

const fieldStatusLabel: Record<UpdateField['status'], string> = {
  pending_review: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

// Field boolean disimpan backend sebagai teks '1'/'0' (atau kosong) --
// tampilkan sebagai "Ya"/"Tidak" alih-alih angka mentah, konsisten dengan
// toggle Ya/Tidak yang dipakai di form pengajuan.
const BOOLEAN_FIELDS = ['is_bpjs', 'is_perokok']

function displayFieldValue(fieldName: string, value: string | null): string {
  if (BOOLEAN_FIELDS.includes(fieldName)) {
    return value === '1' ? 'Ya' : 'Tidak'
  }
  return value || 'Kosong'
}

async function loadHistory() {
  historyLoading.value = true
  try {
    history.value = await api.get('/patient-portal/profile/update-requests')
  } catch {
    // Riwayat gagal dimuat bukan penghalang -- form pengajuan tetap bisa
    // dicoba, validasi "masih ada yang pending" tetap dijaga di backend.
  } finally {
    historyLoading.value = false
  }
}

onMounted(loadHistory)

const form = reactive({
  name: patient?.name || '',
  gender: patient?.gender || '',
  tempat_lahir: patient?.tempat_lahir || '',
  tgl_lahir: patient?.tgl_lahir || '',
  golongan_darah: patient?.golongan_darah || '',
  agama: patient?.agama || '',
  status_perkawinan: patient?.status_perkawinan || '',
  pekerjaan: patient?.pekerjaan || '',
  phone: patient?.phone || '',
  email: patient?.email || '',
  fktp: patient?.fktp || '',
  alamat: patient?.alamat || '',
  rt_rw: patient?.rt_rw || '',
  kecamatan: patient?.kecamatan || '',
  kel_desa: patient?.kel_desa || '',
  is_bpjs: patient?.is_bpjs ? 'ya' : 'tidak',
  no_bpjs: patient?.no_bpjs || '',
  is_perokok: patient?.is_perokok ? 'ya' : 'tidak',
  jenis_perokok: patient?.jenis_perokok || '',
})

// Snapshot nilai AWAL (bukan reactive) -- dipakai untuk hitung field mana
// saja yang benar-benar diubah user, supaya cuma itu yang diajukan.
const original = { ...form }

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const changedFields = computed(() => {
  const changes: Record<string, string> = {}
  for (const key of Object.keys(form) as (keyof typeof form)[]) {
    if (form[key] !== original[key as keyof typeof original]) {
      // is_bpjs/is_perokok di form pakai 'ya'/'tidak' untuk UI toggle,
      // tapi field aslinya boolean -- konversi balik saat dikirim.
      if (key === 'is_bpjs' || key === 'is_perokok') {
        changes[key] = form[key] === 'ya' ? '1' : ''
      } else {
        changes[key] = form[key]
      }
    }
  }
  return changes
})

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (pendingBatch.value) {
    errorMessage.value = 'Anda masih memiliki pengajuan yang menunggu persetujuan petugas. Tunggu hingga selesai diproses sebelum mengajukan perubahan baru.'
    return
  }

  const changes = changedFields.value
  if (!Object.keys(changes).length) {
    errorMessage.value = 'Belum ada data yang diubah'
    return
  }

  loading.value = true
  try {
    const data = await api.post<{ jumlah_diajukan: number }>('/patient-portal/profile/request-update', { changes })
    successMessage.value = `${data.jumlah_diajukan} perubahan data telah diajukan, menunggu persetujuan petugas Labkesda.`
    Object.assign(original, form)
    await loadHistory()
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengajukan perubahan data'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Update Informasi Pasien" />

    <div class="px-5 pb-8">
      <AppAlert v-if="!pendingBatch" variant="info" class="mb-4">
        Perubahan yang Anda ajukan di sini tidak langsung berlaku. Petugas Labkesda akan
        memeriksa dan menyetujuinya terlebih dahulu. Anda hanya dapat mengajukan satu
        perubahan pada satu waktu, dan perlu menunggu persetujuan sebelum mengajukan lagi.
      </AppAlert>

      <AppAlert v-if="successMessage" variant="success" class="mb-4">{{ successMessage }}</AppAlert>
      <AppAlert v-if="errorMessage" variant="error" class="mb-4">{{ errorMessage }}</AppAlert>

      <!-- Pengajuan yang masih menunggu persetujuan -- form disembunyikan
           selama ini masih ada, sesuai kebijakan "satu pengajuan, tunggu
           persetujuan dulu sebelum bisa mengajukan lagi". -->
      <div v-if="pendingBatch" class="mb-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
        <div class="flex items-center gap-2 text-amber-800">
          <Hourglass class="size-5 shrink-0" />
          <h2 class="font-heading text-sm font-bold">Pengajuan Menunggu Persetujuan</h2>
        </div>
        <p class="mt-1.5 text-xs text-amber-700">
          Diajukan pada {{ formatDateTime(pendingBatch.diajukan_at) }}. Anda dapat mengajukan
          perubahan baru setelah pengajuan ini disetujui atau ditolak petugas.
        </p>
        <div class="mt-3 space-y-2">
          <div v-for="f in pendingBatch.fields" :key="f.field_name" class="rounded-xl bg-white px-3 py-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-semibold text-neutral-700">{{ f.label }}</span>
              <span class="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">Menunggu</span>
            </div>
            <p class="mt-1 text-neutral-500">
              {{ displayFieldValue(f.field_name, f.old_value) }} <span class="mx-1">→</span> <span class="text-neutral-800">{{ displayFieldValue(f.field_name, f.new_value) }}</span>
            </p>
          </div>
        </div>
      </div>

      <form v-else class="space-y-4" @submit.prevent="submit">
        <AppInput v-model="form.name" label="Nama Lengkap" />

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Jenis Kelamin</span>
            <select v-model="form.gender" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <AppInput v-model="form.tgl_lahir" label="Tanggal Lahir" type="date" />
        </div>

        <AppInput v-model="form.tempat_lahir" label="Tempat Lahir" />

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Golongan Darah</span>
            <select v-model="form.golongan_darah" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option v-for="g in ['A', 'B', 'AB', 'O', 'Tidak Tahu']" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Agama</span>
            <select v-model="form.agama" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option v-for="a in ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya']" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-neutral-700">Status Perkawinan</span>
          <select v-model="form.status_perkawinan" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
            <option value="">Pilih</option>
            <option v-for="s in ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI']" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>

        <AppInput v-model="form.pekerjaan" label="Pekerjaan" />
        <AppInput v-model="form.phone" label="Nomor HP" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" />
        <AppInput v-model="form.email" label="Email" type="email" placeholder="nama@email.com" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            FKTP
            <InfoTip text="FKTP (Fasilitas Kesehatan Tingkat Pertama) adalah puskesmas, klinik, atau dokter keluarga yang terdaftar sebagai rujukan pertama di kartu BPJS Kesehatan Anda." />
          </span>
          <FktpPicker v-model="form.fktp" />
        </div>

        <AppInput v-model="form.alamat" label="Alamat (sesuai KTP)" placeholder="Nama jalan, nomor rumah" />
        <WilayahPicker v-model:kecamatan="form.kecamatan" v-model:kel-desa="form.kel_desa" />
        <AppInput v-model="form.rt_rw" label="RT/RW" placeholder="001/002" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Kepesertaan BPJS
            <InfoTip text="Isi 'Ya' jika Anda peserta aktif BPJS Kesehatan, dan cantumkan nomor kartunya." />
          </span>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_bpjs === 'ya' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_bpjs = 'ya'"
            >
              Ya
            </button>
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_bpjs === 'tidak' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_bpjs = 'tidak'; form.no_bpjs = ''"
            >
              Tidak
            </button>
          </div>
        </div>
        <AppInput v-if="form.is_bpjs === 'ya'" v-model="form.no_bpjs" label="Nomor BPJS" placeholder="13 digit nomor kartu" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Status Merokok
            <InfoTip text="Informasi ini membantu petugas menilai faktor risiko kesehatan Anda saat pemeriksaan." />
          </span>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_perokok === 'ya' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_perokok = 'ya'"
            >
              Merokok
            </button>
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_perokok === 'tidak' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_perokok = 'tidak'; form.jenis_perokok = ''"
            >
              Tidak Merokok
            </button>
          </div>
        </div>
        <label v-if="form.is_perokok === 'ya'" class="block">
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Jenis Rokok
            <InfoTip text="Contoh: rokok filter, kretek, atau vape/rokok elektrik." />
          </span>
          <input
            v-model="form.jenis_perokok" type="text" placeholder="Contoh: Rokok Filter"
            class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500"
          >
        </label>

        <AppButton type="submit" class="w-full" :loading="loading">
          <Send class="size-4.5" /> Ajukan Perubahan
        </AppButton>
      </form>

      <!-- Riwayat pengajuan update data -->
      <div class="mt-8">
        <h2 class="font-heading mb-3 flex items-center gap-1.5 text-base font-semibold text-neutral-900">
          <History class="size-4.5 text-neutral-400" /> Riwayat Pengajuan Update Data
        </h2>

        <div v-if="historyLoading" class="space-y-3">
          <div v-for="i in 2" :key="i" class="rounded-2xl border-2 border-neutral-100 p-4">
            <div class="flex items-center justify-between">
              <SkeletonBlock class="h-3 w-32" />
              <SkeletonBlock rounded="rounded-full" class="h-5 w-16" />
            </div>
            <SkeletonBlock rounded="rounded-xl" class="mt-3 h-12 w-full" />
          </div>
        </div>

        <p v-else-if="!history.length" class="rounded-xl bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-400">
          Belum ada riwayat pengajuan perubahan data.
        </p>

        <div v-else class="space-y-3">
          <div v-for="batch in history" :key="batch.batch_id" class="rounded-2xl border-2 border-neutral-100 p-4">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
                <Clock class="size-3.5" /> {{ formatDateTime(batch.diajukan_at) }}
              </span>
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="batch.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-secondary-100 text-secondary-700'"
              >
                {{ batch.status === 'pending' ? 'Menunggu' : 'Selesai' }}
              </span>
            </div>

            <div class="mt-3 space-y-2">
              <div v-for="f in batch.fields" :key="f.field_name" class="rounded-xl bg-neutral-50 px-3 py-2 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-neutral-700">{{ f.label }}</span>
                  <span
                    class="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-medium"
                    :class="{
                      'bg-amber-100 text-amber-700': f.status === 'pending_review',
                      'bg-secondary-100 text-secondary-700': f.status === 'approved',
                      'bg-red-100 text-red-700': f.status === 'rejected',
                    }"
                  >
                    <Hourglass v-if="f.status === 'pending_review'" class="size-3" />
                    <CheckCircle2 v-else-if="f.status === 'approved'" class="size-3" />
                    <XCircle v-else class="size-3" />
                    {{ fieldStatusLabel[f.status] }}
                  </span>
                </div>
                <p class="mt-1 text-neutral-500">
                  {{ displayFieldValue(f.field_name, f.old_value) }} <span class="mx-1">→</span> <span class="text-neutral-800">{{ displayFieldValue(f.field_name, f.new_value) }}</span>
                </p>
                <p v-if="f.catatan_reviewer" class="mt-1 italic text-neutral-400">Catatan petugas: {{ f.catatan_reviewer }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
