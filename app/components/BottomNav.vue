<script setup lang="ts">
import { Home, FileText, CalendarClock, User } from 'lucide-vue-next'

const route = useRoute()

const items = [
  { to: '/dashboard', label: 'Beranda', icon: Home },
  { to: '/dashboard/antrean', label: 'Antrean', icon: CalendarClock },
  { to: '/dashboard/riwayat', label: 'Riwayat', icon: FileText },
  { to: '/dashboard/akun', label: 'Akun', icon: User },
]

function isActive(to: string) {
  return to === '/dashboard' ? route.path === to : route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200 safe-bottom">
    <div class="max-w-md mx-auto grid grid-cols-4">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
        :class="isActive(item.to) ? 'text-primary-600' : 'text-neutral-400'"
      >
        <component :is="item.icon" class="size-5" :stroke-width="isActive(item.to) ? 2.5 : 2" />
        {{ item.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
