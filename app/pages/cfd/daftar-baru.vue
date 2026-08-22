<script setup lang="ts">
import { Camera, ImageUp, RotateCcw, PartyPopper, AlertTriangle, Pencil } from 'lucide-vue-next'
import { scanKtpWithGemini, type KtpOcrResult } from '~/services/ktpOcr'
import { parseNik } from '~/utils/nik'

definePageMeta({ layout: 'guest' })

const api = useApi()
const router = useRouter()
const flow = useCfdFlow()
const auth = useAuthStore()

// Pasien yang sudah login "beranda"-nya adalah dashboard, bukan landing.
const berandaLink = computed(() => (auth.isLoggedIn ? '/dashboard' : '/'))

// Kalau halaman ini diakses langsung tanpa lewat /cfd (nik belum ada di state),
// kembalikan ke awal alur -- endpoint register-new tetap re-validasi NIK
// terlepas dari ini, ini murni supaya UX tidak membingungkan.
if (!flow.value.nik) {
  await navigateTo('/cfd')
}

type Step = 'foto' | 'form' | 'pilih' | 'sukses'
const step = ref<Step>('foto')

const fileInput = ref<HTMLInputElement | null>(null)
const cameraInput = ref<HTMLInputElement | null>(null)
const photoBase64 = ref('')
const ocrLoading = ref(false)
const ocrResult = ref<KtpOcrResult | null>(null)
const nikMismatch = ref(false)
const errorMessage = ref('')

const form = reactive({
  name: '',
  gender: '' as 'L' | 'P' | '',
  tempat_lahir: '',
  tgl_lahir: '',
  phone: '',
  alamat: '',
  rt_rw: '',
  kel_desa: '',
  kecamatan: '',
})

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function handlePhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  errorMessage.value = ''
  photoBase64.value = await readFileAsBase64(file)
  await runOcr()
}

async function runOcr() {
  ocrLoading.value = true
  errorMessage.value = ''
  try {
    const result = await scanKtpWithGemini(photoBase64.value)
    ocrResult.value = result

    nikMismatch.value = !!result.nik && result.nik !== flow.value.nik

    form.name = result.nama || ''
    form.gender = result.jenis_kelamin?.toUpperCase().startsWith('L') ? 'L' : result.jenis_kelamin ? 'P' : (flow.value.parsedGender || '')
    form.tempat_lahir = result.tempat_lahir || ''
    if (result.tanggal_lahir) {
      const [d, m, y] = result.tanggal_lahir.split('-')
      if (d && m && y) form.tgl_lahir = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    } else if (flow.value.parsedTglLahir) {
      form.tgl_lahir = flow.value.parsedTglLahir
    }
    form.alamat = result.alamat || ''
    form.rt_rw = result.rt_rw || ''
    form.kel_desa = result.kel_desa || ''
    form.kecamatan = result.kecamatan || ''

    step.value = 'form'
  } catch (err: any) {
    errorMessage.value = err?.message || 'Gagal membaca KTP secara otomatis. Anda tetap bisa mengisi data secara manual.'
    // NIK dari langkah sebelumnya tetap dipakai sebagai fallback prefill tanggal lahir/gender.
    form.gender = flow.value.parsedGender || ''
    form.tgl_lahir = flow.value.parsedTglLahir || ''
    step.value = 'form'
  } finally {
    ocrLoading.value = false
  }
}

function retakePhoto() {
  photoBase64.value = ''
  ocrResult.value = null
  step.value = 'foto'
}

// NIK terkunci secara default (hasil pindai KTP + step NIK sebelumnya) -- lihat
// catatan yang sama di app/pages/daftar/index.vue untuk alasannya.
const nikEditable = ref(false)
const nikCheckLoading = ref(false)
const nikCheckMessage = ref('')
let nikCheckTimer: ReturnType<typeof setTimeout> | undefined

async function checkNikExists() {
  nikCheckLoading.value = true
  try {
    const data = await api.post<{ status: string }>('/cfd/check-nik', { nik: flow.value.nik })
    nikCheckMessage.value = data.status !== 'not_found'
      ? 'NIK ini ternyata sudah terdaftar di SiLAKES. Kembali ke awal dan gunakan NIK tersebut langsung di halaman cek CFD.'
      : ''
  } catch {
    // Bantuan UX saja -- backend tetap validasi ulang penuh saat submit.
  } finally {
    nikCheckLoading.value = false
  }
}

watch(() => flow.value.nik, (val) => {
  nikCheckMessage.value = ''
  clearTimeout(nikCheckTimer)

  const parsed = parseNik(val)
  if (parsed.valid) {
    if (parsed.tglLahir) form.tgl_lahir = parsed.tglLahir
    if (parsed.gender) form.gender = parsed.gender
  }
  // Cek ke backend begitu sudah 16 digit, TERLEPAS dari parseNik valid atau
  // tidak di klien -- backend adalah otoritas sesungguhnya, lihat
  // checkNikExists().
  if (val.replace(/\D/g, '').length === 16) {
    nikCheckTimer = setTimeout(checkNikExists, 400)
  }
})

