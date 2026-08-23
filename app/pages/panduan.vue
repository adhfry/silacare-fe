<script setup lang="ts">
import {
  ChevronDown, UserCheck, CalendarClock, HeartPulse, UserCog,
  Fingerprint, Mail, UserPlus, QrCode, ListChecks, Sparkles,
} from 'lucide-vue-next'

// Layout guest (BUKAN dashboard) supaya halaman ini bisa dibuka baik dari
// landing page (belum login) maupun dari beranda dashboard (sudah login) --
// tidak diberi middleware apa pun sehingga aman diakses di kedua kondisi.
definePageMeta({ layout: 'guest' })

usePageSeo({
  title: 'Panduan Antrean Online',
  description: 'Panduan lengkap menggunakan SiLACARE: aktivasi akun bagi pasien lama, cara membuat antrean online, pendaftaran pemeriksaan gratis Car Free Day, dan pentingnya melengkapi data diri.',
})

type SectionId = 'aktivasi' | 'antrean' | 'cfd' | 'lengkapi'
const openSection = ref<SectionId | null>('aktivasi')
function toggle(id: SectionId) {
  openSection.value = openSection.value === id ? null : id
}
</script>

<template>
  <div class="flex flex-1 flex-col py-6">
    <div class="mb-6 text-center">
      <h1 class="font-heading text-xl font-bold text-neutral-900">Panduan Antrean Online</h1>
      <p class="mt-1.5 text-sm text-neutral-500">
        Semua yang perlu Anda ketahui tentang SiLACARE, dari aktivasi akun hingga pemeriksaan gratis Car Free Day.
      </p>
    </div>

    <div class="space-y-3 pb-8">
      <!-- 1. Sudah pernah ke Labkesda? -->
      <div class="overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
        <button type="button" class="flex w-full items-center gap-3 p-4 text-left" @click="toggle('aktivasi')">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
            <UserCheck class="size-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-800">Sudah Pernah ke Labkesda?</p>
            <p class="text-xs text-neutral-400">Cara mengaktifkan akun bagi pasien lama, atau mendaftar bagi pasien baru</p>
          </div>
          <ChevronDown class="size-4.5 shrink-0 text-neutral-300 transition-transform" :class="{ 'rotate-180': openSection === 'aktivasi' }" />
        </button>

        <div v-show="openSection === 'aktivasi'" class="space-y-5 border-t border-neutral-100 p-4 pt-4 text-sm text-neutral-600">
          <p>
            Jika Anda pernah datang dan mendaftar langsung di Labkesda dalam kurun waktu kurang lebih satu tahun terakhir,
            data Anda kemungkinan besar sudah tersimpan di sistem SiLAKES. Anda tidak perlu mendaftar dari awal, cukup
            lakukan aktivasi akun.
          </p>

          <!-- Sub A: Aktivasi akun pasien lama -->
          <div class="rounded-xl bg-primary-50/60 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-primary-700">
              <Fingerprint class="size-4 shrink-0" /> Langkah Aktivasi Akun
            </p>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">1</span>
                <p class="pt-0.5 text-xs text-neutral-600">Buka halaman Daftar, lalu masukkan NIK dan nomor HP Anda.</p>
              </div>
              <img src="/panduan/identity.png" alt="Langkah 1: isi NIK dan nomor HP di halaman Daftar" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">2</span>
                <p class="pt-0.5 text-xs text-neutral-600">Jika data ditemukan, kode OTP dikirim melalui WhatsApp ke nomor tersebut. Masukkan kode itu untuk verifikasi.</p>
              </div>
              <img src="/panduan/otp.png" alt="Langkah 2: masukkan kode OTP dari WhatsApp" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-bold text-white">3</span>
                <p class="pt-0.5 text-xs text-neutral-600">Buat kata sandi untuk akun Anda. Akun langsung aktif dan Anda masuk ke dashboard SiLACARE.</p>
              </div>
              <img src="/panduan/password.png" alt="Langkah 3: buat kata sandi akun" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>
          </div>

          <!-- Sub B: Klaim via email -->
          <div class="rounded-xl bg-secondary-50/60 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-secondary-700">
              <Mail class="size-4 shrink-0" /> Nomor HP Sudah Tidak Aktif di WhatsApp?
            </p>
            <p class="mt-1.5 text-xs text-neutral-600">
              Jika nomor HP yang tercatat di data lama Anda sudah tidak digunakan atau tidak aktif di WhatsApp, gunakan
              fitur Klaim Akun melalui Email yang tertaut pada layar verifikasi OTP. Setelah data diri Anda terverifikasi,
              kode verifikasi dikirim ke alamat email yang Anda daftarkan sebagai gantinya.
            </p>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary-600 text-[11px] font-bold text-white">1</span>
                <p class="pt-0.5 text-xs text-neutral-600">Pilih Klaim lewat Email, lalu masukkan alamat email aktif untuk menerima kode verifikasi.</p>
              </div>
              <img src="/panduan/klaim-email.png" alt="Langkah klaim akun via email: isi alamat email" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>
          </div>

          <!-- Sub C: Pasien baru -->
          <div class="rounded-xl bg-neutral-50 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <UserPlus class="size-4 shrink-0" /> Belum Pernah Terdaftar Sama Sekali?
            </p>
            <p class="mt-1.5 text-xs text-neutral-600">
              Jika NIK Anda tidak ditemukan pada langkah pertama, berarti Anda belum pernah tercatat sebagai pasien
              Labkesda. Anda dapat langsung mendaftar sebagai pasien baru dengan mengisi data diri secara mandiri.
            </p>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-bold text-white">1</span>
                <p class="pt-0.5 text-xs text-neutral-600">
                  Foto KTP untuk mengisi data secara otomatis. Bagi yang tidak membawa atau belum memiliki KTP,
                  misalnya anak-anak atau KTP yang tertinggal, pilih Tidak Memiliki KTP untuk lanjut mengisi data secara manual.
                </p>
              </div>
              <img src="/panduan/new-photo.png" alt="Langkah pendaftaran pasien baru: opsi Tidak Memiliki KTP" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>

            <div class="mt-3 space-y-1.5">
              <div class="flex items-start gap-2">
                <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[11px] font-bold text-white">2</span>
                <p class="pt-0.5 text-xs text-neutral-600">Lengkapi data diri, nomor HP aktif, dan buat kata sandi, lalu daftar. Tidak perlu verifikasi OTP untuk pendaftaran pasien baru.</p>
              </div>
              <img src="/panduan/new-form.png" alt="Langkah pendaftaran pasien baru: isi formulir data diri" class="ml-7 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Konsep antrean -->
      <div class="overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
        <button type="button" class="flex w-full items-center gap-3 p-4 text-left" @click="toggle('antrean')">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-secondary-600">
            <CalendarClock class="size-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-800">Konsep Antrean & Cara Membuat Janji</p>
            <p class="text-xs text-neutral-400">Perbedaan Buat Janji dan Antrean Online, serta cara check-in di lokasi</p>
          </div>
          <ChevronDown class="size-4.5 shrink-0 text-neutral-300 transition-transform" :class="{ 'rotate-180': openSection === 'antrean' }" />
        </button>

        <div v-show="openSection === 'antrean'" class="space-y-5 border-t border-neutral-100 p-4 pt-4 text-sm text-neutral-600">
          <p>
            SiLACARE menyediakan dua fitur yang saling melengkapi untuk membantu Anda menghindari antre lama di lokasi.
          </p>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <ListChecks class="size-4 shrink-0" /> Langkah 1: Buat Janji Pemeriksaan
            </p>
            <p class="mt-1.5 text-xs text-neutral-600">
              Pesan tanggal dan jam kedatangan serta pilih layanan pemeriksaan terlebih dahulu, sebelum Anda datang ke
              Labkesda. Pembayaran tetap dilakukan secara tunai langsung di lokasi, bukan melalui aplikasi.
            </p>
            <img src="/panduan/buat-janji.png" alt="Langkah 1: buat janji pemeriksaan, pilih tanggal dan layanan" class="mt-2 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
          </div>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <QrCode class="size-4 shrink-0" /> Langkah 2: Antrean Online
            </p>
            <p class="mt-1.5 text-xs text-neutral-600">
              Pada hari kedatangan, pindai kode QR yang tersedia di lokasi untuk check-in, lalu pantau nomor dan status
              antrean Anda melalui halaman Antrean Online agar Anda tahu kapan giliran Anda tiba tanpa perlu menunggu
              di ruang tunggu sejak awal.
            </p>
            <img src="/panduan/antrean-online.png" alt="Langkah 2: pantau status antrean online" class="mt-2 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
          </div>

          <p class="text-xs text-neutral-500">
            Singkatnya, Buat Janji digunakan sebelum kedatangan untuk memastikan jadwal, sedangkan Antrean Online
            digunakan pada hari kedatangan untuk memantau giliran pemeriksaan Anda.
          </p>
        </div>
      </div>

      <!-- 3. Panduan CFD -->
      <div class="overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
        <button type="button" class="flex w-full items-center gap-3 p-4 text-left" @click="toggle('cfd')">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <HeartPulse class="size-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-800">Panduan Daftar Pemeriksaan Gratis di CFD</p>
            <p class="text-xs text-neutral-400">Jadwal, syarat, dan ketentuan pemeriksaan gratis Car Free Day</p>
          </div>
          <ChevronDown class="size-4.5 shrink-0 text-neutral-300 transition-transform" :class="{ 'rotate-180': openSection === 'cfd' }" />
        </button>

        <div v-show="openSection === 'cfd'" class="space-y-5 border-t border-neutral-100 p-4 pt-4 text-sm text-neutral-600">
          <p>
            Labkesda menyediakan pemeriksaan kesehatan gratis setiap hari Minggu pagi mulai pukul 07.00 di area Car
            Free Day. Pendaftaran dibuka melalui SiLACARE agar Anda tidak perlu mengantre panjang di lokasi.
          </p>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <div class="flex items-start gap-2">
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">1</span>
              <p class="pt-0.5 text-xs text-neutral-600">Buka halaman Pemeriksaan Gratis CFD, lalu masukkan NIK Anda untuk mengecek kelayakan dan mendaftar.</p>
            </div>
            <img src="/panduan/cfd.png" alt="Langkah 1: masukkan NIK di halaman pemeriksaan gratis CFD" class="ml-7 mt-2 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
          </div>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <p class="text-xs font-semibold text-neutral-700">Ketentuan Pemeriksaan</p>
            <ul class="mt-2 list-disc space-y-1.5 pl-4 text-xs text-neutral-600">
              <li>Setiap pasien hanya dapat memilih satu jenis pemeriksaan tambahan per kunjungan, yaitu Asam Urat atau
                Kolesterol.</li>
              <li>Pemeriksaan gula darah (GDA/GDP) dan tekanan darah selalu disertakan secara otomatis pada setiap
                kunjungan, tanpa perlu dipilih terpisah.</li>
              <li>Setiap kategori pemeriksaan memiliki jeda empat minggu sebelum dapat diperiksa kembali.</li>
              <li>Kuota pendaftaran dibatasi setiap harinya, sehingga disarankan mendaftar sesegera mungkin setelah
                pendaftaran dibuka pada pukul 07.00.</li>
            </ul>
          </div>

          <p class="text-xs text-neutral-500">
            Status kelayakan pemeriksaan Anda, termasuk jadwal berikutnya jika sedang dalam masa jeda, dapat dilihat
            langsung pada beranda dashboard setelah Anda masuk ke akun SiLACARE.
          </p>
        </div>
      </div>

      <!-- 4. Lengkapi data diri -->
      <div class="overflow-hidden rounded-2xl bg-white shadow-sm shadow-neutral-200/60">
        <button type="button" class="flex w-full items-center gap-3 p-4 text-left" @click="toggle('lengkapi')">
          <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <UserCog class="size-4.5" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-neutral-800">Lengkapi Data Diri ke 100%</p>
            <p class="text-xs text-neutral-400">Mengapa kelengkapan data penting setelah akun Anda aktif</p>
          </div>
          <ChevronDown class="size-4.5 shrink-0 text-neutral-300 transition-transform" :class="{ 'rotate-180': openSection === 'lengkapi' }" />
        </button>

        <div v-show="openSection === 'lengkapi'" class="space-y-5 border-t border-neutral-100 p-4 pt-4 text-sm text-neutral-600">
          <p>
            Setelah akun Anda aktif, sebagian data diri yang tersimpan mungkin belum lengkap, terutama bagi pasien
            lama yang datanya sudah cukup lama tercatat.
          </p>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <div class="flex items-start gap-2">
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">1</span>
              <p class="pt-0.5 text-xs text-neutral-600">Buka halaman Akun untuk melihat persentase kelengkapan data diri Anda saat ini.</p>
            </div>
            <img src="/panduan/akun-completeness.png" alt="Langkah 1: cek persentase kelengkapan data di halaman Akun" class="ml-7 mt-2 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
          </div>

          <div class="rounded-xl bg-neutral-50 p-3.5">
            <div class="flex items-start gap-2">
              <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">2</span>
              <p class="pt-0.5 text-xs text-neutral-600">Pilih Update Informasi Pasien, lengkapi data yang masih kosong, lalu ajukan perubahan.</p>
            </div>
            <img src="/panduan/update-data.png" alt="Langkah 2: lengkapi formulir Update Informasi Pasien" class="ml-7 mt-2 w-40 rounded-xl border border-neutral-200 shadow-sm" loading="lazy">
          </div>

          <div class="rounded-xl bg-amber-50/60 p-3.5">
            <p class="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <Sparkles class="size-4 shrink-0" /> Manfaat Melengkapi Data
            </p>
            <p class="mt-1.5 text-xs text-neutral-600">
              Data diri yang lengkap dan akurat membantu petugas Labkesda memberikan pelayanan yang lebih cepat dan
              tepat saat Anda melakukan pemeriksaan, mulai dari proses pendaftaran di lokasi hingga penerbitan hasil
              pemeriksaan.
            </p>
          </div>

          <p class="text-xs text-neutral-500">
            Perubahan yang Anda ajukan akan diperiksa dan disetujui oleh petugas Labkesda sebelum diperbarui pada
            data resmi Anda.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
