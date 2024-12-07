# Gunakan image resmi Node.js sebagai base
FROM node:18-slim

# Set work directory
WORKDIR /usr/src/app

# Salin package.json dan package-lock.json
COPY package*.json ./

# Install dependensi
RUN npm install

# Salin seluruh kode aplikasi ke container
COPY . .

# Expose port 8080
EXPOSE 8080

# Jalankan aplikasi
CMD ["node", "server.js"]
