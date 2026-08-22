<script setup lang="ts">
// Digantikan oleh /daftar (alur terpadu: NIK+HP -> aktivasi pasien lama ATAU
// pendaftaran pasien baru, tergantung status di SiLAKES). Redirect permanen
// di sisi client supaya tautan/bookmark lama tetap berfungsi.
definePageMeta({ layout: 'guest' })

await navigateTo('/daftar', { replace: true })
</script>

<template>
  <div />
</template>
