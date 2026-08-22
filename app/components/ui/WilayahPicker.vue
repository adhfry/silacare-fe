<script setup lang="ts">
/**
 * Cari Kecamatan & Kelurahan/Desa dari data wilayah resmi SiLAKES (bukan
 * dropdown bertingkat provinsi->kabupaten->kecamatan yang lambat diisi) --
 * dua arah: cari kecamatan dulu lalu pilih desanya, ATAU langsung cari nama
 * kelurahan/desa (kecamatan otomatis terisi dari hasilnya). Kalau nama yang
 * diketik tidak ketemu di data wilayah, tetap boleh dipakai sebagai teks
 * bebas -- field ini di database memang string biasa, bukan FK, supaya
 * pasien dari desa yang belum lengkap datanya di wilayah tetap bisa daftar.
 */
const kecamatan = defineModel<string>('kecamatan', { default: '' })
const kelDesa = defineModel<string>('kelDesa', { default: '' })

const api = useApi()

interface DistrictHit { code: string; name: string; regency_name: string | null }
interface VillageHit { code: string; name: string; district_code: string; district_name: string | null }

const districtQuery = ref('')
const districtHits = ref<DistrictHit[]>([])
const districtOpen = ref(false)
const districtLoading = ref(false)
const selectedDistrictCode = ref<string | null>(null)

const villageQuery = ref('')
const villageHits = ref<VillageHit[]>([])
const villageOpen = ref(false)
const villageLoading = ref(false)

let districtTimer: ReturnType<typeof setTimeout> | undefined
let villageTimer: ReturnType<typeof setTimeout> | undefined

// Sinkronkan tampilan search box dengan v-model kalau diisi dari luar (mis.
// hasil OCR KTP) supaya tidak kosong padahal kecamatan/kel_desa sudah terisi.
watch(kecamatan, (val) => { if (val !== districtQuery.value) districtQuery.value = val }, { immediate: true })
watch(kelDesa, (val) => { if (val !== villageQuery.value) villageQuery.value = val }, { immediate: true })

interface ResolveResult { code: string; name: string; district_code?: string; district_name?: string; confidence: number }

// Data pasien lama sering berisi variasi penulisan ("Kec. Kota Sumenep",
// "Kecamatan Kota Sumenep", dst.) -- begitu komponen ini dibuka dengan nilai
// awal (edit data existing), cocokkan ke entri wilayah resmi lewat resolver
// similarity, supaya langsung "ketemu" (dan selectedDistrictCode terisi,
// supaya pencarian kelurahan/desa berikutnya ikut ter-scope dengan benar)
// alih-alih dianggap teks bebas yang tidak dikenal.
onMounted(async () => {
  if (kecamatan.value.trim().length >= 3) {
    try {
      const hit = await api.get<ResolveResult | null>(`/patient-portal/wilayah/districts/resolve?q=${encodeURIComponent(kecamatan.value.trim())}`)
      if (hit) {
        districtQuery.value = hit.name
        kecamatan.value = hit.name
        selectedDistrictCode.value = hit.code
      }
    } catch {
      // Resolver gagal (jaringan, dsb.) -- biarkan nilai asli apa adanya,
      // tetap bisa diedit manual seperti biasa.
    }
  }

  if (kelDesa.value.trim().length >= 3) {
    try {
      const params = new URLSearchParams({ q: kelDesa.value.trim() })
      if (selectedDistrictCode.value) params.set('district_code', selectedDistrictCode.value)
      const hit = await api.get<ResolveResult | null>(`/patient-portal/wilayah/villages/resolve?${params.toString()}`)
      if (hit) {
        villageQuery.value = hit.name
        kelDesa.value = hit.name
        if (!selectedDistrictCode.value && hit.district_code && hit.district_name) {
          selectedDistrictCode.value = hit.district_code
          districtQuery.value = hit.district_name
          kecamatan.value = hit.district_name
        }
      }
    } catch {
      // sama seperti di atas -- biarkan apa adanya kalau gagal.
    }
  }
})

function onDistrictInput() {
  kecamatan.value = districtQuery.value
  selectedDistrictCode.value = null
  districtOpen.value = true
  clearTimeout(districtTimer)
  if (districtQuery.value.trim().length < 3) {
    districtHits.value = []
    return
  }
  districtTimer = setTimeout(async () => {
    districtLoading.value = true
    try {
      districtHits.value = await api.get<DistrictHit[]>(`/patient-portal/wilayah/districts/search?q=${encodeURIComponent(districtQuery.value.trim())}`)
    } catch {
      districtHits.value = []
    } finally {
      districtLoading.value = false
    }
  }, 350)
}

