/**
 * Poll status antrean CFD live, dipakai di layar sukses daftar & detail
 * riwayat, supaya pasien bisa memantau sisa berapa orang lagi di depannya
 * tanpa refresh manual. Polling sederhana (bukan Firebase/websocket) --
 * cukup untuk kebutuhan "live-ish" antrean, jauh lebih sederhana untuk
 * dirawat daripada infrastruktur push baru.
 */
export interface CfdQueueStatus {
  antrian_ke: number | null
  sisa_di_depan: number
  status: string
}

export function useCfdQueueStatus(suratHasilLabId: MaybeRefOrGetter<number | null>) {
  const api = useApi()
  const status = ref<CfdQueueStatus | null>(null)
  const errorMessage = ref('')

  let timer: ReturnType<typeof setInterval> | undefined

  async function fetchStatus() {
    const id = toValue(suratHasilLabId)
    if (!id) return
    try {
      status.value = await api.get<CfdQueueStatus>(`/cfd/queue-status/${id}`)
      errorMessage.value = ''
    } catch (err) {
      errorMessage.value = err instanceof ApiError ? err.message : 'Gagal memuat status antrean'
    }
  }

  function start(intervalMs = 8000) {
    fetchStatus()
    stop()
    timer = setInterval(fetchStatus, intervalMs)
  }

  function stop() {
    clearInterval(timer)
  }

  onBeforeUnmount(stop)

  return { status, errorMessage, start, stop, fetchStatus }
}
