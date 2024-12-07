# Gunakan Node.js image
FROM node:18

# Set working directory
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin semua file
COPY . .

# Ekspose port 8080 (yang digunakan oleh Cloud Run)
EXPOSE 8080

# Perintah untuk menjalankan aplikasi
CMD ["npm", "start"]
