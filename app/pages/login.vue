<script setup lang="ts">
definePageMeta({ layout: 'guest', middleware: 'guest-only' })

usePageSeo({
  title: 'Masuk',
  description: 'Masuk ke akun SiLACARE menggunakan nomor HP terdaftar Anda untuk melihat riwayat pemeriksaan dan antrean online.',
})

const api = useApi()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

const phone = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (!phone.value || !password.value) {
    errorMessage.value = 'Nomor HP dan kata sandi wajib diisi'
    return
  }

  loading.value = true
  try {
    const data = await api.post('/patient-portal/auth/login', {
      phone: phone.value,
      password: password.value,
    })
    auth.setToken(data.token)
    auth.setProfile(data.profile)
    const redirect = (route.query.redirect as string) || '/dashboard'
    await router.push(redirect)
  } catch (err) {
    errorMessage.value = err instanceof ApiError ? err.message : 'Terjadi kesalahan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex flex-1 flex-col py-8">
    <div class="mb-8 flex flex-col items-center text-center">
      <AppLogo size-class="h-16 w-16" />
      <h1 class="font-heading mt-3 text-xl font-bold text-neutral-900">Masuk ke SiLACARE</h1>
      <p class="mt-1 text-sm text-neutral-500">Gunakan nomor HP terdaftar Anda</p>
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <AppAlert v-if="errorMessage" variant="error">{{ errorMessage }}</AppAlert>

      <AppInput
        v-model="phone" label="Nomor HP" type="tel" inputmode="tel"
        placeholder="08xxxxxxxxxx" required
      />
      <AppInput v-model="password" label="Kata Sandi" type="password" placeholder="Kata sandi Anda" required />
      <div class="text-right">
        <NuxtLink to="/lupa-password" class="text-xs font-medium text-primary-600">Lupa kata sandi?</NuxtLink>
      </div>

      <AppButton type="submit" class="w-full" :loading="loading">Masuk</AppButton>
    </form>

    <div class="mt-6 text-center text-sm text-neutral-500">
      Belum punya akun?
      <NuxtLink to="/daftar" class="font-semibold text-primary-600">Daftar sekarang</NuxtLink>
    </div>
  </div>
</template>
