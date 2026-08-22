<script setup lang="ts">
import { KeyRound } from 'lucide-vue-next'

definePageMeta({ layout: 'guest', middleware: 'guest-only' })

usePageSeo({
  title: 'Lupa Kata Sandi',
  description: 'Atur ulang kata sandi akun SiLACARE Anda dengan verifikasi NIK dan nomor HP terdaftar.',
})

const api = useApi()
const auth = useAuthStore()
const router = useRouter()

type Step = 'identity' | 'otp' | 'password'

const { state: flow, clear: clearFlow } = usePersistedFlow('lupa-password', {
  step: 'identity' as Step,
  nik: '',
  phone: '',
  resetToken: '',
  // Timestamp absolut, bukan detik hitung-mundur -- pola sama seperti
  // /daftar (lihat catatan di sana), supaya jeda kirim-ulang OTP tetap
  // akurat walau halaman ditinggal/di-refresh.
  otpCooldownUntil: null as string | null,
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

const displayPhone = computed(() => {
  const digits = flow.phone.replace(/\D/g, '')
  const local = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('62') ? digits.slice(2) : digits
  return `+62 ${local}`
})

function changePhoneNumber() {
  flow.otpCooldownUntil = null
  flow.step = 'identity'
}

// ---------- Step 1: NIK + HP ----------
async function requestReset() {
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
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/auth/request-password-reset', { nik: flow.nik, phone: flow.phone })

    if (data.cooldown_until) flow.otpCooldownUntil = data.cooldown_until

    infoMessage.value = data.otp_sent
      ? 'Kode OTP telah dikirim melalui WhatsApp ke nomor Anda.'
      : data.reason === 'too_many_requests'
        ? 'Terlalu sering meminta kode OTP. Demi keamanan, mohon tunggu sebelum mencoba lagi.'
        : 'Kode OTP sebelumnya masih berlaku. Tunggu sebentar sebelum mengirim ulang.'

    flow.step = 'otp'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

// ---------- Step 2: OTP ----------
const otpCode = ref('')
async function verifyResetOtp() {
  errorMessage.value = ''
  if (!/^\d{6}$/.test(otpCode.value)) {
    errorMessage.value = 'Kode OTP harus 6 digit'
    return
  }
  loading.value = true
  try {
    const data = await api.post<{ reset_token: string }>('/patient-portal/auth/verify-reset-otp', {
      nik: flow.nik,
      phone: flow.phone,
      otp_code: otpCode.value,
    })
    flow.resetToken = data.reset_token
    flow.step = 'password'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Kode OTP tidak valid'
  } finally {
    loading.value = false
  }
}

// ---------- Step 3: kata sandi baru ----------
const password = ref('')
const passwordConfirm = ref('')
async function submitNewPassword() {
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
    const data = await api.post('/patient-portal/auth/reset-password', {
      reset_token: flow.resetToken,
      password: password.value,
      password_confirmation: passwordConfirm.value,
    })
    auth.setToken(data.token)
    auth.setProfile(data.profile)
    clearFlow()
    await router.push('/dashboard')
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengubah kata sandi'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-6 flex flex-col items-center text-center animate-rise">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <KeyRound class="size-8" />
      </div>
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Lupa Kata Sandi</h1>
      <p class="mt-1 text-sm text-neutral-500">Verifikasi identitas Anda untuk mengatur ulang kata sandi</p>
    </div>

    <!-- Step: identitas -->
    <form v-if="flow.step === 'identity'" class="space-y-4 animate-rise" @submit.prevent="requestReset">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput v-model="flow.nik" label="NIK" inputmode="numeric" :maxlength="16" placeholder="16 digit sesuai KTP" required />
      <AppInput v-model="flow.phone" label="Nomor HP Terdaftar" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" required />
      <AppButton type="submit" variant="secondary" class="w-full" :loading="loading">Kirim Kode OTP</AppButton>
      <p class="text-center text-sm text-neutral-500">
        Sudah ingat kata sandi? <NuxtLink to="/login" class="font-semibold text-primary-600">Masuk</NuxtLink>
      </p>
    </form>

    <!-- Step: OTP -->
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
      <form class="space-y-4" @submit.prevent="verifyResetOtp">
        <AppInput v-model="otpCode" label="Kode OTP" inputmode="numeric" :maxlength="6" placeholder="6 digit dari WhatsApp" required />
        <AppButton type="submit" class="w-full" :loading="loading">Verifikasi</AppButton>
      </form>
      <button
        class="w-full text-center text-sm font-medium text-primary-600 disabled:text-neutral-400"
        :disabled="resendCooldown > 0" @click="requestReset"
      >
        {{ resendCooldown > 0 ? `Kirim ulang dalam ${formatCooldown(resendCooldown)}` : 'Kirim ulang kode OTP' }}
      </button>
    </div>

    <!-- Step: kata sandi baru -->
    <form v-else-if="flow.step === 'password'" class="space-y-4 animate-rise" @submit.prevent="submitNewPassword">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput v-model="password" label="Kata Sandi Baru" type="password" placeholder="Minimal 8 karakter" required />
      <AppInput v-model="passwordConfirm" label="Ulangi Kata Sandi" type="password" placeholder="Ketik ulang kata sandi" required />
      <AppButton type="submit" class="w-full" :loading="loading">Simpan Kata Sandi Baru</AppButton>
    </form>
  </div>
</template>
