<script setup lang="ts">
import { ShieldCheck, Camera, ImageUp, RotateCcw, AlertTriangle, PartyPopper, Pencil } from 'lucide-vue-next'
import { parseNik } from '~/utils/nik'

definePageMeta({ layout: 'guest', middleware: 'guest-only' })

usePageSeo({
  title: 'Daftar Akun',
  description: 'Buat akun SiLACARE untuk mengakses riwayat pemeriksaan lab dan antrean online di UPTD Labkesda Kabupaten Sumenep.',
})

const api = useApi()
const auth = useAuthStore()
const router = useRouter()

type Step = 'identity' | 'otp' | 'password' | 'has_account' | 'new-photo' | 'new-form'

const { state: flow, clear: clearFlow } = usePersistedFlow('daftar', {
  step: 'identity' as Step,
  nik: '',
  phone: '',
  activationToken: '',
  newPatientForm: null as null | Record<string, string>,
  // Timestamp ABSOLUT (ISO string), bukan detik hitung-mundur -- supaya jeda
  // kirim-ulang OTP tetap akurat walau user pindah halaman/app lalu balik lagi
  // (skenario nyata: isi NIK+HP, buka WhatsApp lihat kode, balik ke sini).
  // Backend yang menentukan nilainya (jeda progresif, lihat OtpAbuseGuard).
  otpCooldownUntil: null as string | null,
})

const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

// Detik sisa dihitung ULANG setiap detik dari selisih terhadap otpCooldownUntil
// yang tersimpan -- bukan disimpan sebagai angka mundur sendiri, jadi selalu
// akurat berapa pun lama halaman ini tidak aktif.
const nowTick = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(tickTimer))

const resendCooldown = computed(() => {
  if (!flow.otpCooldownUntil) return 0
  const remaining = Math.ceil((new Date(flow.otpCooldownUntil).getTime() - nowTick.value) / 1000)
  return Math.max(0, remaining)
})

function formatCooldown(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} detik`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`
}

// Nomor HP diformat +62 untuk ditampilkan di layar konfirmasi step OTP.
const displayPhone = computed(() => {
  const digits = flow.phone.replace(/\D/g, '')
  const local = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('62') ? digits.slice(2) : digits
  return `+62 ${local}`
})

function changePhoneNumber() {
  // Kembali ke step identitas untuk koreksi -- NIK dipertahankan (kemungkinan
  // besar sudah benar), hanya nomor HP yang salah ketik. Batalkan juga
  // cooldown yang sedang berjalan supaya tidak membingungkan saat kembali ke
  // step OTP dengan nomor yang berbeda.
  flow.otpCooldownUntil = null
  flow.step = 'identity'
}