function goToPilih() {
  if (nikCheckMessage.value) {
    errorMessage.value = nikCheckMessage.value
    return
  }
  errorMessage.value = ''
  if (!form.name || !form.gender || !form.tempat_lahir || !form.tgl_lahir || !form.phone || !form.alamat) {
    errorMessage.value = 'Lengkapi semua data wajib sebelum melanjutkan'
    return
  }
  step.value = 'pilih'
}

const kondisiPuasa = ref<'ya' | 'tidak' | ''>('')
const kategori = ref<'asam_urat' | 'cholesterol' | ''>('')
const submitting = ref(false)
const antrianKe = ref<number | null>(null)
const noReg = ref('')
const suratHasilLabId = ref<number | null>(null)

const { status: queueStatus, start: startQueuePolling } = useCfdQueueStatus(suratHasilLabId)
const { getCurrentPosition } = useGeolocation()

async function submitRegisterNew() {
  errorMessage.value = ''
  if (!kondisiPuasa.value || !kategori.value) {
    errorMessage.value = 'Lengkapi pilihan di atas'
    return
  }

  submitting.value = true
  try {
    // Wajib berada di lokasi CFD (radius 400m) -- dicek ulang di backend.
    const { latitude, longitude } = await getCurrentPosition()

    const data = await api.post<any>('/cfd/register-new', {
      nik: flow.value.nik,
      name: form.name,
      gender: form.gender,
      tempat_lahir: form.tempat_lahir,
      tgl_lahir: form.tgl_lahir,
      phone: form.phone,
      alamat: form.alamat,
      rt_rw: form.rt_rw || null,
      kel_desa: form.kel_desa || null,
      kecamatan: form.kecamatan || null,
      ktp_base64: photoBase64.value || null,
      ocr_result: ocrResult.value,
      kondisi_puasa: kondisiPuasa.value === 'ya',
      kategori_opsional: kategori.value,
      latitude,
      longitude,
    })
    antrianKe.value = data.antrian_ke
    noReg.value = data.no_reg
    suratHasilLabId.value = data.surat_hasil_lab_id
    startQueuePolling()
    step.value = 'sukses'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Gagal mendaftar'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-6 flex flex-col items-center text-center">
      <h1 class="font-heading text-xl font-bold text-neutral-900">Daftar Pasien Baru</h1>
      <p class="mt-1 text-sm text-neutral-500">NIK Anda belum terdaftar di SiLAKES, lengkapi data berikut</p>
    </div>

    <!-- Step: foto KTP -->
    <div v-if="step === 'foto'" class="flex flex-1 flex-col">
      <AppAlert v-if="errorMessage" variant="error" class="mb-4">{{ errorMessage }}</AppAlert>

      <div class="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-6 text-center">
        <img v-if="photoBase64" :src="photoBase64" alt="Foto KTP" class="mb-4 max-h-48 rounded-lg object-contain">
        <Camera v-else class="size-12 text-neutral-300" />
        <p class="mt-3 text-sm text-neutral-500">Foto KTP diperlukan untuk verifikasi data diri Anda</p>

        <div v-if="ocrLoading" class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
          <div class="size-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          Membaca data KTP...
        </div>
      </div>

      <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handlePhoto">
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handlePhoto">

      <div class="mt-4 grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :disabled="ocrLoading" @click="cameraInput?.click()">
          <Camera class="size-4.5" /> Kamera
        </AppButton>
        <AppButton variant="outline" :disabled="ocrLoading" @click="fileInput?.click()">
          <ImageUp class="size-4.5" /> Galeri
        </AppButton>
      </div>
    </div>

    <!-- Step: konfirmasi form -->
    <form v-else-if="step === 'form'" class="space-y-4" @submit.prevent="goToPilih">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppAlert v-if="nikMismatch" variant="error">
        NIK hasil pindai KTP tidak sama dengan NIK yang Anda masukkan sebelumnya. Silakan foto ulang atau periksa kembali NIK Anda.
      </AppAlert>

      <button type="button" class="flex items-center gap-2 text-xs font-medium text-primary-600" @click="retakePhoto">
        <RotateCcw class="size-3.5" /> Foto ulang KTP
      </button>

      <AppAlert variant="info">
        <span class="flex items-start gap-1.5">
          <AlertTriangle class="size-4 mt-0.5 shrink-0" />
          Periksa kembali data di bawah, hasil baca otomatis bisa saja kurang tepat.
        </span>
      </AppAlert>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-neutral-700">NIK<span class="text-danger"> *</span></span>
        <div class="flex items-center gap-2">
          <input
            v-model="flow.nik" :disabled="!nikEditable" inputmode="numeric" maxlength="16" placeholder="16 digit sesuai KTP"
            class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] text-neutral-900 outline-none transition-colors focus:border-primary-500 disabled:bg-neutral-100 disabled:text-neutral-500"
          >
          <button
            type="button"
            class="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 text-neutral-500 active:scale-95"
            :class="nikEditable ? 'border-primary-500 bg-primary-50 text-primary-600' : 'border-neutral-200'"
            :aria-label="nikEditable ? 'Kunci NIK' : 'Ubah NIK'"
            @click="nikEditable = !nikEditable"
          >
            <Pencil class="size-4" />
          </button>
        </div>
        <p v-if="nikCheckLoading" class="mt-1.5 text-xs text-neutral-400">Memeriksa NIK...</p>
        <p v-else-if="nikCheckMessage" class="mt-1.5 text-xs font-medium text-danger">{{ nikCheckMessage }}</p>
      </div>

      <AppInput v-model="form.name" label="Nama Lengkap" placeholder="Sesuai KTP" required />
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-neutral-700">Jenis Kelamin<span class="text-danger"> *</span></span>
          <select v-model="form.gender" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </label>
        <AppInput v-model="form.tgl_lahir" label="Tanggal Lahir" type="date" required />
      </div>
      <AppInput v-model="form.tempat_lahir" label="Tempat Lahir" placeholder="Contoh: Sumenep" required />
      <AppInput v-model="form.phone" label="Nomor HP Aktif" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" required />
      <AppInput v-model="form.alamat" label="Alamat (sesuai KTP)" placeholder="Nama jalan, nomor rumah" required />
      <WilayahPicker v-model:kecamatan="form.kecamatan" v-model:kel-desa="form.kel_desa" />
      <AppInput v-model="form.rt_rw" label="RT/RW" placeholder="001/002" />

      <AppButton type="submit" class="w-full">Lanjutkan</AppButton>
    </form>

    <!-- Step: pilih kategori -->
    <form v-else-if="step === 'pilih'" class="space-y-5" @submit.prevent="submitRegisterNew">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <div>
        <p class="mb-2 text-sm font-medium text-neutral-700">Apakah Anda sedang berpuasa (belum makan/minum manis)?</p>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
            :class="kondisiPuasa === 'ya' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
            @click="kondisiPuasa = 'ya'"
          >
            Ya, Puasa
          </button>
          <button
            type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
            :class="kondisiPuasa === 'tidak' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
            @click="kondisiPuasa = 'tidak'"
          >
            Tidak
          </button>
        </div>
      </div>

      <div>
        <p class="mb-2 text-sm font-medium text-neutral-700">Pilih pemeriksaan tambahan</p>
        <div class="space-y-2">
          <button
            type="button" class="w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold"
            :class="kategori === 'asam_urat' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-neutral-200 text-neutral-600'"
            @click="kategori = 'asam_urat'"
          >
            Asam Urat
          </button>
          <button
            type="button" class="w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold"
            :class="kategori === 'cholesterol' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-neutral-200 text-neutral-600'"
            @click="kategori = 'cholesterol'"
          >
            Kolesterol
          </button>
        </div>
        <p class="mt-2 text-xs text-neutral-400">GDA/GDP dan tekanan darah (tensi) otomatis disertakan.</p>
      </div>

      <AppButton type="submit" variant="secondary" class="w-full" :loading="submitting">Daftar Sekarang</AppButton>
    </form>

    <!-- Step: sukses -->
    <div v-else-if="step === 'sukses'" class="flex flex-1 flex-col items-center justify-center text-center">
      <div class="flex size-20 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <PartyPopper class="size-10" />
      </div>
      <h2 class="font-heading mt-4 text-xl font-bold text-neutral-900">Pendaftaran Berhasil!</h2>
      <p class="mt-1 text-sm text-neutral-500">No. Registrasi Anda: <span class="font-semibold text-neutral-700">{{ noReg }}</span></p>
      <p class="mt-3 text-sm text-neutral-500">Nomor antrean Anda</p>
      <p class="font-heading mt-1 text-4xl font-extrabold text-secondary-600">{{ antrianKe }}</p>
      <p class="mt-4 max-w-xs text-sm text-neutral-500">
        Silakan tunjukkan nomor ini kepada petugas di lokasi CFD. Simpan nomor registrasi Anda untuk aktivasi akun SiLACARE nanti.
      </p>

      <div v-if="queueStatus" class="mt-5 rounded-2xl bg-neutral-50 px-6 py-4">
        <p class="text-xs text-neutral-400">Sisa antrean di depan Anda</p>
        <p class="font-heading mt-1 text-3xl font-bold tabular-nums text-primary-600">
          {{ queueStatus.status === 'pending' ? queueStatus.sisa_di_depan : 0 }}
        </p>
        <p class="mt-1 text-xs text-neutral-400">
          {{ queueStatus.status !== 'pending' ? 'Giliran Anda sudah diproses' : 'orang, diperbarui otomatis' }}
        </p>
      </div>

      <NuxtLink :to="berandaLink" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>
  </div>
</template>
