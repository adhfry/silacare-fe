<script setup lang="ts">
import { HeartPulse, PartyPopper, Info } from 'lucide-vue-next'

definePageMeta({ layout: 'guest' })

const api = useApi()
const router = useRouter()
const flow = useCfdFlow()

type Step = 'nik' | 'pilih' | 'sukses' | 'tidak_layak'
const step = ref<Step>('nik')
const loading = ref(false)
const errorMessage = ref('')

const nik = ref('')
const eligibility = ref<any>(null)
const patientName = ref('')

const kondisiPuasa = ref<'ya' | 'tidak' | ''>('')
const kategori = ref<'asam_urat' | 'cholesterol' | ''>('')
const antrianKe = ref<number | null>(null)

async function checkNik() {
  errorMessage.value = ''
  if (!/^\d{16}$/.test(nik.value)) {
    errorMessage.value = 'NIK harus 16 digit angka'
    return
  }

  loading.value = true
  try {
    const data = await api.post<any>('/cfd/check-nik', { nik: nik.value })

    if (data.status === 'not_found') {
      flow.value = { nik: nik.value, parsedTglLahir: data.parsed?.tgl_lahir, parsedGender: data.parsed?.gender }
      await router.push('/cfd/daftar-baru')
      return
    }

    patientName.value = data.patient?.name || ''
    eligibility.value = data.eligibility

    step.value = data.status === 'layak' ? 'pilih' : 'tidak_layak'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

async function submitRegister() {
  errorMessage.value = ''
  if (!kondisiPuasa.value || !kategori.value) {
    errorMessage.value = 'Lengkapi pilihan di atas'
    return
  }

  loading.value = true
  try {
    const data = await api.post<any>('/cfd/register', {
      nik: nik.value,
      kondisi_puasa: kondisiPuasa.value === 'ya',
      kategori_opsional: kategori.value,
    })
    antrianKe.value = data.antrian_ke
    step.value = 'sukses'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mendaftar CFD'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-8 flex flex-col items-center text-center">
      <div class="flex size-16 items-center justify-center rounded-2xl bg-secondary-50 text-secondary-600">
        <HeartPulse class="size-8" />
      </div>
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Car Free Day Gratis</h1>
      <p class="mt-1 text-sm text-neutral-500">Cek kolesterol / asam urat + GDA & tensi, gratis, tanpa perlu login</p>
    </div>

    <!-- Step: input NIK -->
    <form v-if="step === 'nik'" class="space-y-4" @submit.prevent="checkNik">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput
        v-model="nik" label="NIK (sesuai KTP)" inputmode="numeric" :maxlength="16"
        placeholder="16 digit angka"
      />
      <AppButton type="submit" variant="secondary" class="w-full" :loading="loading">Cek Sekarang</AppButton>
    </form>

    <!-- Step: pilih kategori -->
    <form v-else-if="step === 'pilih'" class="space-y-5" @submit.prevent="submitRegister">
      <AppAlert variant="success">Halo {{ patientName }}, Anda layak mengikuti CFD hari ini!</AppAlert>
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
            v-if="eligibility?.kategori.asam_urat.tersedia"
            type="button" class="w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold"
            :class="kategori === 'asam_urat' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-neutral-200 text-neutral-600'"
            @click="kategori = 'asam_urat'"
          >
            Asam Urat
          </button>
          <button
            v-if="eligibility?.kategori.cholesterol.tersedia"
            type="button" class="w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-semibold"
            :class="kategori === 'cholesterol' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-neutral-200 text-neutral-600'"
            @click="kategori = 'cholesterol'"
          >
            Kolesterol
          </button>
        </div>
        <p class="mt-2 flex items-start gap-1.5 text-xs text-neutral-400">
          <Info class="size-3.5 mt-0.5 shrink-0" />
          GDA/GDP dan tekanan darah (tensi) otomatis disertakan.
        </p>
      </div>

      <AppButton type="submit" variant="secondary" class="w-full" :loading="loading">Daftar Sekarang</AppButton>
    </form>

    <!-- Step: sukses -->
    <div v-else-if="step === 'sukses'" class="flex flex-1 flex-col items-center justify-center text-center">
      <div class="flex size-20 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <PartyPopper class="size-10" />
      </div>
      <h2 class="font-heading mt-4 text-xl font-bold text-neutral-900">Pendaftaran Berhasil!</h2>
      <p class="mt-1 text-sm text-neutral-500">Nomor antrean Anda</p>
      <p class="font-heading mt-1 text-4xl font-extrabold text-secondary-600">{{ antrianKe }}</p>
      <p class="mt-4 max-w-xs text-sm text-neutral-500">
        Silakan tunjukkan nomor ini kepada petugas di lokasi CFD.
      </p>
      <NuxtLink to="/" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>

    <!-- Step: tidak layak -->
    <div v-else-if="step === 'tidak_layak'" class="flex flex-1 flex-col items-center justify-center text-center">
      <AppAlert variant="info" class="text-left">
        <span v-if="eligibility?.kuota.penuh">Kuota CFD hari ini sudah penuh, silakan datang di kesempatan berikutnya.</span>
        <span v-else>
          Anda belum bisa mengikuti pemeriksaan asam urat maupun kolesterol saat ini
          (jeda minimal 4 minggu antar pemeriksaan yang sama).
        </span>
      </AppAlert>
      <NuxtLink to="/" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>
  </div>
</template>
