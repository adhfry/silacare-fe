import { jsPDF } from 'jspdf'

/**
 * Konten PDF SENGAJA ditulis manual di sini (bukan mengambil dari DOM
 * panduan.vue) supaya hasilnya rapi & terkontrol -- semua screenshot di
 * /public/panduan/*.png berdimensi SAMA PERSIS (365x757, hasil crop mobile,
 * lihat proses screenshotnya), jadi rasio gambar di bawah (IMG_RATIO)
 * berlaku untuk semua tanpa perlu dihitung ulang per gambar. Isinya wajib
 * disinkronkan manual kalau app/pages/panduan.vue diubah.
 */
interface PdfStep {
  text: string
  image?: string
}
interface PdfBlock {
  heading?: string
  color?: [number, number, number]
  paragraphs?: string[]
  steps?: PdfStep[]
  bullets?: string[]
}
interface PdfSection {
  title: string
  intro: string
  blocks: PdfBlock[]
  outro?: string
}

const BLUE: [number, number, number] = [12, 121, 212]
const GREEN: [number, number, number] = [20, 163, 105]
const GRAY: [number, number, number] = [64, 64, 64]
const RED: [number, number, number] = [220, 38, 38]
const AMBER: [number, number, number] = [217, 119, 6]

const SECTIONS: PdfSection[] = [
  {
    title: '1. Sudah Pernah ke Labkesda?',
    intro: 'Jika Anda pernah datang dan mendaftar langsung di Labkesda dalam kurun waktu kurang lebih satu tahun terakhir, data Anda kemungkinan besar sudah tersimpan di sistem SiLAKES. Anda tidak perlu mendaftar dari awal, cukup lakukan aktivasi akun.',
    blocks: [
      {
        heading: 'Langkah Aktivasi Akun',
        color: BLUE,
        steps: [
          { text: 'Buka halaman Daftar, lalu masukkan NIK dan nomor HP Anda.', image: '/panduan/identity.png' },
          { text: 'Jika data ditemukan, kode OTP dikirim melalui WhatsApp ke nomor tersebut. Masukkan kode itu untuk verifikasi.', image: '/panduan/otp.png' },
          { text: 'Buat kata sandi untuk akun Anda. Akun langsung aktif dan Anda masuk ke dashboard SiLACARE.', image: '/panduan/password.png' },
        ],
      },
      {
        heading: 'Nomor HP Sudah Tidak Aktif di WhatsApp?',
        color: GREEN,
        paragraphs: ['Jika nomor HP yang tercatat di data lama Anda sudah tidak digunakan atau tidak aktif di WhatsApp, gunakan fitur Klaim Akun melalui Email yang tertaut pada layar verifikasi OTP. Setelah data diri Anda terverifikasi, kode verifikasi dikirim ke alamat email yang Anda daftarkan sebagai gantinya.'],
        steps: [
          { text: 'Pilih Klaim lewat Email, lalu masukkan alamat email aktif untuk menerima kode verifikasi.', image: '/panduan/klaim-email.png' },
        ],
      },
      {
        heading: 'Belum Pernah Terdaftar Sama Sekali?',
        color: GRAY,
        paragraphs: ['Jika NIK Anda tidak ditemukan pada langkah pertama, berarti Anda belum pernah tercatat sebagai pasien Labkesda. Anda dapat langsung mendaftar sebagai pasien baru dengan mengisi data diri secara mandiri.'],
        steps: [
          { text: 'Foto KTP untuk mengisi data secara otomatis. Bagi yang tidak membawa atau belum memiliki KTP, misalnya anak-anak atau KTP yang tertinggal, pilih Tidak Memiliki KTP untuk lanjut mengisi data secara manual.', image: '/panduan/new-photo.png' },
          { text: 'Lengkapi data diri, nomor HP aktif, dan buat kata sandi, lalu daftar. Tidak perlu verifikasi OTP untuk pendaftaran pasien baru.', image: '/panduan/new-form.png' },
        ],
      },
    ],
  },
  {
    title: '2. Konsep Antrean & Cara Membuat Janji',
    intro: 'SiLACARE menyediakan dua fitur yang saling melengkapi untuk membantu Anda menghindari antre lama di lokasi.',
    blocks: [
      {
        heading: 'Langkah 1: Buat Janji Pemeriksaan',
        color: GRAY,
        paragraphs: ['Pesan tanggal dan jam kedatangan serta pilih layanan pemeriksaan terlebih dahulu, sebelum Anda datang ke Labkesda. Pembayaran tetap dilakukan secara tunai langsung di lokasi, bukan melalui aplikasi.'],
        steps: [{ text: '', image: '/panduan/buat-janji.png' }],
      },
      {
        heading: 'Langkah 2: Antrean Online',
        color: GRAY,
        paragraphs: ['Pada hari kedatangan, pindai kode QR yang tersedia di lokasi untuk check-in, lalu pantau nomor dan status antrean Anda melalui halaman Antrean Online agar Anda tahu kapan giliran Anda tiba tanpa perlu menunggu di ruang tunggu sejak awal.'],
        steps: [{ text: '', image: '/panduan/antrean-online.png' }],
      },
    ],
    outro: 'Singkatnya, Buat Janji digunakan sebelum kedatangan untuk memastikan jadwal, sedangkan Antrean Online digunakan pada hari kedatangan untuk memantau giliran pemeriksaan Anda.',
  },
  {
    title: '3. Panduan Daftar Pemeriksaan Gratis di CFD',
    intro: 'Labkesda menyediakan pemeriksaan kesehatan gratis setiap hari Minggu pagi mulai pukul 07.00 di area Car Free Day. Pendaftaran dibuka melalui SiLACARE agar Anda tidak perlu mengantre panjang di lokasi.',
    blocks: [
      {
        color: RED,
        steps: [{ text: 'Buka halaman Pemeriksaan Gratis CFD, lalu masukkan NIK Anda untuk mengecek kelayakan dan mendaftar.', image: '/panduan/cfd.png' }],
      },
      {
        heading: 'Ketentuan Pemeriksaan',
        color: GRAY,
        bullets: [
          'Setiap pasien hanya dapat memilih satu jenis pemeriksaan tambahan per kunjungan, yaitu Asam Urat atau Kolesterol.',
          'Pemeriksaan gula darah (GDA/GDP) dan tekanan darah selalu disertakan secara otomatis pada setiap kunjungan, tanpa perlu dipilih terpisah.',
          'Setiap kategori pemeriksaan memiliki jeda empat minggu sebelum dapat diperiksa kembali.',
          'Kuota pendaftaran dibatasi setiap harinya, sehingga disarankan mendaftar sesegera mungkin setelah pendaftaran dibuka pada pukul 07.00.',
        ],
      },
    ],
    outro: 'Status kelayakan pemeriksaan Anda, termasuk jadwal berikutnya jika sedang dalam masa jeda, dapat dilihat langsung pada beranda dashboard setelah Anda masuk ke akun SiLACARE.',
  },
  {
    title: '4. Lengkapi Data Diri ke 100%',
    intro: 'Setelah akun Anda aktif, sebagian data diri yang tersimpan mungkin belum lengkap, terutama bagi pasien lama yang datanya sudah cukup lama tercatat.',
    blocks: [
      {
        color: AMBER,
        steps: [
          { text: 'Buka halaman Akun untuk melihat persentase kelengkapan data diri Anda saat ini.', image: '/panduan/akun-completeness.png' },
          { text: 'Pilih Update Informasi Pasien, lengkapi data yang masih kosong, lalu ajukan perubahan.', image: '/panduan/update-data.png' },
        ],
      },
      {
        heading: 'Manfaat Melengkapi Data',
        color: AMBER,
        paragraphs: ['Data diri yang lengkap dan akurat membantu petugas Labkesda memberikan pelayanan yang lebih cepat dan tepat saat Anda melakukan pemeriksaan, mulai dari proses pendaftaran di lokasi hingga penerbitan hasil pemeriksaan.'],
      },
    ],
    outro: 'Perubahan yang Anda ajukan akan diperiksa dan disetujui oleh petugas Labkesda sebelum diperbarui pada data resmi Anda.',
  },
]

