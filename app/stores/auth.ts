import { defineStore } from 'pinia'

interface PatientProfile {
  id: number
  status: string
  phone: string
  phone_verified: boolean
  last_login_at: string | null
  completeness: { percent: number; missing_fields: string[] } | null
  patient: {
    no_reg: string
    name: string
    nik: string
    nik_masked: string
    gender: 'L' | 'P'
    tempat_lahir: string
    tgl_lahir: string
    golongan_darah: string | null
    agama: string | null
    status_perkawinan: string | null
    pekerjaan: string | null
    phone: string | null
    email: string | null
    fktp: string | null
    alamat: string
    rt_rw: string | null
    kel_desa: string | null
    kecamatan: string | null
    is_bpjs: boolean
    no_bpjs: string | null
    is_perokok: boolean
    jenis_perokok: string | null
  }
}

const STORAGE_KEY = 'silacare_token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const profile = ref<PatientProfile | null>(null)
  const isLoggedIn = computed(() => !!token.value)

  function setToken(value: string) {
    token.value = value
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, value)
  }

  function loadToken() {
    if (import.meta.client) {
      token.value = localStorage.getItem(STORAGE_KEY)
    }
  }

  function setProfile(value: PatientProfile) {
    profile.value = value
  }

  function logout() {
    token.value = null
    profile.value = null
    if (import.meta.client) localStorage.removeItem(STORAGE_KEY)
  }

  return { token, profile, isLoggedIn, setToken, loadToken, setProfile, logout }
})
