<script setup lang="ts">
import { HeartPulse, PartyPopper, Info, Clock3 } from 'lucide-vue-next'

definePageMeta({ layout: 'guest' })

usePageSeo({
  title: 'Pemeriksaan Gratis Car Free Day',
  description: 'Daftar pemeriksaan kesehatan gratis (cek kolesterol, asam urat, GDA/GDP, tensi) di Car Free Day UPTD Labkesda Kabupaten Sumenep, setiap hari Minggu, tanpa perlu login.',
})

const api = useApi()
const router = useRouter()
const flow = useCfdFlow()
const auth = useAuthStore()

// Pasien yang sudah login "beranda"-nya adalah dashboard, bukan landing.
const berandaLink = computed(() => (auth.isLoggedIn ? '/dashboard' : '/'))

type Step = 'nik' | 'konfirmasi' | 'pilih' | 'sukses' | 'tidak_layak'
const step = ref<Step>('nik')
const loading = ref(false)
const errorMessage = ref('')

const nik = ref('')
const eligibility = ref<any>(null)
const patientName = ref('')

const kondisiPuasa = ref<'ya' | 'tidak' | ''>('')
const kategori = ref<'asam_urat' | 'cholesterol' | ''>('')
const antrianKe = ref<number | null>(null)
const suratHasilLabId = ref<number | null>(null)

const { status: queueStatus, start: startQueuePolling } = useCfdQueueStatus(suratHasilLabId)

// Jendela waktu pendaftaran CFD (Minggu 07.00+, lihat CfdRegistrationService
// backend) -- dicek SEBELUM apa pun ditampilkan, supaya tidak ada yang
// sempat isi form kalau memang belum waktunya sama sekali.
const timingLoading = ref(true)
const timingAllowed = ref(true)
const nextAvailableAt = ref<string | null>(null)

const nowTick = ref(Date.now())
let tickTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tickTimer = setInterval(() => { nowTick.value = Date.now() }, 1000)
})
onBeforeUnmount(() => clearInterval(tickTimer))

