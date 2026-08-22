<script setup lang="ts">
withDefaults(defineProps<{ sizeClass?: string }>(), {
  sizeClass: 'h-10 w-10',
})

const auth = useAuthStore()
const destination = computed(() => (auth.isLoggedIn ? '/dashboard' : '/'))
</script>

<template>
  <NuxtLink :to="destination" aria-label="Beranda SiLACARE">
    <img src="/logo/silacare-logo.png" alt="SiLACARE" :class="sizeClass" class="object-contain">
  </NuxtLink>
</template>
