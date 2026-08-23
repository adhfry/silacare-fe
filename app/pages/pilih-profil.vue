<script setup lang="ts">
import { CheckCircle2 } from 'lucide-vue-next'

definePageMeta({ layout: 'guest' })

usePageSeo({
  title: 'Pilih Profil',
  description: 'Pilih profil pasien yang ingin digunakan pada nomor HP ini.',
})

const api = useApi()
const auth = useAuthStore()
const router = useRouter()
const { mode, selectionToken, profiles, clear } = useProfileSelection()

const selectedId = ref<number | null>(null)
const loading = ref(false)
const errorMessage = ref('')

// Halaman ini cuma boleh diakses SETELAH login/klik "Pindah Profil" (state
// diisi lewat useProfileSelection). Diakses langsung (mis. reload) -> state
// kosong -> balik ke /login, tidak ada apa pun untuk dipilih.
onMounted(() => {
  if (!mode.value || profiles.value.length === 0) {
    router.replace('/login')
  }
})

function formatTglLahir(value: string) {
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return value
  }
}

async function lanjutkan() {
  if (!selectedId.value) return
  errorMessage.value = ''
  loading.value = true
  try {
    const data = mode.value === 'login'
      ? await api.post('/patient-portal/auth/login/select-profile', {
          selection_token: selectionToken.value,
          patient_id: selectedId.value,
        })
      : await api.post('/patient-portal/auth/switch-profile', { patient_id: selectedId.value })

    auth.setToken(data.token)
    auth.setProfile(data.profile)
    clear()
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
      <AppLogo size-class="h-16 w-16" />
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Pilih Profil</h1>
      <p class="mt-1 px-4 text-sm text-neutral-500">
        Nomor HP ini terhubung ke beberapa data pasien. Pilih profil yang ingin digunakan.
      </p>
    </div>

    <AppAlert v-if="errorMessage" variant="error" class="mb-4">{{ errorMessage }}</AppAlert>

    <div class="flex-1 space-y-3">
      <button
        v-for="p in profiles" :key="p.patient_id"
        type="button"
        class="w-full rounded-2xl border-2 bg-white p-4 text-left shadow-sm shadow-neutral-200/60 transition-colors"
        :class="selectedId === p.patient_id ? 'border-primary-500 ring-2 ring-primary-100' : 'border-neutral-100'"
        @click="selectedId = p.patient_id"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="font-heading text-base font-bold text-neutral-900">{{ p.name }}</p>
            <p class="mt-0.5 font-mono text-sm text-neutral-500">{{ p.nik }}</p>
          </div>
          <CheckCircle2 v-if="selectedId === p.patient_id" class="size-5 shrink-0 text-primary-500" />
          <span
            v-else-if="p.is_current"
            class="shrink-0 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-600"
          >
            Sedang Aktif
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-xs">
          <div>
            <p class="text-neutral-400">Tempat Lahir</p>
            <p class="font-medium text-neutral-700">{{ p.tempat_lahir }}</p>
          </div>
          <div>
            <p class="text-neutral-400">Tanggal Lahir</p>
            <p class="font-medium text-neutral-700">{{ formatTglLahir(p.tgl_lahir) }}</p>
          </div>
        </div>
      </button>
    </div>

    <button
      type="button"
      class="mt-6 w-full rounded-2xl py-3.5 text-[15px] font-semibold transition-all disabled:cursor-not-allowed"
      :class="selectedId ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 active:scale-[0.98]' : 'bg-neutral-200 text-neutral-400'"
      :disabled="!selectedId || loading"
      @click="lanjutkan"
    >
      {{ loading ? 'Memproses...' : 'Lanjutkan' }}
    </button>
  </div>
</template>
