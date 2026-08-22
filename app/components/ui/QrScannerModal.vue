<script setup lang="ts">
import { CameraOff, ScanLine, X } from 'lucide-vue-next'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; detected: [string] }>()

const videoId = `qr-video-${Math.random().toString(36).slice(2, 9)}`
const videoRef = ref<HTMLVideoElement | null>(null)
const isPreparing = ref(false)
const isScanning = ref(false)
const scanError = ref('')

let codeReader: import('@zxing/browser').BrowserMultiFormatReader | null = null
let scanControls: import('@zxing/browser').IScannerControls | null = null

async function waitForVideoElement(timeout = 7000, interval = 120): Promise<HTMLVideoElement | null> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (videoRef.value?.isConnected && videoRef.value.offsetWidth > 0) return videoRef.value
    const elById = document.getElementById(videoId) as HTMLVideoElement | null
    if (elById?.isConnected && elById.offsetWidth > 0) {
      videoRef.value = elById
      return elById
    }
    await new Promise((r) => setTimeout(r, interval))
  }
  return null
}

async function startScan() {
  scanError.value = ''
  isPreparing.value = true
  isScanning.value = false

  await nextTick()
  const videoEl = await waitForVideoElement()
  if (!videoEl) {
    isPreparing.value = false
    scanError.value = 'Elemen video tidak ditemukan. Coba tutup dan buka lagi.'
    return
  }

  const { BrowserMultiFormatReader } = await import('@zxing/browser')
  const { NotFoundException } = await import('@zxing/library')
  codeReader = new BrowserMultiFormatReader()

  try {
    const devices = await BrowserMultiFormatReader.listVideoInputDevices()
    if (!devices.length) throw new Error('Tidak ada kamera yang terdeteksi.')
    const backCamera = devices.find((d) => d.label.toLowerCase().includes('back')) || devices[0]

    scanControls = await codeReader.decodeFromVideoDevice(backCamera.deviceId, videoEl, (result, error) => {
      if (result) emit('detected', result.getText())
      if (error && !(error instanceof NotFoundException)) {
        scanError.value = 'Terjadi kesalahan saat membaca QR.'
      }
    })

    isPreparing.value = false
    isScanning.value = true
  } catch (err) {
    isPreparing.value = false
    isScanning.value = false
    const e = err as { name?: string; message?: string }
    scanError.value = e.name === 'NotAllowedError' || e.message?.toLowerCase().includes('permission')
      ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan browser Anda.'
      : (e.message || 'Gagal memulai kamera.')
  }
}

function stopScan() {
  try {
    scanControls?.stop()
  } catch {
    // ignore
  }
  scanControls = null
  codeReader = null
  isScanning.value = false
  isPreparing.value = false
}

function close() {
  stopScan()
  emit('update:modelValue', false)
}

watch(() => props.modelValue, async (open) => {
  if (open) {
    scanError.value = ''
    await nextTick()
    await new Promise((r) => setTimeout(r, 200))
    startScan()
  } else {
    stopScan()
  }
})

onBeforeUnmount(stopScan)
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div class="w-full max-w-sm rounded-2xl bg-white p-5">
        <div class="mb-1 flex items-center justify-between">
          <h3 class="font-heading flex items-center gap-1.5 text-base font-bold text-neutral-900">
            <ScanLine class="size-4.5" /> Pindai QR Admin
          </h3>
          <button type="button" class="text-neutral-400" aria-label="Tutup" @click="close"><X class="size-5" /></button>
        </div>
        <p class="mb-3 text-xs text-neutral-500">Arahkan kamera ke QR yang ditampilkan petugas di loket.</p>

        <div class="relative overflow-hidden rounded-xl bg-black">
          <video :id="videoId" ref="videoRef" autoplay playsinline muted class="min-h-64 w-full object-cover" />
          <div v-if="isPreparing" class="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
            <div class="size-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
            <p class="mt-2 text-xs text-neutral-300">Menyiapkan kamera...</p>
          </div>
          <div v-if="isScanning" class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="size-40 rounded-lg border-2 border-white/80" />
          </div>
          <div v-if="scanError" class="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center">
            <div>
              <p class="text-sm font-medium text-red-400">{{ scanError }}</p>
              <button type="button" class="mt-3 text-xs font-semibold text-white underline" @click="startScan">Coba Lagi</button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-neutral-200 py-3 text-sm font-semibold text-neutral-600"
          @click="close"
        >
          <CameraOff class="size-4.5" /> Tutup Kamera
        </button>
      </div>
    </div>
  </Teleport>
</template>
