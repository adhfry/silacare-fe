/**
 * Wrapper tipis di atas $fetch untuk memanggil api/patient-portal/* &
 * api/cfd/* SiLAKES. Envelope response backend selalu {status, data, message}
 * (lihat app/Helpers/ResponseHelper.php di backend) -- ApiError di bawah
 * membawa pesan yang sudah pantas ditampilkan langsung ke pasien (Bahasa
 * Indonesia, dari backend), tidak perlu diterjemahkan lagi di sini.
 */
export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string[]>

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

interface ApiEnvelope<T> {
  status: 'success' | 'error'
  data: T
  message: string
}

export function useApi() {
  const config = useRuntimeConfig()
  const auth = useAuthStore()

  async function request<T = any>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: Record<string, any>): Promise<T> {
    try {
      const res = await $fetch<ApiEnvelope<T>>(`${config.public.apiBase}${path}`, {
        method,
        body,
        headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
      })
      return res.data
    } catch (err: any) {
      const payload = err?.data as ApiEnvelope<any> | undefined
      const message = payload?.message || 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
      const fieldErrors = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
        ? (payload.data as Record<string, string[]>)
        : undefined
      throw new ApiError(typeof message === 'string' ? message : 'Terjadi kesalahan', err?.response?.status || 0, fieldErrors)
    }
  }

  return {
    get: <T = any>(path: string) => request<T>('GET', path),
    post: <T = any>(path: string, body?: Record<string, any>) => request<T>('POST', path, body),
    patch: <T = any>(path: string, body?: Record<string, any>) => request<T>('PATCH', path, body),
  }
}
