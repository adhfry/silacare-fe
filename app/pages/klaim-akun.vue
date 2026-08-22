<script setup lang="ts">
import { ShieldQuestion, Mail, PartyPopper, Ban, Pencil } from 'lucide-vue-next'

definePageMeta({ layout: 'guest', middleware: 'guest-only' })

usePageSeo({
  title: 'Klaim Akun via Email',
  description: 'Klaim akun SiLACARE dengan menyambungkannya ke email, untuk nomor HP SiLAKES yang bukan WhatsApp aktif.',
})

const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

type Step = 'challenge' | 'blocked' | 'email' | 'code' | 'password'

const { state: flow, clear: clearFlow } = usePersistedFlow('klaim-akun', {
  step: 'challenge' as Step,
  nik: '',
  phone: '',
  challengeToken: '',
  claimToken: '',
  email: '',
  emailChanged: false,
  // Timestamp ABSOLUT, sama pola dengan daftar/index.vue -- countdown tetap
  // akurat walau user pindah halaman/app lalu balik lagi.
  otpCooldownUntil: null as string | null,
  activationToken: '',
})

const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')

const nowTick = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(tickTimer))

function formatCooldown(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} detik`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`
}

interface ClaimApiErrorData {
  status?: 'cooldown' | 'blocked' | 'expired' | 'wrong'
  cooldown_until?: string
  attempts_left?: number
  round?: number
}
function extraOf(err: unknown): ClaimApiErrorData | undefined {
  if (!(err instanceof ApiError)) return undefined
  return err.fieldErrors as unknown as ClaimApiErrorData | undefined
}

// ---------- Step: challenge (tebak posisi NIK+HP) ----------
interface ChallengeField { length: number; blank_positions: number[] }
const challengeData = ref<{ nik: ChallengeField; phone: ChallengeField } | null>(null)
const nikGuess = reactive<Record<number, string>>({})
const phoneGuess = reactive<Record<number, string>>({})
const challengeCooldownUntil = ref<string | null>(null)
const attemptsLeft = ref<number | null>(null)
const attemptsRound = ref<number | null>(null)

function boxesFor(field: ChallengeField) {
  const blanks = new Set(field.blank_positions)
  return Array.from({ length: field.length }, (_, i) => ({ position: i, isBlank: blanks.has(i) }))
}

const challengeCooldownRemaining = computed(() => {
  if (!challengeCooldownUntil.value) return 0
  const remaining = Math.ceil((new Date(challengeCooldownUntil.value).getTime() - nowTick.value) / 1000)
  return Math.max(0, remaining)
})

async function startChallenge() {
  errorMessage.value = ''
  loading.value = true
  try {
    const data = await api.post<{
      challenge_token: string
      nik: ChallengeField
      phone: ChallengeField
      cooldown_until: string | null
    }>('/patient-portal/claim/start', { nik: flow.nik, phone: flow.phone })

    flow.challengeToken = data.challenge_token
    challengeData.value = { nik: data.nik, phone: data.phone }
    if (data.cooldown_until) challengeCooldownUntil.value = data.cooldown_until

    for (const key of Object.keys(nikGuess)) delete nikGuess[Number(key)]
    for (const key of Object.keys(phoneGuess)) delete phoneGuess[Number(key)]
    for (const p of data.nik.blank_positions) nikGuess[p] = ''
    for (const p of data.phone.blank_positions) phoneGuess[p] = ''
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const qNik = route.query.nik as string | undefined
  const qPhone = route.query.phone as string | undefined
  if (qNik && !flow.nik) flow.nik = qNik
  if (qPhone && !flow.phone) flow.phone = qPhone

  if (flow.step === 'challenge' && !challengeData.value) {
    startChallenge()
  }
})