const PAGE_W = 210
const PAGE_H = 297
const MARGIN_X = 15
const TOP_Y = 20
const BOTTOM_Y = 282
const TEXT_W = 112
const IMG_W = 42
const IMG_RATIO = 757 / 365
const IMG_H = IMG_W * IMG_RATIO
const IMG_X = PAGE_W - MARGIN_X - IMG_W

async function loadImageAsDataUrl(path: string): Promise<string> {
  const res = await fetch(path)
  const blob = await res.blob()
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Gagal memuat gambar ' + path))
    reader.readAsDataURL(blob)
  })
}

export async function downloadPanduanPdf(): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  let y = TOP_Y

  function ensureSpace(needed: number) {
    if (y + needed > BOTTOM_Y) {
      doc.addPage()
      y = TOP_Y
    }
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(15, 23, 42)
  doc.text('Panduan Antrean Online', MARGIN_X, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139)
  const subtitle = doc.splitTextToSize(
    'Panduan lengkap SiLACARE: aktivasi akun, konsep antrean, pemeriksaan gratis Car Free Day, dan kelengkapan data diri.',
    PAGE_W - MARGIN_X * 2,
  )
  doc.text(subtitle, MARGIN_X, y)
  y += subtitle.length * 5 + 8

  for (const section of SECTIONS) {
    ensureSpace(16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(15, 23, 42)
    doc.text(section.title, MARGIN_X, y)
    y += 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(71, 85, 105)
    const introLines = doc.splitTextToSize(section.intro, PAGE_W - MARGIN_X * 2)
    ensureSpace(introLines.length * 4.6 + 5)
    doc.text(introLines, MARGIN_X, y)
    y += introLines.length * 4.6 + 5

    for (const block of section.blocks) {
      const color = block.color ?? GRAY

      if (block.heading) {
        ensureSpace(8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10.5)
        doc.setTextColor(...color)
        doc.text(block.heading, MARGIN_X, y)
        y += 6
      }

      if (block.paragraphs) {
        for (const p of block.paragraphs) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          const lines = doc.splitTextToSize(p, PAGE_W - MARGIN_X * 2)
          ensureSpace(lines.length * 4.3 + 4)
          doc.text(lines, MARGIN_X, y)
          y += lines.length * 4.3 + 4
        }
      }

      if (block.steps) {
        for (let i = 0; i < block.steps.length; i++) {
          const step = block.steps[i]
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          const hasNumber = step.text.length > 0
          const lines = hasNumber ? doc.splitTextToSize(step.text, TEXT_W - 8) : []
          const textHeight = lines.length * 4.3
          const rowHeight = step.image ? IMG_H : 0
          const blockHeight = Math.max(textHeight, rowHeight) + 5
          ensureSpace(blockHeight)

          if (hasNumber) {
            doc.setFillColor(...color)
            doc.circle(MARGIN_X + 2.3, y - 1, 2.3, 'F')
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(7)
            doc.setTextColor(255, 255, 255)
            doc.text(String(i + 1), MARGIN_X + 2.3, y - 0.55, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(51, 65, 85)
            doc.text(lines, MARGIN_X + 8, y)
          }

          if (step.image) {
            try {
              const dataUrl = await loadImageAsDataUrl(step.image)
              doc.addImage(dataUrl, 'PNG', IMG_X, y - 4, IMG_W, IMG_H)
            } catch {
              // Gagal memuat satu gambar tidak boleh menggagalkan seluruh PDF -- lewati saja.
            }
          }

          y += blockHeight
        }
      }

      if (block.bullets) {
        for (const b of block.bullets) {
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(9)
          doc.setTextColor(71, 85, 105)
          const lines = doc.splitTextToSize('•  ' + b, PAGE_W - MARGIN_X * 2 - 4)
          ensureSpace(lines.length * 4.3 + 2)
          doc.text(lines, MARGIN_X + 2, y)
          y += lines.length * 4.3 + 2
        }
        y += 2
      }
    }

    if (section.outro) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8.5)
      doc.setTextColor(100, 116, 139)
      const lines = doc.splitTextToSize(section.outro, PAGE_W - MARGIN_X * 2)
      ensureSpace(lines.length * 4 + 10)
      doc.text(lines, MARGIN_X, y)
      y += lines.length * 4 + 10
    } else {
      y += 4
    }
  }

  doc.save('panduan-antrean-online-silacare.pdf')
}