// ---------- Step 1: NIK + HP ----------
async function checkIdentity() {
  errorMessage.value = ''
  if (!/^\d{16}$/.test(flow.nik)) {
    errorMessage.value = 'NIK harus 16 digit angka'
    return
  }
  if (!flow.phone) {
    errorMessage.value = 'Nomor HP wajib diisi'
    return
  }

  loading.value = true
  try {
    const data = await api.post<{ status: string }>('/patient-portal/auth/check-identity', {
      nik: flow.nik,
      phone: flow.phone,
    })

    if (data.status === 'need_activation') {
      await requestOtp()
      flow.step = 'otp'
    } else if (data.status === 'has_account') {
      flow.step = 'has_account'
    } else if (data.status === 'not_found') {
      flow.step = 'new-photo'
    } else {
      errorMessage.value = 'Data tidak dapat diverifikasi. Silakan hubungi Labkesda.'
    }
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

// ---------- Step 2: OTP (pasien lama) ----------
async function requestOtp() {
  errorMessage.value = ''
  try {
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/auth/request-otp', { nik: flow.nik, phone: flow.phone })

    // Backend SELALU mengirim cooldown_until (baik terkirim, baik masih dalam
    // jeda per-pasien, maupun kena jeda progresif per-IP) -- disimpan ke state
    // persisted supaya countdown tetap akurat walau halaman ditinggal/refresh.
    if (data.cooldown_until) flow.otpCooldownUntil = data.cooldown_until

    if (data.otp_sent) {
      infoMessage.value = 'Kode OTP telah dikirim melalui WhatsApp ke nomor Anda.'
    } else if (data.reason === 'too_many_requests') {
      infoMessage.value = 'Terlalu sering meminta kode OTP. Demi keamanan, mohon tunggu sebelum mencoba lagi.'
    } else {
      infoMessage.value = 'Kode OTP sebelumnya masih berlaku. Tunggu sebentar sebelum mengirim ulang.'
    }
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengirim OTP'
  }
}

const otpCode = ref('')
async function verifyOtp() {
  errorMessage.value = ''
  if (!/^\d{6}$/.test(otpCode.value)) {
    errorMessage.value = 'Kode OTP harus 6 digit'
    return
  }
  loading.value = true
  try {
    const data = await api.post<{ activation_token: string }>('/patient-portal/auth/verify-otp', {
      nik: flow.nik,
      phone: flow.phone,
      otp_code: otpCode.value,
    })
    flow.activationToken = data.activation_token
    flow.step = 'password'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Kode OTP tidak valid'
  } finally {
    loading.value = false
  }
}

// ---------- Step 3: set password (pasien lama) ----------
const password = ref('')
const passwordConfirm = ref('')
async function activate() {
  errorMessage.value = ''
  if (password.value.length < 8) {
    errorMessage.value = 'Kata sandi minimal 8 karakter'
    return
  }
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok'
    return
  }
  loading.value = true
  try {
    const data = await api.post('/patient-portal/auth/activate', {
      activation_token: flow.activationToken,
      password: password.value,
      password_confirmation: passwordConfirm.value,
    })
    auth.setToken(data.token)
    auth.setProfile(data.profile)
    clearFlow()
    await router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengaktifkan akun'
  } finally {
    loading.value = false
  }
}

// ---------- Step 4-5: pasien BARU (foto KTP -> form -> password, TANPA OTP) ----------
const scan = useKtpScan(() => flow.nik)
const cameraInput = ref<HTMLInputElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

async function onPhoto(event: Event) {
  await scan.handlePhoto(event, () => {
    if (flow.newPatientForm) Object.assign(scan.form, flow.newPatientForm)
    flow.step = 'new-form'
  })
}

function retake() {
  scan.retakePhoto()
  flow.step = 'new-photo'
}

const newPhone = ref('')
const newPassword = ref('')
const newPasswordConfirm = ref('')

// NIK di step 'new-form' terkunci secara default (hasil pindai KTP + step
// identitas sebelumnya) -- OCR tidak selalu sempurna, jadi disediakan tombol
// pensil untuk membuka kunci kalau user perlu mengoreksi. Setiap kali NIK
// berubah jadi 16 digit valid, tanggal lahir & jenis kelamin disinkronkan
// ulang dari NIK, dan NIK dicek ulang ke backend (siapa tahu ternyata sudah
// terdaftar) -- supaya koreksi manual tidak diam-diam membuat data pasien
// baru yang sebenarnya duplikat dari pasien yang sudah ada.
const nikEditable = ref(false)
const nikCheckLoading = ref(false)
const nikCheckMessage = ref('')
let nikCheckTimer: ReturnType<typeof setTimeout> | undefined

async function checkNikExists() {
  nikCheckLoading.value = true
  try {
    const data = await api.post<{ status: string }>('/cfd/check-nik', { nik: flow.nik })
    nikCheckMessage.value = data.status !== 'not_found'
      ? 'NIK ini ternyata sudah terdaftar di SiLAKES. Kembali ke awal dan gunakan alur masuk/aktivasi akun, bukan daftar pasien baru.'
      : ''
  } catch {
    // Pengecekan ini bersifat bantuan UX, bukan validasi wajib -- kalau gagal
    // (mis. jaringan), submit tetap akan divalidasi ulang penuh di backend.
  } finally {
    nikCheckLoading.value = false
  }
}

watch(() => flow.nik, (val) => {
  nikCheckMessage.value = ''
  clearTimeout(nikCheckTimer)

  const parsed = parseNik(val)
  if (parsed.valid) {
    if (parsed.tglLahir) scan.form.tgl_lahir = parsed.tglLahir
    if (parsed.gender) scan.form.gender = parsed.gender
  }
  // Cek ke backend begitu sudah 16 digit, TERLEPAS dari parseNik valid atau
  // tidak di klien -- backend adalah otoritas sesungguhnya (mis. NIK lama di
  // data existing yang formatnya sedikit ganjil tapi tetap NIK asli), lihat
  // checkNikExists().
  if (val.replace(/\D/g, '').length === 16) {
    nikCheckTimer = setTimeout(checkNikExists, 400)
  }
})

function goToNewForm() {
  // Kalau OCR gagal total, user tetap bisa lanjut isi manual.
  flow.step = 'new-form'
}

// Kalau halaman ini di-refresh TEPAT saat di step 'new-form' (foto sengaja
// tidak dipersist, lihat usePersistedFlow), foto KTP di composable jadi
// kosong lagi -- kembalikan ke step foto (bukan dari NIK dari awal), field
// yang sudah diisi tetap dikembalikan dari snapshot.
onMounted(() => {
  if (flow.step === 'new-form') {
    if (flow.newPatientForm) Object.assign(scan.form, flow.newPatientForm)
    if (!scan.photoBase64.value) {
      infoMessage.value = 'Silakan foto ulang KTP Anda untuk melanjutkan (data yang sudah diisi tetap tersimpan).'
      flow.step = 'new-photo'
    }
  }
})

async function submitNewPatient() {
  errorMessage.value = ''
  if (nikCheckMessage.value) {
    errorMessage.value = nikCheckMessage.value
    return
  }
  const f = scan.form
  if (!f.name || !f.gender || !f.tempat_lahir || !f.tgl_lahir || !f.alamat) {
    errorMessage.value = 'Lengkapi semua data wajib'
    return
  }
  if (!newPhone.value) {
    errorMessage.value = 'Nomor HP wajib diisi'
    return
  }
  if (newPassword.value.length < 8) {
    errorMessage.value = 'Kata sandi minimal 8 karakter'
    return
  }
  if (newPassword.value !== newPasswordConfirm.value) {
    errorMessage.value = 'Konfirmasi kata sandi tidak cocok'
    return
  }
  if (!scan.photoBase64.value) {
    errorMessage.value = 'Foto KTP wajib dilampirkan'
    return
  }

  // Simpan progres form (kecuali foto) sebelum submit, jaga-jaga request gagal.
  flow.newPatientForm = { ...f }

  loading.value = true
  try {
    const data = await api.post('/patient-portal/auth/register-new', {
      nik: flow.nik,
      name: f.name,
      gender: f.gender,
      tempat_lahir: f.tempat_lahir,
      tgl_lahir: f.tgl_lahir,
      phone: newPhone.value,
      alamat: f.alamat,
      rt_rw: f.rt_rw || null,
      kel_desa: f.kel_desa || null,
      kecamatan: f.kecamatan || null,
      ktp_base64: scan.photoBase64.value,
      ocr_result: scan.ocrResult.value,
      password: newPassword.value,
      password_confirmation: newPasswordConfirm.value,
    })
    auth.setToken(data.token)
    auth.setProfile(data.profile)
    clearFlow()
    await router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mendaftar'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-6 flex flex-col items-center text-center animate-rise">
      <AppLogo size-class="h-16 w-16" />
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Daftar Akun SiLACARE</h1>
      <p class="mt-1 text-sm text-neutral-500">Masukkan NIK Anda untuk memulai</p>
    </div>

    <!-- Step: identitas -->
    <form v-if="flow.step === 'identity'" class="space-y-4 animate-rise" @submit.prevent="checkIdentity">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput v-model="flow.nik" label="NIK" inputmode="numeric" :maxlength="16" placeholder="16 digit sesuai KTP" required />
      <AppInput v-model="flow.phone" label="Nomor HP" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" required />
      <AppButton type="submit" variant="secondary" class="w-full" :loading="loading">Lanjutkan</AppButton>
      <p class="text-center text-sm text-neutral-500">
        Sudah punya akun? <NuxtLink to="/login" class="font-semibold text-primary-600">Masuk</NuxtLink>
      </p>
    </form>

    <!-- Step: OTP (pasien yang datanya sudah ada di SiLAKES) -->
    <div v-else-if="flow.step === 'otp'" class="space-y-4 animate-rise">
      <p class="text-center text-sm text-neutral-500">
        Apakah nomor <span class="font-semibold text-neutral-700">{{ displayPhone }}</span> ini adalah nomor Anda?
        Jika bukan,
        <button type="button" class="font-semibold text-primary-600 underline underline-offset-2" @click="changePhoneNumber">
          ubah nomor sekarang
        </button>.
      </p>
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppAlert v-else-if="infoMessage" variant="info">{{ infoMessage }}</AppAlert>
      <form class="space-y-4" @submit.prevent="verifyOtp">
        <AppInput v-model="otpCode" label="Kode OTP" inputmode="numeric" :maxlength="6" placeholder="6 digit dari WhatsApp" required />
        <AppButton type="submit" class="w-full" :loading="loading">Verifikasi</AppButton>
      </form>
      <button
        class="w-full text-center text-sm font-medium text-primary-600 disabled:text-neutral-400"
        :disabled="resendCooldown > 0" @click="requestOtp"
      >
        {{ resendCooldown > 0 ? `Kirim ulang dalam ${formatCooldown(resendCooldown)}` : 'Kirim ulang kode OTP' }}
      </button>
    </div>

    <!-- Step: set password (pasien lama) -->
    <form v-else-if="flow.step === 'password'" class="space-y-4 animate-rise" @submit.prevent="activate">
      <div class="flex items-center gap-2.5 rounded-xl bg-secondary-50 px-4 py-3 text-sm font-medium text-secondary-700">
        <ShieldCheck class="size-4.5 shrink-0" /> Nomor WhatsApp terverifikasi. Buat kata sandi untuk akun Anda.
      </div>
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput v-model="password" label="Kata Sandi Baru" type="password" placeholder="Minimal 8 karakter" required />
      <AppInput v-model="passwordConfirm" label="Ulangi Kata Sandi" type="password" placeholder="Ketik ulang kata sandi" required />
      <AppButton type="submit" class="w-full" :loading="loading">Aktifkan Akun</AppButton>
    </form>

    <!-- Step: sudah punya akun -->
    <div v-else-if="flow.step === 'has_account'" class="space-y-4 text-center animate-rise">
      <p class="text-sm text-neutral-600">Akun untuk data ini sudah pernah dibuat sebelumnya.</p>
      <NuxtLink to="/login" class="block"><AppButton class="w-full">Masuk ke Akun</AppButton></NuxtLink>
      <button class="text-sm font-medium text-neutral-500" @click="flow.step = 'identity'">Kembali</button>
    </div>

    <!-- Step: foto KTP (pasien baru) -->
    <div v-else-if="flow.step === 'new-photo'" class="flex flex-1 flex-col animate-rise">
      <AppAlert variant="info" class="mb-4">
        {{ infoMessage || 'NIK Anda belum terdaftar di SiLAKES — tidak masalah, mari lengkapi data untuk mendaftar sebagai pasien baru.' }}
      </AppAlert>
      <AppAlert v-if="scan.errorMessage.value" variant="error" class="mb-4">{{ scan.errorMessage.value }}</AppAlert>

      <div class="flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 bg-white p-6 text-center">
        <img v-if="scan.photoBase64.value" :src="scan.photoBase64.value" alt="Foto KTP" class="mb-4 max-h-48 rounded-lg object-contain">
        <Camera v-else class="size-12 text-neutral-300" />
        <p class="mt-3 text-sm text-neutral-500">Foto KTP diperlukan untuk mengisi data secara otomatis</p>
        <div v-if="scan.ocrLoading.value" class="mt-4 flex items-center gap-2 text-sm font-medium text-primary-600">
          <div class="size-4 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          Membaca data KTP...
        </div>
      </div>

      <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="hidden" @change="onPhoto">
      <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPhoto">

      <div class="mt-4 grid grid-cols-2 gap-3">
        <AppButton variant="secondary" :disabled="scan.ocrLoading.value" @click="cameraInput?.click()">
          <Camera class="size-4.5" /> Kamera
        </AppButton>
        <AppButton variant="outline" :disabled="scan.ocrLoading.value" @click="fileInput?.click()">
          <ImageUp class="size-4.5" /> Galeri
        </AppButton>
      </div>
      <button class="mt-4 text-center text-sm font-medium text-neutral-500" @click="flow.step = 'identity'">
        Kembali ke NIK
      </button>
    </div>

    <!-- Step: form pasien baru -->
    <form v-else-if="flow.step === 'new-form'" class="space-y-4 animate-rise" @submit.prevent="submitNewPatient">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppAlert v-if="scan.nikMismatch.value" variant="error">
        NIK hasil pindai KTP tidak sama dengan NIK yang Anda masukkan. Silakan foto ulang atau periksa kembali.
      </AppAlert>

      <button type="button" class="flex items-center gap-2 text-xs font-medium text-primary-600" @click="retake">
        <RotateCcw class="size-3.5" /> Foto ulang KTP
      </button>

      <AppAlert variant="info">
        <span class="flex items-start gap-1.5">
          <AlertTriangle class="size-4 mt-0.5 shrink-0" /> Periksa kembali data di bawah, hasil baca otomatis bisa saja kurang tepat.
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

      <AppInput v-model="scan.form.name" label="Nama Lengkap" placeholder="Sesuai KTP" required />
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-neutral-700">Jenis Kelamin<span class="text-danger"> *</span></span>
          <select v-model="scan.form.gender" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
            <option value="">Pilih</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </label>
        <AppInput v-model="scan.form.tgl_lahir" label="Tanggal Lahir" type="date" required />
      </div>
      <AppInput v-model="scan.form.tempat_lahir" label="Tempat Lahir" placeholder="Contoh: Sumenep" required />
      <AppInput v-model="newPhone" label="Nomor HP Aktif" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" hint="Tidak perlu verifikasi OTP untuk pendaftaran pasien baru" required />
      <AppInput v-model="scan.form.alamat" label="Alamat (sesuai KTP)" placeholder="Nama jalan, nomor rumah" required />
      <WilayahPicker v-model:kecamatan="scan.form.kecamatan" v-model:kel-desa="scan.form.kel_desa" />
      <AppInput v-model="scan.form.rt_rw" label="RT/RW" placeholder="001/002" />

      <div class="border-t border-neutral-100 pt-4">
        <AppInput v-model="newPassword" label="Buat Kata Sandi" type="password" placeholder="Minimal 8 karakter" class="mb-4" required />
        <AppInput v-model="newPasswordConfirm" label="Ulangi Kata Sandi" type="password" placeholder="Ketik ulang kata sandi" required />
      </div>

      <AppButton type="submit" variant="secondary" class="w-full" :loading="loading">Daftar Sekarang</AppButton>
    </form>
  </div>
</template>