async function submitChallenge() {
  errorMessage.value = ''
  attemptsLeft.value = null
  loading.value = true
  try {
    const data = await api.post<{ claim_token: string; expires_at: string }>('/patient-portal/claim/verify-challenge', {
      challenge_token: flow.challengeToken,
      nik_digits: { ...nikGuess },
      phone_digits: { ...phoneGuess },
    })
    flow.claimToken = data.claim_token
    flow.step = 'email'
  } catch (err) {
    const extra = extraOf(err)
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'

    if (extra?.status === 'cooldown') {
      challengeCooldownUntil.value = extra.cooldown_until ?? null
    } else if (extra?.status === 'blocked') {
      flow.step = 'blocked'
    } else if (extra?.status === 'expired') {
      clearFlow()
      flow.nik = (route.query.nik as string) || ''
      flow.phone = (route.query.phone as string) || ''
      challengeData.value = null
      await startChallenge()
    } else {
      attemptsLeft.value = extra?.attempts_left ?? null
      attemptsRound.value = extra?.round ?? null
    }
  } finally {
    loading.value = false
  }
}

// ---------- Step: email ----------
async function submitEmail() {
  errorMessage.value = ''
  if (!/^\S+@\S+\.\S+$/.test(flow.email)) {
    errorMessage.value = 'Masukkan alamat email yang valid'
    return
  }

  loading.value = true
  try {
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/claim/request-email-code', { claim_token: flow.claimToken, email: flow.email })

    if (data.cooldown_until) flow.otpCooldownUntil = data.cooldown_until

    infoMessage.value = data.otp_sent
      ? 'Kode verifikasi telah dikirim ke email Anda.'
      : data.reason === 'too_many_requests'
        ? 'Terlalu sering meminta kode. Demi keamanan, mohon tunggu sebelum mencoba lagi.'
        : 'Kode sebelumnya masih berlaku. Tunggu sebentar sebelum mengirim ulang.'

    flow.step = 'code'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

const resendCooldown = computed(() => {
  if (!flow.otpCooldownUntil) return 0
  const remaining = Math.ceil((new Date(flow.otpCooldownUntil).getTime() - nowTick.value) / 1000)
  return Math.max(0, remaining)
})

async function resendEmailCode() {
  errorMessage.value = ''
  try {
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/claim/request-email-code', { claim_token: flow.claimToken, email: flow.email })

    if (data.cooldown_until) flow.otpCooldownUntil = data.cooldown_until
    infoMessage.value = data.otp_sent
      ? 'Kode verifikasi telah dikirim ke email Anda.'
      : data.reason === 'too_many_requests'
        ? 'Terlalu sering meminta kode. Demi keamanan, mohon tunggu sebelum mencoba lagi.'
        : 'Kode sebelumnya masih berlaku. Tunggu sebentar sebelum mengirim ulang.'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengirim kode'
  }
}

// ---------- Step: code (verifikasi kode email + ganti email 1x) ----------
const otpCode = ref('')
async function verifyEmailCode() {
  errorMessage.value = ''
  if (!/^\d{6}$/.test(otpCode.value)) {
    errorMessage.value = 'Kode harus 6 digit'
    return
  }
  loading.value = true
  try {
    const data = await api.post<{ activation_token: string }>('/patient-portal/claim/verify-email-code', {
      claim_token: flow.claimToken,
      otp_code: otpCode.value,
    })
    flow.activationToken = data.activation_token
    flow.step = 'password'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Kode tidak valid'
  } finally {
    loading.value = false
  }
}

const showChangeEmailModal = ref(false)
const changeEmailDraft = ref('')
function openChangeEmailModal() {
  changeEmailDraft.value = flow.email
  showChangeEmailModal.value = true
}
async function confirmChangeEmail() {
  errorMessage.value = ''
  if (!/^\S+@\S+\.\S+$/.test(changeEmailDraft.value)) {
    errorMessage.value = 'Masukkan alamat email yang valid'
    return
  }
  loading.value = true
  try {
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/claim/change-email', { claim_token: flow.claimToken, new_email: changeEmailDraft.value })

    flow.email = changeEmailDraft.value
    flow.emailChanged = true
    if (data.cooldown_until) flow.otpCooldownUntil = data.cooldown_until
    infoMessage.value = 'Kode verifikasi baru telah dikirim ke email yang diperbarui.'
    otpCode.value = ''
    showChangeEmailModal.value = false
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengubah email'
  } finally {
    loading.value = false
  }
}

// ---------- Step: set password ----------
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
    const data = await api.post<any>('/patient-portal/claim/activate', {
      activation_token: flow.activationToken,
      password: password.value,
      password_confirmation: passwordConfirm.value,
    })
    auth.setToken(data.token)
    auth.setProfile(data.profile)
    clearFlow()
    await router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-6 flex flex-col items-center text-center">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Mail class="size-8" />
      </div>
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Klaim Akun via Email</h1>
      <p class="mt-1 text-sm text-neutral-500">Untuk nomor HP SiLAKES yang bukan WhatsApp aktif</p>
    </div>

    <!-- Step: rintangan tebak NIK+HP -->
    <div v-if="flow.step === 'challenge'" class="space-y-5 animate-rise">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <div v-if="challengeData" class="space-y-5">
        <div class="flex items-start gap-2 rounded-xl bg-primary-50 p-3 text-xs text-primary-700">
          <ShieldQuestion class="size-4 shrink-0 mt-0.5" />
          <span>Sebagai verifikasi tambahan, lengkapi digit yang kosong sesuai NIK dan nomor HP yang baru saja Anda masukkan.</span>
        </div>

        <div>
          <p class="mb-2 text-center text-sm font-semibold text-neutral-700">NIK</p>
          <div class="flex flex-wrap justify-center gap-1.5">
            <template v-for="box in boxesFor(challengeData.nik)" :key="`nik-${box.position}`">
              <input
                v-if="box.isBlank"
                v-model="nikGuess[box.position]"
                maxlength="1" inputmode="numeric"
                class="size-8 rounded-lg border-2 border-primary-400 text-center text-sm font-bold text-primary-700 outline-none focus:border-primary-600"
              >
              <div v-else class="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-sm font-bold text-neutral-300">•</div>
            </template>
          </div>
        </div>

        <div>
          <p class="mb-1 text-center text-sm font-semibold text-neutral-700">Nomor HP</p>
          <p class="mb-2 text-center text-xs text-neutral-400">Format 62xxxxxxxxxx (2 digit pertama selalu "62")</p>
          <div class="flex flex-wrap justify-center gap-1.5">
            <template v-for="box in boxesFor(challengeData.phone)" :key="`phone-${box.position}`">
              <input
                v-if="box.isBlank"
                v-model="phoneGuess[box.position]"
                maxlength="1" inputmode="numeric"
                class="size-8 rounded-lg border-2 border-primary-400 text-center text-sm font-bold text-primary-700 outline-none focus:border-primary-600"
              >
              <div v-else class="flex size-8 items-center justify-center rounded-lg bg-neutral-100 text-sm font-bold text-neutral-300">•</div>
            </template>
          </div>
        </div>

        <p v-if="attemptsLeft !== null" class="text-center text-xs text-amber-600">
          Tebakan belum tepat. Sisa percobaan: {{ attemptsLeft }}{{ attemptsRound === 2 ? ' (putaran terakhir)' : '' }}.
        </p>

        <AppButton
          class="w-full" :loading="loading"
          :disabled="challengeCooldownRemaining > 0"
          @click="submitChallenge"
        >
          {{ challengeCooldownRemaining > 0 ? `Coba lagi dalam ${formatCooldown(challengeCooldownRemaining)}` : 'Verifikasi' }}
        </AppButton>
      </div>

      <div v-else class="flex justify-center py-10">
        <SkeletonBlock class="h-4 w-48" />
      </div>
    </div>

    <!-- Step: diblokir permanen -->
    <div v-else-if="flow.step === 'blocked'" class="flex flex-1 flex-col items-center justify-center text-center animate-rise">
      <div class="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Ban class="size-8" />
      </div>
      <h2 class="font-heading mt-4 text-lg font-bold text-neutral-900">Klaim Akun Diblokir</h2>
      <p class="mt-2 max-w-xs text-sm text-neutral-500">
        Terlalu banyak percobaan yang salah. Klaim akun untuk data ini telah diblokir permanen dari perangkat/jaringan Anda.
        Silakan hubungi Labkesda untuk bantuan lebih lanjut.
      </p>
      <NuxtLink to="/" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>

    <!-- Step: isi email -->
    <form v-else-if="flow.step === 'email'" class="space-y-4 animate-rise" @submit.prevent="submitEmail">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <p class="text-sm text-neutral-500">Masukkan alamat email yang aktif untuk menerima kode verifikasi.</p>
      <AppInput v-model="flow.email" label="Alamat Email" type="email" placeholder="nama@email.com" required />
      <AppButton type="submit" class="w-full" :loading="loading">Kirim Kode Verifikasi</AppButton>
    </form>

    <!-- Step: verifikasi kode email -->
    <div v-else-if="flow.step === 'code'" class="space-y-4 animate-rise">
      <p class="text-center text-sm text-neutral-500">
        Kode verifikasi telah dikirim ke <span class="font-semibold text-neutral-700">{{ flow.email }}</span>.
        <template v-if="!flow.emailChanged">
          Salah ketik email?
          <button type="button" class="font-semibold text-primary-600 underline underline-offset-2" @click="openChangeEmailModal">
            Ubah email
          </button>.
        </template>
      </p>
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppAlert v-else-if="infoMessage" variant="info">{{ infoMessage }}</AppAlert>
      <form class="space-y-4" @submit.prevent="verifyEmailCode">
        <AppInput v-model="otpCode" label="Kode Verifikasi" inputmode="numeric" :maxlength="6" placeholder="6 digit dari email" required />
        <AppButton type="submit" class="w-full" :loading="loading">Verifikasi</AppButton>
      </form>
      <button
        class="w-full text-center text-sm font-medium text-primary-600 disabled:text-neutral-400"
        :disabled="resendCooldown > 0" @click="resendEmailCode"
      >
        {{ resendCooldown > 0 ? `Kirim ulang dalam ${formatCooldown(resendCooldown)}` : 'Kirim ulang kode' }}
      </button>
    </div>

    <!-- Step: set password -->
    <form v-else-if="flow.step === 'password'" class="space-y-4 animate-rise" @submit.prevent="activate">
      <div class="flex items-center gap-2.5 rounded-xl bg-secondary-50 px-4 py-3 text-sm font-medium text-secondary-700">
        <PartyPopper class="size-4.5 shrink-0" /> Email terverifikasi. Buat kata sandi untuk akun Anda.
      </div>
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput v-model="password" label="Kata Sandi Baru" type="password" placeholder="Minimal 8 karakter" required show-toggle />
      <AppInput v-model="passwordConfirm" label="Ulangi Kata Sandi" type="password" placeholder="Ketik ulang kata sandi" required show-toggle />
      <AppButton type="submit" class="w-full" :loading="loading">Aktifkan Akun</AppButton>
    </form>

    <!-- Modal konfirmasi ganti email (hanya 1x per sesi) -->
    <Teleport to="body">
      <div v-if="showChangeEmailModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div class="w-full max-w-sm rounded-2xl bg-white p-5">
          <h3 class="font-heading flex items-center gap-1.5 text-base font-bold text-neutral-900">
            <Pencil class="size-4.5" /> Ubah Alamat Email
          </h3>
          <p class="mt-2 text-xs text-neutral-500">
            Email hanya bisa diubah SEKALI untuk sesi klaim ini. Pastikan alamat di bawah sudah benar sebelum melanjutkan.
          </p>
          <AppInput v-model="changeEmailDraft" label="Email Baru" type="email" placeholder="nama@email.com" class="mt-4" required />
          <div class="mt-5 flex gap-3">
            <button
              type="button" class="flex-1 rounded-xl border-2 border-neutral-200 py-3 text-sm font-semibold text-neutral-600"
              @click="showChangeEmailModal = false"
            >
              Batal
            </button>
            <button
              type="button" class="flex-1 rounded-xl bg-primary-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
              :disabled="loading" @click="confirmChangeEmail"
            >
              {{ loading ? 'Memproses...' : 'Ya, Ini Benar' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
