<script setup lang="ts">
/**
 * Cari FKTP (Fasilitas Kesehatan Tingkat Pertama) dari daftar Puskesmas per
 * kecamatan Sumenep, tidak ada daftar FKTP resmi lengkap (klinik swasta,
 * dokter keluarga, dst.) di sistem ini, jadi tetap boleh diisi teks bebas
 * kalau tidak ketemu di daftar (pola sama dengan WilayahPicker).
 */
const value = defineModel<string>({ default: '' })

const api = useApi()

const query = ref(value.value)
const hits = ref<string[]>([])
const open = ref(false)
const loading = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined

watch(value, (val) => { if (val !== query.value) query.value = val }, { immediate: true })

function onInput() {
  value.value = query.value
  open.value = true
  clearTimeout(timer)
  timer = setTimeout(async () => {
    loading.value = true
    try {
      hits.value = await api.get<string[]>(`/patient-portal/fktp/search?q=${encodeURIComponent(query.value.trim())}`)
    } catch {
      hits.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

function pick(name: string) {
  query.value = name
  value.value = name
  open.value = false
}

function closeSoon() {
  setTimeout(() => { open.value = false }, 150)
}

async function onFocus() {
  open.value = true
  if (!hits.value.length && !loading.value) {
    loading.value = true
    try {
      hits.value = await api.get<string[]>(`/patient-portal/fktp/search?q=${encodeURIComponent(query.value.trim())}`)
    } catch {
      hits.value = []
    } finally {
      loading.value = false
    }
  }
}
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      type="text" placeholder="Contoh: Puskesmas Kalianget"
      class="w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none focus:border-primary-500"
      @input="onInput" @focus="onFocus" @blur="closeSoon"
    >
    <div
      v-if="open && (loading || hits.length)"
      class="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg"
    >
      <p v-if="loading" class="p-3 text-xs text-neutral-400">Mencari...</p>
      <button
        v-for="hit in hits" v-else :key="hit" type="button"
        class="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
        @mousedown.prevent="pick(hit)"
      >
        {{ hit }}
      </button>
    </div>
  </div>
</template>