const countdown = computed(() => {
  if (!nextAvailableAt.value) return null
  const diffMs = new Date(nextAvailableAt.value).getTime() - nowTick.value
  if (diffMs <= 0) return null
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return days > 0 ? `${days} hari ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
})

function formatFullDate(value: string) {
  return new Date(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    + ', ' + new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

async function checkTiming() {
  timingLoading.value = true
  try {
    const data = await api.get<{ allowed: boolean; next_available_at: string | null }>('/cfd/timing')
    timingAllowed.value = data.allowed
    nextAvailableAt.value = data.next_available_at
  } catch {
    // Kalau gagal cek, biarkan lanjut -- backend tetap jadi validator final
    // di endpoint register/register-new, jendela waktu tidak pernah dilewati
    // hanya karena pengecekan awal ini gagal (mis. jaringan).
    timingAllowed.value = true
  } finally {
    timingLoading.value = false
  }
}

// Pasien yang sudah login TIDAK perlu isi ulang NIK -- identitasnya sudah
// pasti dari akun yang sedang login (bukan input bebas), langsung ke
// konfirmasi lalu pilih kategori.
async function checkNikForLoggedInUser() {
  const patientNik = auth.profile?.patient.nik
  if (!patientNik) return

  loading.value = true
  errorMessage.value = ''
  try {
    const data = await api.post<any>('/cfd/check-nik', { nik: patientNik })
    nik.value = patientNik
    patientName.value = data.patient?.name || auth.profile?.patient.name || ''
    eligibility.value = data.eligibility
    step.value = data.status === 'layak' ? 'konfirmasi' : 'tidak_layak'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await checkTiming()
  if (timingAllowed.value && auth.isLoggedIn) {
    await checkNikForLoggedInUser()
  }
})

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

const { getCurrentPosition } = useGeolocation()

async function submitRegister() {
  errorMessage.value = ''
  if (!kondisiPuasa.value || !kategori.value) {
    errorMessage.value = 'Lengkapi pilihan di atas'
    return
  }

  loading.value = true
  try {
    // Wajib berada di lokasi CFD (radius 400m) -- dicek ulang di backend,
    // ini cuma supaya penolakan izin/GPS mati langsung jelas di sini.
    const { latitude, longitude } = await getCurrentPosition()

    const data = await api.post<any>('/cfd/register', {
      nik: nik.value,
      kondisi_puasa: kondisiPuasa.value === 'ya',
      kategori_opsional: kategori.value,
      latitude,
      longitude,
    })
    antrianKe.value = data.antrian_ke
    suratHasilLabId.value = data.surat_hasil_lab_id
    startQueuePolling()
    step.value = 'sukses'
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Gagal mendaftar CFD'
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
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Pemeriksaan Gratis di Car Free Day</h1>
      <p class="mt-1 text-sm text-neutral-500">Cek kolesterol / asam urat + GDA & tensi, gratis, tanpa perlu login</p>
    </div>

    <!-- Belum waktunya: CFD cuma berlangsung Minggu 07.00+ -->
    <div v-if="timingLoading" class="flex flex-1 flex-col items-center py-8">
      <SkeletonBlock rounded="rounded-full" class="size-16" />
      <SkeletonBlock class="mt-4 h-5 w-48" />
      <SkeletonBlock class="mt-2 h-4 w-64" />
      <SkeletonBlock class="mt-1 h-4 w-52" />
      <SkeletonBlock rounded="rounded-2xl" class="mt-5 h-20 w-40" />
    </div>

    <div v-else-if="!timingAllowed" class="flex flex-1 flex-col items-center justify-center text-center">
      <div class="flex size-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Clock3 class="size-8" />
      </div>
      <h2 class="font-heading mt-4 text-lg font-bold text-neutral-900">Belum Waktunya Mendaftar</h2>
      <p class="mt-2 max-w-xs text-sm text-neutral-500">
        Pendaftaran CFD online hanya dibuka saat acara berlangsung, setiap hari Minggu mulai pukul 07.00 WIB.
        Silakan datang langsung ke Taman Bunga, depan Gedung MPP Kabupaten Sumenep pada
        <span class="font-semibold text-neutral-700">{{ nextAvailableAt ? formatFullDate(nextAvailableAt) : '-' }} WIB</span>.
      </p>
      <div v-if="countdown" class="mt-5 rounded-2xl bg-neutral-50 px-6 py-4">
        <p class="text-xs text-neutral-400">Pendaftaran dibuka dalam</p>
        <p class="font-heading mt-1 text-2xl font-bold tabular-nums text-secondary-600">{{ countdown }}</p>
      </div>
      <NuxtLink :to="berandaLink" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>

    <!-- Step: konfirmasi (pasien sudah login, identitas sudah pasti) -->
    <div v-else-if="step === 'konfirmasi'" class="flex flex-1 flex-col items-center justify-center text-center">
      <AppAlert v-if="errorMessage" variant="error" class="mb-4 text-left">{{ errorMessage }}</AppAlert>
      <div class="flex size-16 items-center justify-center rounded-full bg-secondary-50 text-secondary-600">
        <HeartPulse class="size-8" />
      </div>
      <h2 class="font-heading mt-4 text-lg font-bold text-neutral-900">Halo, {{ patientName }}</h2>
      <p class="mt-2 max-w-xs text-sm text-neutral-500">
        Anda layak mengikuti pemeriksaan CFD hari ini. Lanjutkan pendaftaran dengan akun Anda yang sedang login?
      </p>
      <AppButton class="mt-6 w-full" :loading="loading" @click="step = 'pilih'">Ya, Lanjutkan</AppButton>
      <NuxtLink to="/dashboard" class="mt-3 text-sm font-medium text-neutral-500">Batal</NuxtLink>
    </div>

    <!-- Step: input NIK -->
    <form v-else-if="step === 'nik'" class="space-y-4" @submit.prevent="checkNik">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>
      <AppInput
        v-model="nik" label="NIK (sesuai KTP)" inputmode="numeric" :maxlength="16"
        placeholder="16 digit angka" required
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

      <div v-if="queueStatus" class="mt-5 rounded-2xl bg-neutral-50 px-6 py-4">
        <p class="text-xs text-neutral-400">Sisa antrean di depan Anda</p>
        <p class="font-heading mt-1 text-3xl font-bold tabular-nums text-primary-600">
          {{ queueStatus.status === 'pending' ? queueStatus.sisa_di_depan : 0 }}
        </p>
        <p class="mt-1 text-xs text-neutral-400">
          {{ queueStatus.status !== 'pending' ? 'Giliran Anda sudah diproses' : 'orang, diperbarui otomatis' }}
        </p>
      </div>

      <NuxtLink :to="berandaLink" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
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
      <NuxtLink :to="berandaLink" class="mt-6"><AppButton variant="outline">Kembali ke Beranda</AppButton></NuxtLink>
    </div>
  </div>
</template>
