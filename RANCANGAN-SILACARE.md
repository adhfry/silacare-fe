# Implementasi SiLACARE sebagai Patient Portal di atas Backend SiLAKES

Saya ingin mengembangkan **SiLACARE**, yaitu portal digital pasien untuk Labkesda.

## KEPUTUSAN ARSITEKTUR — WAJIB DIIKUTI

SiLACARE **BUKAN backend baru yang memiliki database pasien sendiri**.

Backend SiLACARE harus menggunakan **backend Laravel SiLAKES yang sudah ada** sebagai backend utama dan **SiLAKES tetap menjadi Single Source of Truth untuk data pasien dan data pemeriksaan**.

Yang dibuat baru adalah:

1. Frontend web SiLACARE menggunakan Nuxt.
2. API layer khusus Patient Portal di dalam backend Laravel SiLAKES.
3. Tabel/account khusus untuk autentikasi pasien portal.
4. Modul pendaftaran CFD.
5. Endpoint dan response khusus yang aman untuk pasien.

JANGAN membuat database pasien kedua.
JANGAN membuat tabel `patients` kedua.
JANGAN melakukan sinkronisasi dua database pasien.

---

# 1. Arsitektur yang diinginkan

Gunakan pola:

Nuxt SiLACARE
↓ HTTPS
Laravel SiLAKES
↓
Database SiLAKES

Di backend Laravel SiLAKES, buat boundary API khusus:

`/api/patient-portal/...`

Backend internal SiLAKES tetap berjalan seperti sekarang dan jangan dirusak.

SiLACARE harus dianggap sebagai **Patient Experience Layer di atas SiLAKES**.

---

# 2. Pisahkan API internal dan Patient Portal API

Jangan expose model/database SiLAKES secara langsung ke pasien.

Buat controller khusus, misalnya:

`app/Http/Controllers/PatientPortal/`

Contoh:

* `AuthController`
* `ProfileController`
* `HistoryController`
* `ResultController`
* `QueueController`
* `CfdController`

Jika struktur project saat ini memiliki struktur yang lebih baik, ikuti konvensi existing project daripada memaksakan struktur baru.

---

# 3. Gunakan Service Layer

Jangan menaruh seluruh business logic di controller.

Jika sesuai dengan arsitektur project, buat service seperti:

* `PatientIdentityService`
* `PatientActivationService`
* `PatientHistoryService`
* `PatientResultService`
* `PatientQueueService`
* `CfdEligibilityService`
* `CfdRegistrationService`

Controller harus tipis dan mendelegasikan business logic ke service.

---

# 4. Patient Portal Account

Data pasien tetap menggunakan tabel/model pasien SiLAKES yang sudah ada.

Tetapi akun untuk login portal pasien harus terpisah dari akun pegawai/internal.

Buat tabel seperti:

`patient_portal_accounts`

Minimal memiliki relasi ke patient SiLAKES:

* `id`
* `patient_id` atau foreign key sesuai struktur patient existing
* `phone`
* `password`
* `phone_verified_at`
* `status`
* `last_login_at`
* timestamps

Gunakan nama dan foreign key yang sesuai dengan schema existing.

Jangan membuat pasien baru ketika seseorang hanya membuat akun portal.

Relasinya:

`patient_portal_account → existing SiLAKES patient`

---

# 5. Existing Patient Activation

Ini adalah flow utama.

Jika pasien sudah ada di SiLAKES tetapi belum memiliki akun SiLACARE:

Input:

* NIK
* nomor HP

Backend:

1. Validasi NIK.
2. Cari pasien pada database SiLAKES.
3. Jika pasien ditemukan:

   * cek apakah sudah memiliki `patient_portal_account`.
4. Jika belum:

   * lakukan verifikasi nomor HP.
   * kirim OTP jika mekanisme OTP sudah tersedia.
   * setelah berhasil diverifikasi, pasien dapat membuat password.
5. Buat `patient_portal_account` yang menunjuk ke patient SiLAKES yang sudah ada.

Jangan membuat record pasien baru.

Jika NIK ditemukan tetapi nomor HP tidak cocok atau kosong, jangan otomatis memberikan akses.

Gunakan flow verifikasi tambahan yang aman.

---

# 6. Authentication

Akun pasien harus dipisahkan dari user internal SiLAKES.

Gunakan mekanisme authentication yang sesuai dengan stack Laravel existing, misalnya Sanctum jika memang sudah digunakan.

Jangan menggunakan:

NIK sebagai password.

Jangan menggunakan:

tanggal lahir sebagai password.

NIK hanya digunakan sebagai identity lookup.

Authentication tetap menggunakan credential yang aman, misalnya:

NIK/identifier + password

