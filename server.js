const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert'); // Untuk file statis dan multipart
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const tf = require('@tensorflow/tfjs-node');
const tmp = require('tmp'); // Untuk direktori sementara
const admin = require('firebase-admin'); // Firebase Admin SDK

// Konfigurasi server Hapi
const server = Hapi.server({
    port: process.env.PORT || 8080, // Gunakan PORT dari environment variable
    host: '0.0.0.0', // Harus menggunakan 0.0.0.0 di Cloud Run
});



// Direktori untuk menyimpan sementara file upload
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Variabel untuk Google Cloud Storage dan model
const bucketName = 'submissionmlgc-arielwirar';
const modelFolder = 'submission-model/';
let model;

// Konfigurasi Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://submissionmlgc-arielwirar.firebaseio.com',
});


const db = admin.firestore();

// Fungsi untuk mengunduh dan memuat model dari Cloud Storage
const loadModel = async () => {
    const storage = new Storage();

    // Buat direktori sementara
    const tempDir = tmp.dirSync();
    console.log(`Temporary directory created at: ${tempDir.name}`);

    // Unduh file model dari bucket ke direktori sementara
    const files = await storage.bucket(bucketName).getFiles({ prefix: modelFolder });

    for (const file of files[0]) {
        const fileName = path.basename(file.name);
        const destination = path.join(tempDir.name, fileName);

        await storage.bucket(bucketName).file(file.name).download({ destination });
        console.log(`File ${file.name} downloaded to ${destination}`);
    }

    // Muat model TensorFlow dari direktori sementara
    const modelPath = path.join(tempDir.name, 'model.json');
    model = await tf.loadGraphModel(`file://${modelPath}`);
    console.log('Model loaded successfully.');

    // Hapus file setelah model selesai dimuat
    for (const file of files[0]) {
        const filePath = path.join(tempDir.name, path.basename(file.name));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted: ${filePath}`);
        }
    }
};

// Fungsi prediksi menggunakan TensorFlow.js
const predictImage = async (imagePath) => {
    const imageBuffer = fs.readFileSync(imagePath);
    const imageTensor = tf.node.decodeImage(imageBuffer)
        .resizeNearestNeighbor([224, 224]) // Ubah ukuran gambar
        .expandDims()                     // Tambahkan dimensi batch
        .toFloat()
        .div(tf.scalar(255));             // Normalisasi nilai piksel

    const prediction = model.predict(imageTensor);
    const [score] = await prediction.data(); // Ambil nilai prediksi

    return score > 0.5 ? 'Cancer' : 'Non-cancer';
};

// Route untuk menerima gambar dan melakukan prediksi
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

            try {
                await new Promise((resolve, reject) => {
                    file.pipe(fileStream);
                    file.on('end', resolve);
                    file.on('error', reject);
                });

                const result = await predictImage(imagePath);

                const predictionData = {
                    id,
                    result,
                    suggestion: result === 'Cancer' ? 'Segera periksa ke dokter!' : 'Penyakit kanker tidak terdeteksi.',
                    createdAt: new Date().toISOString(),
                };

                // Simpan hasil prediksi ke Firestore
                await db.collection('predictions').doc(id).set(predictionData);
                console.log(`Prediction saved to Firestore: ${JSON.stringify(predictionData)}`);

                const response = {
                    status: 'success',
                    message: 'Model is predicted successfully',
                    data: predictionData,
                };

                fs.unlinkSync(imagePath); // Hapus file gambar setelah prediksi selesai
                return h.response(response).code(200);

            } catch (err) {
                console.error('Prediction error:', err);
                return h.response({
                    status: 'fail',
                    message: 'Terjadi kesalahan dalam melakukan prediksi',
                }).code(400);
            }
        },
    }
});

server.route({
    method: 'GET',
    path: '/health',
    handler: (request, h) => {
        return { status: 'healthy' };
    },
});


// Fungsi untuk memulai server
const start = async () => {
    try {
        await server.register(Inert); // Pastikan plugin inert terdaftar
        await loadModel(); // Muat model saat server dimulai
        await server.start();
        console.log('Server running on %s', server.info.uri);
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
};
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at:', p, 'reason:', reason);
});

console.log(`Server starting on port: ${process.env.PORT || 8080}`);

// Memulai server
start();
