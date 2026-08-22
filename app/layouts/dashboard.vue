<script setup lang="ts">
import { UserPen } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()

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
  </div>
</template>
