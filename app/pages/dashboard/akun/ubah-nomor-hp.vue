<script setup lang="ts">
import { Smartphone } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const auth = useAuthStore()
const router = useRouter()

type Step = 'input' | 'otp'
const step = ref<Step>('input')

const newPhone = ref('')
const otpCode = ref('')
const loading = ref(false)
const errorMessage = ref('')
const infoMessage = ref('')
const successMessage = ref('')

const nowTick = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(tickTimer))

const cooldownUntil = ref<string | null>(null)
const resendCooldown = computed(() => {
  if (!cooldownUntil.value) return 0
  const remaining = Math.ceil((new Date(cooldownUntil.value).getTime() - nowTick.value) / 1000)
  return Math.max(0, remaining)
})

function formatCooldown(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds} detik`
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds > 0 ? `${minutes} menit ${seconds} detik` : `${minutes} menit`
}

async function requestOtp() {
  errorMessage.value = ''
  if (!/^0\d{9,14}$/.test(newPhone.value)) {
    errorMessage.value = 'Nomor HP tidak valid, gunakan format 08xxxxxxxxxx'
    return
  }

  loading.value = true
  try {
    const data = await api.post<{
      otp_sent: boolean
      reason?: 'too_many_requests' | 'already_sent'
      cooldown_until?: string | null
    }>('/patient-portal/profile/request-phone-change', { new_phone: newPhone.value })

    if (data.cooldown_until) cooldownUntil.value = data.cooldown_until

    infoMessage.value = data.otp_sent
      ? 'Kode OTP telah dikirim melalui WhatsApp ke nomor baru Anda.'
      : data.reason === 'too_many_requests'
        ? 'Terlalu sering meminta kode OTP. Demi keamanan, mohon tunggu sebelum mencoba lagi.'
        : 'Kode OTP sebelumnya masih berlaku. Tunggu sebentar sebelum mengirim ulang.'

    step.value = 'otp'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

function changePhoneNumber() {
  cooldownUntil.value = null
  otpCode.value = ''
  errorMessage.value = ''
  infoMessage.value = ''
  step.value = 'input'
}

async function verifyOtp() {
  errorMessage.value = ''
  if (!/^\d{6}$/.test(otpCode.value)) {
    errorMessage.value = 'Kode OTP harus 6 digit'
    return
  }

  loading.value = true
  try {
    const profile = await api.post('/patient-portal/profile/verify-phone-change', {
      new_phone: newPhone.value,
      otp_code: otpCode.value,
    })
    auth.setProfile(profile)
    successMessage.value = 'Nomor HP Anda berhasil diperbarui.'
    setTimeout(() => router.push('/dashboard/akun'), 1500)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Kode OTP tidak valid'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Ubah Nomor HP" />

    <div class="px-5 pb-8">
      <div class="mb-6 flex flex-col items-center text-center animate-rise">
        <div class="flex size-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <Smartphone class="size-8" />
        </div>
        <h1 class="font-heading mt-3 text-lg font-bold text-neutral-900">Ubah Nomor HP</h1>
        <p class="mt-1 text-sm text-neutral-500">
          Nomor HP baru akan menjadi nomor login SiLACARE Anda. Verifikasi dengan kode OTP diperlukan untuk memastikan nomor tersebut benar milik Anda.
        </p>
      </div>

      <AppAlert v-if="successMessage" variant="success" class="mb-4">{{ successMessage }}</AppAlert>

      <template v-if="!successMessage">
        <!-- Step: input nomor baru -->
        <form v-if="step === 'input'" class="space-y-4" @submit.prevent="requestOtp">
          <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
          <p class="text-sm text-neutral-500">
            Nomor HP saat ini: <span class="font-semibold text-neutral-700">{{ auth.profile?.phone }}</span>
          </p>
          <AppInput
            v-model="newPhone" label="Nomor HP Baru" type="tel" inputmode="tel"
            placeholder="08xxxxxxxxxx" required
          />
          <AppButton type="submit" class="w-full" :loading="loading">Kirim Kode OTP</AppButton>
        </form>

        <!-- Step: verifikasi OTP -->
        <div v-else class="space-y-4">
          <p class="text-center text-sm text-neutral-500">
            Kode OTP telah dikirim ke <span class="font-semibold text-neutral-700">{{ newPhone }}</span>.
            Jika nomor tersebut salah,
            <button type="button" class="font-semibold text-primary-600 underline underline-offset-2" @click="changePhoneNumber">
              ubah nomor sekarang
            </button>.
          </p>
          <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
          <AppAlert v-else-if="infoMessage" variant="info">{{ infoMessage }}</AppAlert>
          <form class="space-y-4" @submit.prevent="verifyOtp">
            <AppInput v-model="otpCode" label="Kode OTP" inputmode="numeric" :maxlength="6" placeholder="6 digit dari WhatsApp" required />
            <AppButton type="submit" class="w-full" :loading="loading">Verifikasi & Simpan</AppButton>
          </form>
          <button
            class="w-full text-center text-sm font-medium text-primary-600 disabled:text-neutral-400"
            :disabled="resendCooldown > 0" @click="requestOtp"
          >
            {{ resendCooldown > 0 ? `Kirim ulang dalam ${formatCooldown(resendCooldown)}` : 'Kirim ulang kode OTP' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
