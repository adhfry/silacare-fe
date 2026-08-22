import { scanKtpWithGemini, type KtpOcrResult } from '~/services/ktpOcr'

export interface KtpFormFields {
  name: string
  gender: 'L' | 'P' | ''
  tempat_lahir: string
  tgl_lahir: string
  alamat: string
  rt_rw: string
  kel_desa: string
  kecamatan: string
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Alur "foto KTP -> OCR client-side -> isi form otomatis" yang dipakai bareng
 * oleh /daftar (pasien baru mandiri) dan /cfd/daftar-baru (pasien baru CFD) --
 * model & key OCR SAMA PERSIS dengan FE_SiLAKES (lihat services/ktpOcr.ts).
 */
export function useKtpScan(crossCheckNik?: () => string | undefined) {
  const photoBase64 = ref('')
  const ocrLoading = ref(false)
  const ocrResult = ref<KtpOcrResult | null>(null)
  const nikMismatch = ref(false)
  const errorMessage = ref('')

  const form = reactive<KtpFormFields>({
    name: '',
    gender: '',
    tempat_lahir: '',
    alamat: '',
    tgl_lahir: '',
    rt_rw: '',
    kel_desa: '',
    kecamatan: '',
  })

  async function handlePhoto(event: Event, onDone?: () => void) {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return

    errorMessage.value = ''
    photoBase64.value = await readFileAsBase64(file)
    await runOcr(onDone)
  }

  async function runOcr(onDone?: () => void) {
    ocrLoading.value = true
    errorMessage.value = ''
    try {
      const result = await scanKtpWithGemini(photoBase64.value)
      ocrResult.value = result

      const nikToCheck = crossCheckNik?.()
      nikMismatch.value = !!nikToCheck && !!result.nik && result.nik !== nikToCheck

      form.name = result.nama || ''
      form.gender = result.jenis_kelamin?.toUpperCase().startsWith('L') ? 'L' : result.jenis_kelamin ? 'P' : ''
      form.tempat_lahir = result.tempat_lahir || ''
      if (result.tanggal_lahir) {
        const [d, m, y] = result.tanggal_lahir.split('-')
        if (d && m && y) form.tgl_lahir = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      }
      form.alamat = result.alamat || ''
      form.rt_rw = result.rt_rw || ''
      form.kel_desa = result.kel_desa || ''
      form.kecamatan = result.kecamatan || ''
    } catch (err: any) {
      errorMessage.value = err?.message || 'Gagal membaca KTP secara otomatis. Anda tetap bisa mengisi data secara manual.'
    } finally {
      ocrLoading.value = false
      onDone?.()
    }
  }

  function retakePhoto() {
    photoBase64.value = ''
    ocrResult.value = null
    nikMismatch.value = false
  }

  return { photoBase64, ocrLoading, ocrResult, nikMismatch, errorMessage, form, handlePhoto, retakePhoto }
}
