<script setup lang="ts">
import { Smartphone } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const auth = useAuthStore()
const router = useRouter()

const {
  step, newPhone, otpCode, loading, errorMessage, infoMessage, successMessage,
  resendCooldown, formatCooldown, requestOtp, changePhoneNumber, verifyOtp,
} = useChangePhoneFlow()

watch(successMessage, (val) => {
  if (val) setTimeout(() => router.push('/dashboard/akun'), 1500)
})
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
