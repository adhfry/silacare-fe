<template>
  <div>
    <VitePwaManifest />
    <NuxtRouteAnnouncer />
    <NuxtLoadingIndicator
      :color="'linear-gradient(to right, var(--color-primary-600), var(--color-accent-500), var(--color-secondary-500))'"
      :height="3"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
