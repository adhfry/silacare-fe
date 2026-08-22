<script setup lang="ts">
import { UserPen, ShieldAlert, ShieldCheck } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()

// Modal wajib (TIDAK BISA ditutup) khusus akun hasil klaim-via-email --
// nomor SiLAKES lama mereka BUKAN WhatsApp aktif, jadi belum ada nomor WA
// genuine yang terverifikasi sama sekali. Reuse PERSIS logic ubah-nomor-hp
// yang sudah ada (useChangePhoneFlow) -- begitu verifyOtp() sukses, backend
// (ProfileController::verifyPhoneChange) otomatis set needs_wa_verification
// jadi false, auth.setProfile() di dalam composable langsung menutup modal
// ini tanpa perlu logic tambahan di sini.
const waFlow = useChangePhoneFlow()

// Seluruh halaman dashboard berisi data pribadi pasien (riwayat pemeriksaan,
// NIK, dll), WAJIB tidak pernah ter-index mesin pencari.
useSeoMeta({ robots: 'noindex, nofollow' })

// Muncul SEKALI per sesi login (bukan di setiap perpindahan halaman dashboard,
// yang akan sangat mengganggu), ditandai lewat sessionStorage supaya reset
// otomatis kalau tab ditutup/browser dibuka lagi, konsisten dengan "setiap dia
// login" (login baru = sesi baru = modal muncul lagi kalau masih < 100%).
const SESSION_FLAG = 'silacare_completeness_prompted'
const showCompletenessModal = ref(false)

onMounted(() => {
  // Modal wajib verifikasi WA jauh lebih mendesak -- jangan sampai modal
  // "lengkapi data" (bisa ditunda "Nanti Saja") malah numpuk/mengalihkan
  // perhatian dari modal yang TIDAK BISA ditutup ini.
  if (auth.profile?.needs_wa_verification) return

  const percent = auth.profile?.completeness?.percent
  if (percent === undefined || percent >= 100) return
  if (sessionStorage.getItem(SESSION_FLAG)) return

  sessionStorage.setItem(SESSION_FLAG, '1')
  showCompletenessModal.value = true
})

function goToUpdateData() {
  showCompletenessModal.value = false
  router.push('/dashboard/akun/update-data')
}
</script>

<template>
  <div class="min-h-dvh bg-neutral-50 pb-24">
    <div class="max-w-md mx-auto safe-top">
      <slot />
    </div>
    <BottomNav />

    <!-- Modal ajakan lengkapi data -->
    <div v-if="showCompletenessModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl animate-rise">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
          <UserPen class="size-7" />
        </div>
        <h2 class="font-heading mt-4 text-lg font-bold text-neutral-900">Lengkapi Data Diri Anda</h2>
        <p class="mt-2 text-sm text-neutral-500">
          Data Anda baru <span class="font-semibold text-neutral-700">{{ auth.profile?.completeness?.percent }}%</span> lengkap.
          Melengkapi data membantu petugas melayani Anda lebih cepat dan akurat.
        </p>
        <div class="mt-5 flex flex-col gap-2.5">
          <AppButton class="w-full" @click="goToUpdateData">Lengkapi Sekarang</AppButton>
          <button class="text-sm font-medium text-neutral-500" @click="showCompletenessModal = false">Nanti Saja</button>
        </div>
      </div>
    </div>

    <!-- Modal WAJIB verifikasi nomor WhatsApp (akun hasil klaim-via-email) --
         SENGAJA tidak ada tombol/backdrop utk menutup, z-index lebih tinggi
         dari modal completeness supaya selalu di atas kalau kebetulan
         keduanya terpicu. -->
    <div v-if="auth.profile?.needs_wa_verification" class="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 px-4 pb-6 sm:items-center">
      <div class="w-full max-w-sm rounded-3xl bg-white p-6 animate-rise">
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <ShieldAlert class="size-7" />
        </div>
        <h2 class="mt-4 text-center font-heading text-lg font-bold text-neutral-900">Verifikasi Nomor WhatsApp</h2>
        <p class="mt-2 text-center text-sm text-neutral-500">
          Nomor HP yang tercatat untuk akun Anda bukan nomor WhatsApp aktif. Masukkan nomor WhatsApp
          yang benar-benar aktif untuk melanjutkan menggunakan SiLACARE.
        </p>

        <AppAlert v-if="waFlow.successMessage.value" variant="success" class="mt-4">
          <span class="flex items-center gap-1.5"><ShieldCheck class="size-4 shrink-0" /> {{ waFlow.successMessage.value }}</span>
        </AppAlert>

        <template v-else>
          <!-- Step: input nomor baru -->
          <form v-if="waFlow.step.value === 'input'" class="mt-5 space-y-4" @submit.prevent="waFlow.requestOtp">
            <AppAlert v-if="waFlow.errorMessage.value" variant="error">{{ waFlow.errorMessage.value }}</AppAlert>
            <AppInput
              v-model="waFlow.newPhone.value" label="Nomor WhatsApp Aktif" type="tel" inputmode="tel"
              placeholder="08xxxxxxxxxx" required
            />
            <AppButton type="submit" class="w-full" :loading="waFlow.loading.value">Kirim Kode OTP</AppButton>
          </form>

          <!-- Step: verifikasi OTP -->
          <div v-else class="mt-5 space-y-4">
            <p class="text-center text-sm text-neutral-500">
              Kode OTP telah dikirim ke <span class="font-semibold text-neutral-700">{{ waFlow.newPhone.value }}</span>.
              Jika nomor tersebut salah,
              <button type="button" class="font-semibold text-primary-600 underline underline-offset-2" @click="waFlow.changePhoneNumber">
                ubah nomor sekarang
              </button>.
            </p>
            <AppAlert v-if="waFlow.errorMessage.value" variant="error">{{ waFlow.errorMessage.value }}</AppAlert>
            <AppAlert v-else-if="waFlow.infoMessage.value" variant="info">{{ waFlow.infoMessage.value }}</AppAlert>
            <form class="space-y-4" @submit.prevent="waFlow.verifyOtp">
              <AppInput v-model="waFlow.otpCode.value" label="Kode OTP" inputmode="numeric" :maxlength="6" placeholder="6 digit dari WhatsApp" required />
              <AppButton type="submit" class="w-full" :loading="waFlow.loading.value">Verifikasi & Simpan</AppButton>
            </form>
            <button
              class="w-full text-center text-sm font-medium text-primary-600 disabled:text-neutral-400"
              :disabled="waFlow.resendCooldown.value > 0" @click="waFlow.requestOtp"
            >
              {{ waFlow.resendCooldown.value > 0 ? `Kirim ulang dalam ${waFlow.formatCooldown(waFlow.resendCooldown.value)}` : 'Kirim ulang kode OTP' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
