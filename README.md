# Image Converter Pro

Aplikasi desktop super praktis untuk mengonversi, mengubah ukuran gambar, membuat Pas Foto (lengkap dengan tata letak kertas yang siap gunting), dan menghasilkan ikon `.ico` tanpa memerlukan koneksi internet (100% Offline).

Aplikasi ini dibangun menggunakan teknologi **Electron** disandingkan dengan **Custom HTML5 Canvas (JS)** sehingga antarmuka dan kinerja grafis perenderan gambar dilakukan secara *real-time* dan cepat.

---

## ✨ Fitur Utama

1. **Konversi Format Universal (Lintas Format)**
   - Anda dapat saling mengonversi gambar di antara format-format berikut: **JPG, PNG, WEBP, SVG, GIF, dan BMP**.
   - Sangat berguna jika Anda memiliki spesifikasi `SVG` *(Vector)* dan ingin me-rendernya menjadi gambar `.png` atau `.jpg` transparan layaknya aplikasi editor pro.

2. **Resize Cepat dengan Aspek Rasio (Auto Aspect Ratio)**
   - Ubah ukuran gambar dalam skala Piksel (px) secara presisi sambil menjaga proporsi lebar/tinggi aslinya agar tak terdistorsi.

3. **Mode Pas Foto Standar Indonesia**
   - Hadir dengan perhitungan pas cetak 300 DPI untuk ukuran standar lokal: **2x3, 3x4, 4x6 cm**.
   - Menyediakan fitur *Color Picker* untuk mengganti warna Latar Belakang gambar (Contoh merah/biru). Pastikan gambar masukan dasar Anda minimal sudah bertipe vektor / tanpa background (transparan) untuk hasil terbaik.

4. **Mesin Cerdas *Grid Layout* (Cetak Siap Gunting)**
   - Susun dan susuri berlembar-lembar pas foto secara otomatis di atas representasi kertas ukuran **A4, 4R, dan Letter** yang disokong 300 DPI.
   - Pangkas *gap* antar batas foto. Diberi penanda garis bantu (*guidelines*) putus-putus kecil tipis melingkari fotonya guna mempermudah Anda dalam mengambil gunting & memotong pinggirannya.
   - Anda bisa me-limit jumlah foto yang ingin dicetak (Misal butuh 5 foto saja), maka aplikasi akan mengatur barisannya bertumpu mulai dari ujung Pojok Kiri Atas menyisakan lahan kosong di bawah kertas yang tak terpakai.

5. **Aksi 'Cetak Langsung' (Print)**
   - Tak perlu susah menyimpannya sebagai file. Cukup letakkan gambar, atur baris cetakan klik tombol **"Cetak Langsung"**, OS jendela mencetak Windows (Printer List) murni Anda akan terbuka. Layout 100% presisi dengan ketebalan kertasnya.

6. **Konversi Ikon (.ico)**
   - Fitur khusus mengekspor gambar ukuran bebas Anda ke target file `.ico` dengan syarat proporsional yang rapi (menjadi kotak simetris perlindungan pinggir di kanvas otomatis `256 x 256 pixel` lalu diproses). Sangat pas bagi developer aplikasi / *Web developer*.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi dibangun dari lingkungan Node.js, karenanya pastikan komputer Anda telah terinstal [Node.js](https://nodejs.org).

1. **Buka Terminal / Command Prompt**
2. Arahkan direktori (folder) ke lokasi letak terekstraknya aplikasi ini:
   ```bash
   cd c:\_Data\_Personal_Project\Desktop\imgConverter
   ```
3. **Pasang Dependencies Node (Satu Kali Saja di Awal)**
   Jalankan ini untuk mengunduh pustaka pembungkus grafisnya:
   ```bash
   npm install
   ```
   *(Library yang dipasang secara external hanyalah Electron sebagai Window Container dan png-to-ico).*
4. **Mulai Aplikasi**
   Setelah semua terpasang, untuk menjalankan buka aplikasi, ketikkan:
   ```bash
   npm start
   ```

Aplikasi `Image Converter Pro` berkonsep kaca tembus pandang (*Glassmorphism - Dark Mode*) ini akan langsung mengambil alih layar dan siap pakai! 

*Dirancang secara khusus dengan fungsionalitas memukau demi menemani kelancaran proyek-proyek Anda selanjutnya.*