atau mekanisme activation + OTP + password sesuai rancangan.

---

# 7. Patient Dashboard

SiLACARE harus nantinya dapat menyediakan:

* profil pasien
* riwayat pemeriksaan
* hasil pemeriksaan yang boleh dilihat pasien
* status pemeriksaan
* antrean online
* pendaftaran layanan
* status pembayaran
* CFD gratis

Tetapi jangan langsung expose seluruh field database SiLAKES.

---

# 8. API Resources / Response

WAJIB gunakan response/resource khusus Patient Portal.

Jangan melakukan:

`return Patient::find(...)`

secara mentah.

Buat API Resource khusus seperti:

* `PatientProfileResource`
* `PatientHistoryResource`
* `PatientResultResource`
* `PatientQueueResource`
* `CfdRegistrationResource`

Pastikan field internal SiLAKES tidak bocor.

Contohnya data internal seperti:

* internal notes
* internal validation data
* internal user IDs
* machine/internal metadata
* data administrasi internal
* audit information

tidak boleh dikirim ke browser pasien kecuali memang diperlukan.

---

# 9. CFD Public Registration

CFD adalah public flow dan TIDAK membutuhkan login.

Flow:

NIK
↓
Validasi NIK (cek dari segi wilayah dan gender)
↓
Cari pasien di SiLAKES
↓
Cek eligibility
↓
Pilih pemeriksaan
↓
Daftar CFD
↓
Nomor antrean

Pilihan pemeriksaan:

* Kolesterol
* Asam urat

Pemeriksaan dasar otomatis mencakup:

* GDA/GDP sesuai aturan layanan
* Tekanan darah

Gunakan business rule yang jelas dan jangan hard-code di controller.

---

# 10. Validasi NIK

Validasi NIK tidak boleh hanya:

`strlen($nik) === 16`

Buat validator khusus.

Minimal validasi:

1. tepat 16 digit
2. hanya angka
3. kode wilayah valid berdasarkan master wilayah yang digunakan sistem
4. tanggal pada NIK valid
5. bulan valid
6. aturan gender berdasarkan tanggal NIK diperhitungkan
7. jika pasien ditemukan di SiLAKES, cocokkan identitas dengan data existing

PENTING:

Validasi struktur NIK tidak sama dengan verifikasi kepemilikan NIK.

Jangan menyatakan bahwa seseorang "terverifikasi" hanya karena 16 digitnya valid.

---

# 11. CFD jika NIK belum ditemukan

Jika NIK valid tetapi belum ditemukan di SiLAKES:

Tampilkan flow:

NIK
↓
Foto KTP
↓
OCR KTP
↓
Input nomor HP
↓
OTP/verifikasi
↓
Validasi hasil OCR
↓
Pendaftaran CFD

NIK yang dimasukkan secara manual harus dibandingkan dengan NIK hasil OCR. sekaligus pasien terdaftar menjadi pasien labkesda dengan nomor register yang sudah disediakan

Jika:

`NIK input != NIK OCR`

tolak proses dan minta pengguna memperbaiki foto/data.

Jangan langsung percaya hasil OCR.

---

# 12. KTP

Foto KTP adalah data sensitif.

Jangan menyimpan KTP di public storage.

Gunakan private storage.

Simpan metadata proses verifikasi jika diperlukan, misalnya:

* document path
* OCR result
* OCR confidence
* verification status
* verified_at
* verified_by

Tetapi jangan menyimpan data yang tidak diperlukan.

---

# 13. Online Queue

Pasien yang sudah login dapat:

* memilih layanan
* memilih tanggal
* memilih waktu
* mendapatkan nomor antrean
* melihat status antrean

Status pembayaran cash harus dibedakan dari status pendaftaran.

Jangan menganggap pendaftaran online = sudah bayar.

Gunakan status seperti:

`WAITING_PAYMENT`

kemudian admin memverifikasi pembayaran cash:

`PAID`

Baru setelah itu status pelayanan dapat diproses sesuai workflow SiLAKES.

---

# 14. Database Principle

Jangan membuat:

`silakes_patients`

atau:

`silacare_patients`

sebagai duplikasi pasien.

Gunakan patient master yang sudah ada.

SiLACARE hanya menambahkan data yang memang merupakan kebutuhan portal, misalnya:

`patient_portal_accounts`

dan data transaksi/pendaftaran CFD jika memang belum tersedia pada schema existing.

Sebelum membuat migration baru, periksa terlebih dahulu schema dan model existing SiLAKES.

---

# 15. WAJIB AUDIT CODE EXISTING TERLEBIH DAHULU

Sebelum menulis kode:

