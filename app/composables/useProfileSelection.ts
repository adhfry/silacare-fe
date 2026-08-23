/**
 * State singkat (in-memory, BUKAN localStorage) untuk alur "pilih profil" --
 * dipakai saat satu nomor HP terhubung ke 2+ akun (anggota keluarga berbagi
 * nomor, lihat AuthController::login()/selectProfile() di backend). Data ini
 * sensitif (NIK lengkap tiap anggota keluarga) & berumur pendek (selection_token
 * dari backend juga cuma valid 5 menit), jadi SENGAJA tidak ikut disimpan ke
 * localStorage seperti usePersistedFlow -- kalau halaman di-refresh langsung
 * tanpa lewat login/tombol "Pindah Profil", state ini kosong dan pilih-profil.vue
 * akan redirect balik ke /login.
 *
 * useState() (bukan module-level ref biasa) supaya aman dipakai di konteks SSR
 * Nuxt (state per-request di server, tetap reaktif & shared antar komponen di client).
 */
export interface SelectionProfile {
  patient_id: number
  name: string
  nik: string
  tempat_lahir: string
  tgl_lahir: string
  gender: 'L' | 'P'
  is_current?: boolean
}

export function useProfileSelection() {
  const mode = useState<'login' | 'switch' | null>('profile-selection-mode', () => null)
  const selectionToken = useState<string | null>('profile-selection-token', () => null)
  const profiles = useState<SelectionProfile[]>('profile-selection-profiles', () => [])

  function setLoginCandidates(token: string, list: SelectionProfile[]) {
    mode.value = 'login'
    selectionToken.value = token
    profiles.value = list
  }

  function setSwitchCandidates(list: SelectionProfile[]) {
    mode.value = 'switch'
    selectionToken.value = null
    profiles.value = list
  }

  function clear() {
    mode.value = null
    selectionToken.value = null
    profiles.value = []
  }

  return { mode, selectionToken, profiles, setLoginCandidates, setSwitchCandidates, clear }
}
