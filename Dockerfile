# Gunakan image resmi Node.js versi 18 sebagai base image
FROM node:18.20.5-slim

# Tetapkan NODE_ENV sebagai production untuk mengoptimalkan aplikasi
ENV NODE_ENV=production

# Tentukan direktori kerja di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json (jika ada) terlebih dahulu
COPY package*.json ./

# Install dependensi aplikasi, hanya untuk production
RUN npm install --only=production

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port 8080 (port yang digunakan oleh aplikasi)
EXPOSE 8080

# Jalankan aplikasi saat container dijalankan
CMD ["node", "server.js"]