1. Periksa struktur Laravel SiLAKES.
2. Periksa model Patient.
3. Periksa migration/table pasien.
4. Periksa authentication existing.
5. Periksa Sanctum jika digunakan.
6. Periksa route API.
7. Periksa API Resource/response helper existing.
8. Periksa modul pendaftaran.
9. Periksa modul antrean.
10. Periksa struktur pemeriksaan laboratorium.
11. Periksa bagaimana data hasil laboratorium saat ini diakses.
12. Periksa apakah sudah ada service/repository pattern.
13. Ikuti konvensi coding existing.

Jangan mengarang nama tabel, field, model, atau relasi sebelum memeriksa project.

---

# 16. Jangan merusak sistem internal

SiLAKES adalah sistem production/internal.

Karena itu:

* jangan mengubah behaviour endpoint existing tanpa alasan
* jangan menghapus field existing
* jangan mengubah schema existing secara destruktif
* jangan mengganti authentication internal
* jangan memindahkan business logic existing tanpa kebutuhan
* jangan melakukan refactor besar hanya demi membuat SiLACARE

Tambahkan Patient Portal secara modular.

---

# 17. Security

Karena SiLACARE akan menangani data kesehatan dan identitas:

Pastikan:

* authentication
* authorization
* rate limiting
* validation
* CSRF/Sanctum protection sesuai arsitektur
* audit log untuk aktivitas penting
* private file storage
* tidak ada mass assignment vulnerability
* tidak ada IDOR
* tidak ada patient enumeration yang mudah disalahgunakan
* jangan expose NIK secara penuh di response jika tidak diperlukan
* jangan expose database fields secara mentah
* jangan memberikan hasil pasien A kepada pasien B hanya karena manipulasi ID

Semua endpoint yang mengambil data pasien harus memastikan patient yang sedang login memang berhak mengakses patient tersebut.

---

# 18. Endpoint awal yang dirancang

Minimal rencanakan endpoint:

## Public

`POST /api/patient-portal/auth/check-identity`

`POST /api/patient-portal/auth/activate`

`POST /api/patient-portal/auth/verify-otp`

`POST /api/patient-portal/cfd/check-nik`

`POST /api/patient-portal/cfd/register`

`POST /api/patient-portal/cfd/register-new`

## Authenticated Patient

`GET /api/patient-portal/me`

`GET /api/patient-portal/profile`

`GET /api/patient-portal/history`

`GET /api/patient-portal/results`

`GET /api/patient-portal/queues`

`POST /api/patient-portal/registrations`

`GET /api/patient-portal/registrations/{id}`

Sesuaikan endpoint dengan route convention existing.

Jangan membuat semuanya sekaligus jika schema existing belum dipahami.

---

# 19. Development Strategy

Jangan langsung mengimplementasikan seluruh sistem.

Kerjakan bertahap:

### Phase 1 — Audit

Audit project SiLAKES dan laporkan:

* model pasien
* tabel pasien
* relasi
* authentication
* API structure
* response helper
* pendaftaran
* antrean
* hasil lab

Jangan melakukan perubahan pada phase ini.

### Phase 2 — Identity

Implementasikan:

* patient portal account
* existing patient lookup
* activation
* authentication
* authorization

### Phase 3 — Patient Portal API

Implementasikan:

* profile
* history
* result

### Phase 4 — Online Registration

Implementasikan:

* service selection
* appointment
* queue
* cash payment verification

### Phase 5 — CFD

Implementasikan:

* NIK validation
* SiLAKES lookup
* eligibility
* examination selection
* KTP upload
* OCR
* new patient CFD registration
* queue

### Phase 6 — Security & Testing

Test:

* unauthorized access
* IDOR
* duplicate registration
* duplicate NIK
* duplicate CFD registration
* invalid NIK
* wrong phone
* wrong OTP
* expired OTP
* wrong patient ID
* patient A attempting to access patient B
* duplicate portal account
* duplicate CFD registration

---

# 20. Aturan paling penting

Sebelum melakukan implementasi, pahami project existing terlebih dahulu.

Jangan mengasumsikan struktur database.

Jangan membuat backend SiLACARE kedua.

Jangan membuat database pasien kedua.

Jangan membuat duplicate patient.

Jangan expose database SiLAKES secara langsung.

SiLAKES tetap menjadi **Single Source of Truth**.

SiLACARE adalah **patient-facing layer** yang menggunakan data SiLAKES melalui API yang aman dan terkontrol.

Pada tahap pertama, **jangan langsung coding**. Lakukan audit terhadap repository terlebih dahulu dan berikan laporan struktur existing serta rancangan perubahan yang akan dilakukan. Tunggu persetujuan sebelum melakukan perubahan kode atau migration.
