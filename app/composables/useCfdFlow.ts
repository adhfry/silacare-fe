// State sementara antar-halaman alur CFD (nik/index.vue -> daftar-baru.vue),
// reset saat reload -- cukup untuk wizard singkat, tidak perlu persist.
export const useCfdFlow = () =>
  useState('cfd-flow', () => ({
    nik: '',
    parsedTglLahir: '' as string | undefined,
    parsedGender: '' as 'L' | 'P' | undefined,
  }))
