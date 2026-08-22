<script setup lang="ts">
import { Send } from 'lucide-vue-next'

definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const auth = useAuthStore()
const api = useApi()
const router = useRouter()

const patient = auth.profile?.patient

const form = reactive({
  name: patient?.name || '',
  gender: patient?.gender || '',
  tempat_lahir: patient?.tempat_lahir || '',
  tgl_lahir: patient?.tgl_lahir || '',
  golongan_darah: patient?.golongan_darah || '',
  agama: patient?.agama || '',
  status_perkawinan: patient?.status_perkawinan || '',
  pekerjaan: patient?.pekerjaan || '',
  phone: patient?.phone || '',
  email: patient?.email || '',
  fktp: patient?.fktp || '',
  alamat: patient?.alamat || '',
  rt_rw: patient?.rt_rw || '',
  kecamatan: patient?.kecamatan || '',
  kel_desa: patient?.kel_desa || '',
  is_bpjs: patient?.is_bpjs ? 'ya' : 'tidak',
  no_bpjs: patient?.no_bpjs || '',
  is_perokok: patient?.is_perokok ? 'ya' : 'tidak',
  jenis_perokok: patient?.jenis_perokok || '',
})

// Snapshot nilai AWAL (bukan reactive) -- dipakai untuk hitung field mana
// saja yang benar-benar diubah user, supaya cuma itu yang diajukan.
const original = { ...form }

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const changedFields = computed(() => {
  const changes: Record<string, string> = {}
  for (const key of Object.keys(form) as (keyof typeof form)[]) {
    if (form[key] !== original[key as keyof typeof original]) {
      // is_bpjs/is_perokok di form pakai 'ya'/'tidak' untuk UI toggle,
      // tapi field aslinya boolean -- konversi balik saat dikirim.
      if (key === 'is_bpjs' || key === 'is_perokok') {
        changes[key] = form[key] === 'ya' ? '1' : ''
      } else {
        changes[key] = form[key]
      }
    }
  }
  return changes
})

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''

  const changes = changedFields.value
  if (!Object.keys(changes).length) {
    errorMessage.value = 'Belum ada data yang diubah'
    return
  }

  loading.value = true
  try {
    const data = await api.post<{ jumlah_diajukan: number }>('/patient-portal/profile/request-update', { changes })
    successMessage.value = `${data.jumlah_diajukan} perubahan data telah diajukan, menunggu persetujuan petugas Labkesda.`
    Object.assign(original, form)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Gagal mengajukan perubahan data'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader title="Update Informasi Pasien" />

    <div class="px-5 pb-8">
      <AppAlert variant="info" class="mb-4">
        Perubahan yang Anda ajukan di sini tidak langsung berlaku. Petugas Labkesda akan
        memeriksa dan menyetujuinya terlebih dahulu.
      </AppAlert>

      <AppAlert v-if="successMessage" variant="success" class="mb-4">{{ successMessage }}</AppAlert>
      <AppAlert v-if="errorMessage" variant="error" class="mb-4">{{ errorMessage }}</AppAlert>

      <form class="space-y-4" @submit.prevent="submit">
        <AppInput v-model="form.name" label="Nama Lengkap" />

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Jenis Kelamin</span>
            <select v-model="form.gender" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </label>
          <AppInput v-model="form.tgl_lahir" label="Tanggal Lahir" type="date" />
        </div>

        <AppInput v-model="form.tempat_lahir" label="Tempat Lahir" />

        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Golongan Darah</span>
            <select v-model="form.golongan_darah" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option v-for="g in ['A', 'B', 'AB', 'O', 'Tidak Tahu']" :key="g" :value="g">{{ g }}</option>
            </select>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-neutral-700">Agama</span>
            <select v-model="form.agama" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
              <option value="">Pilih</option>
              <option v-for="a in ['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu', 'Lainnya']" :key="a" :value="a">{{ a }}</option>
            </select>
          </label>
        </div>

        <label class="block">
          <span class="mb-1.5 block text-sm font-medium text-neutral-700">Status Perkawinan</span>
          <select v-model="form.status_perkawinan" class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500">
            <option value="">Pilih</option>
            <option v-for="s in ['BELUM KAWIN', 'KAWIN', 'CERAI HIDUP', 'CERAI MATI']" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>

        <AppInput v-model="form.pekerjaan" label="Pekerjaan" />
        <AppInput v-model="form.phone" label="Nomor HP" type="tel" inputmode="tel" placeholder="08xxxxxxxxxx" />
        <AppInput v-model="form.email" label="Email" type="email" placeholder="nama@email.com" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            FKTP
            <InfoTip text="FKTP (Fasilitas Kesehatan Tingkat Pertama) adalah puskesmas, klinik, atau dokter keluarga yang terdaftar sebagai rujukan pertama di kartu BPJS Kesehatan Anda." />
          </span>
          <FktpPicker v-model="form.fktp" />
        </div>

        <AppInput v-model="form.alamat" label="Alamat (sesuai KTP)" placeholder="Nama jalan, nomor rumah" />
        <WilayahPicker v-model:kecamatan="form.kecamatan" v-model:kel-desa="form.kel_desa" />
        <AppInput v-model="form.rt_rw" label="RT/RW" placeholder="001/002" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Kepesertaan BPJS
            <InfoTip text="Isi 'Ya' jika Anda peserta aktif BPJS Kesehatan, dan cantumkan nomor kartunya." />
          </span>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_bpjs === 'ya' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_bpjs = 'ya'"
            >
              Ya
            </button>
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_bpjs === 'tidak' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_bpjs = 'tidak'; form.no_bpjs = ''"
            >
              Tidak
            </button>
          </div>
        </div>
        <AppInput v-if="form.is_bpjs === 'ya'" v-model="form.no_bpjs" label="Nomor BPJS" placeholder="13 digit nomor kartu" />

        <div>
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Status Merokok
            <InfoTip text="Informasi ini membantu petugas menilai faktor risiko kesehatan Anda saat pemeriksaan." />
          </span>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_perokok === 'ya' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_perokok = 'ya'"
            >
              Merokok
            </button>
            <button
              type="button" class="rounded-xl border-2 py-3 text-sm font-semibold"
              :class="form.is_perokok === 'tidak' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-neutral-200 text-neutral-500'"
              @click="form.is_perokok = 'tidak'; form.jenis_perokok = ''"
            >
              Tidak Merokok
            </button>
          </div>
        </div>
        <label v-if="form.is_perokok === 'ya'" class="block">
          <span class="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-neutral-700">
            Jenis Rokok
            <InfoTip text="Contoh: rokok filter, kretek, atau vape/rokok elektrik." />
          </span>
          <input
            v-model="form.jenis_perokok" type="text" placeholder="Contoh: Rokok Filter"
            class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500"
          >
        </label>

        <AppButton type="submit" class="w-full" :loading="loading">
          <Send class="size-4.5" /> Ajukan Perubahan
        </AppButton>
      </form>
    </div>
  </div>
</template>
