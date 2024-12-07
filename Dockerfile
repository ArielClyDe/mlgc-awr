# Gunakan base image Node.js
FROM node:18-slim

# Set working directory di dalam container
WORKDIR /usr/src/app

# Salin file package.json dan package-lock.json ke container
COPY package*.json ./

# Install dependencies
RUN npm install

# Salin semua file ke container
COPY . .

# Expose port 8080 untuk container
EXPOSE 8080

# Jalankan server menggunakan script start di package.json
CMD ["npm", "start"]