function pickDistrict(hit: DistrictHit) {
  districtQuery.value = hit.name
  kecamatan.value = hit.name
  selectedDistrictCode.value = hit.code
  districtOpen.value = false
  // Ganti kecamatan -> kelurahan/desa yang sebelumnya dipilih (kalau ada)
  // kemungkinan besar sudah tidak relevan lagi.
  villageQuery.value = ''
  kelDesa.value = ''
}

function onVillageInput() {
  kelDesa.value = villageQuery.value
  villageOpen.value = true
  clearTimeout(villageTimer)
  if (villageQuery.value.trim().length < 3) {
    villageHits.value = []
    return
  }
  villageTimer = setTimeout(async () => {
    villageLoading.value = true
    try {
      if (selectedDistrictCode.value) {
        // Kecamatan sudah dipilih -- ambil daftar desa DI KECAMATAN itu saja,
        // difilter oleh nama yang diketik di sisi klien (daftar per kecamatan
        // biasanya kecil, tidak perlu endpoint search terpisah).
        const all = await api.get<VillageHit[]>(`/patient-portal/wilayah/villages?district_code=${selectedDistrictCode.value}`)
        const q = villageQuery.value.trim().toLowerCase()
        villageHits.value = all.filter((v) => v.name.toLowerCase().includes(q))
      } else {
        // Belum pilih kecamatan -- cari nama desa lintas kecamatan/kabupaten.
        villageHits.value = await api.get<VillageHit[]>(`/patient-portal/wilayah/villages/search?q=${encodeURIComponent(villageQuery.value.trim())}`)
      }
    } catch {
      villageHits.value = []
    } finally {
      villageLoading.value = false
    }
  }, 350)
}

function pickVillage(hit: VillageHit) {
  villageQuery.value = hit.name
  kelDesa.value = hit.name
  villageOpen.value = false
  // Kelurahan/desa dipilih langsung (tanpa pilih kecamatan dulu) -- kecamatan
  // ikut terisi otomatis dari hasilnya.
  if (hit.district_name) {
    districtQuery.value = hit.district_name
    kecamatan.value = hit.district_name
    selectedDistrictCode.value = hit.district_code
  }
}

function closeDistrictSoon() {
  setTimeout(() => { districtOpen.value = false }, 150)
}
function closeVillageSoon() {
  setTimeout(() => { villageOpen.value = false }, 150)
}
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <div class="relative">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-neutral-700">Kecamatan</span>
        <input
          v-model="districtQuery"
          type="text" placeholder="Ketik nama kecamatan"
          class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500"
          @input="onDistrictInput" @focus="districtOpen = true" @blur="closeDistrictSoon"
        >
      </label>
      <div
        v-if="districtOpen && (districtLoading || districtHits.length || districtQuery.trim().length >= 3)"
        class="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg"
      >
        <p v-if="districtLoading" class="p-3 text-xs text-neutral-400">Mencari...</p>
        <template v-else-if="districtHits.length">
          <button
            v-for="hit in districtHits" :key="hit.code" type="button"
            class="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
            @mousedown.prevent="pickDistrict(hit)"
          >
            {{ hit.name }}
            <span class="block text-xs text-neutral-400">{{ hit.regency_name }}</span>
          </button>
        </template>
        <p v-else class="p-3 text-xs text-neutral-400">
          Kecamatan tidak ditemukan di data wilayah. Nama yang diketik tetap dapat digunakan.
        </p>
      </div>
    </div>

    <div class="relative">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-neutral-700">Kelurahan/Desa</span>
        <input
          v-model="villageQuery"
          type="text" placeholder="Ketik nama kelurahan/desa"
          class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500"
          @input="onVillageInput" @focus="villageOpen = true" @blur="closeVillageSoon"
        >
      </label>
      <div
        v-if="villageOpen && (villageLoading || villageHits.length || villageQuery.trim().length >= 3)"
        class="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg"
      >
        <p v-if="villageLoading" class="p-3 text-xs text-neutral-400">Mencari...</p>
        <template v-else-if="villageHits.length">
          <button
            v-for="hit in villageHits" :key="hit.code" type="button"
            class="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
            @mousedown.prevent="pickVillage(hit)"
          >
            {{ hit.name }}
            <span v-if="!selectedDistrictCode" class="block text-xs text-neutral-400">{{ hit.district_name }}</span>
          </button>
        </template>
        <p v-else class="p-3 text-xs text-neutral-400">
          Kelurahan/desa tidak ditemukan di data wilayah. Nama yang diketik tetap dapat digunakan.
        </p>
      </div>
    </div>
  </div>
</template>
