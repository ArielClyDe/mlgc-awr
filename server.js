const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');  // Untuk file statis dan multipart
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const server = Hapi.server({
    port: 8080,
    host: 'localhost',
});

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

const predictImage = (imagePath) => {
    return Math.random() > 0.5 ? 'Cancer' : 'Non-cancer';
};

// Route untuk menerima gambar dan prediksi
server.route({
    method: 'POST',
    path: '/predict',
    options: {
        payload: {
            parse: true,
            allow: 'multipart/form-data',
            output: 'stream', // Menggunakan stream untuk file upload
            maxBytes: 1000000, // 1MB max
            multipart: true // Pastikan multipart aktif
        },
        handler: async (request, h) => {
            const file = request.payload.file; // Mengambil file yang diupload
            const id = uuidv4();

            if (!file) {
                return h.response({
                    status: 'fail',
                    message: 'No file uploaded',
                }).code(400);
            }

            const imagePath = path.join(uploadsDir, `${id}.jpg`);
            const fileStream = fs.createWriteStream(imagePath);

            await new Promise((resolve, reject) => {
                file.pipe(fileStream);
                file.on('end', resolve);
                file.on('error', reject);
            });

            const result = predictImage(imagePath);

            const response = {
                status: 'success',
                message: 'Model is predicted successfully',
                data: {
                    id: id,
                    result: result,
                    suggestion: result === 'Cancer' ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.',
                    createdAt: new Date().toISOString(),
                }
            };

            fs.unlinkSync(imagePath);

            return h.response(response).code(200);
        },
    }
});

// Start server
const start = async () => {
    try {
        await server.register(Inert); // Pastikan plugin inert terdaftar
        await server.start();
        console.log('Server running on %s', server.info.uri);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};

start();
