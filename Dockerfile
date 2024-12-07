# Gunakan image resmi Node.js versi 18.20.5 sebagai base image
FROM node:18.20.5-slim

# Tentukan direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json (jika ada) untuk instalasi dependensi
COPY package*.json ./

# Install dependensi aplikasi
RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port 8080 (port yang digunakan oleh aplikasi)
EXPOSE 8080

# Jalankan aplikasi saat container dijalankan
CMD ["node", "server.js"]
