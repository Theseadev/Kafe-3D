# ☕ Kafe 3D - Open-World Business Simulation Game

**Kafe 3D (Kopi Kenangan Tycoon)** adalah game simulasi bisnis kafe 3D berbasis *open-world* yang berjalan langsung di web browser (*zero-installation*). Game ini menggabungkan rendering 3D WebGL (Three.js) dengan kecerdasan buatan otonom (*Finite State Machine*) dan backend micro-framework *Flight PHP*.

---

## 🌟 Fitur Utama (Key Features)

- 🌍 **Open-World Village & Cafe Interior**: Eksplorasi bebas area kafe dan pasar desa dengan kontrol orang ketiga (Orbit 3D) dan orang pertama (FPV POV).
- 🤖 **Autonomous AI Staff (Finite State Machine)**:
  - **Barista Sarah**: Meracik kopi secara otomatis saat pesanan masuk.
  - **Pelayan Andi**: Mengantarkan kopi dari meja counter ke meja pelanggan.
  - **Pedagang Pak Budi**: Melayani pembelian bahan baku di pasar desa.
- 📦 **Supply Chain & Restocking System**: Manajemen stok 5 bahan baku (*Biji Kopi, Susu Segar, Gula Aren, Bubuk Matcha, Pastry*).
- 🌦️ **Dynamic Day-Night & Weather Cycle**: Siklus waktu dinamis (*Subuh, Pagi, Siang, Sore, Malam*) dan cuaca adaptif (*Cerah, Hujan, Salju*).
- ⚡ **Full-Stack Architecture**: Didukung *Flight PHP* untuk RESTful API dan deterministik simulasi bisnis harian.
- 🌐 **Real-Time LAN Multiplayer & Dimensional Portal**: Fitur mabar 1 jaringan WiFi dan portal warp antar-game.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Frontend**: HTML5, Three.js (r128), Tailwind CSS, Vanilla JavaScript.
- **Backend / Micro-Framework**: Flight PHP (lightphp/core ^3.0), Node.js (RFC 6455 WebSocket).
- **3D Assets**: VRM Anime 3D Character Model, Low-Poly Stylized 3D Geometries.

---

## 🚀 Cara Menjalankan Game (Quick Start)

### Opsi 1: Menggunakan Node.js Server (Rekomendasi)
`ash
# Jalankan server
node coop_server.js
`
Buka browser di: http://localhost:8000

### Opsi 2: Menggunakan PHP Built-in Server
`ash
# Jalankan server PHP
php -S localhost:8000 index.php
`
Buka browser di: http://localhost:8000

---

## 👨‍💻 Pengembang
- **Theseadev**
