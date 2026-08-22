/**
 * Logic request-OTP + verifikasi utk ganti nomor HP (login), diekstrak dari
 * ubah-nomor-hp.vue supaya bisa dipakai ULANG oleh modal wajib verifikasi WA
 * pasca klaim-via-email (lihat dashboard.vue) TANPA duplikasi -- keduanya
 * memanggil endpoint /patient-portal/profile/request-phone-change &
 * verify-phone-change yang SAMA PERSIS, cuma beda konteks tampilan
 * (halaman biasa vs modal wajib tidak bisa ditutup).
 */
export function useChangePhoneFlow() {
  const api = useApi()
  const auth = useAuthStore()

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
    } catch (err) {
      errorMessage.value = err instanceof ApiError ? err.message : 'Kode OTP tidak valid'
    } finally {
      loading.value = false
    }
  }

  return {
    step,
    newPhone,
    otpCode,
    loading,
    errorMessage,
    infoMessage,
    successMessage,
    resendCooldown,
    formatCooldown,
    requestOtp,
    changePhoneNumber,
    verifyOtp,
  }
}
