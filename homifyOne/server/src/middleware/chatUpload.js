const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed.'), false);
  }
};

const chatUpload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET,
    key: (req, file, cb) => {
      const ext = file.originalname.split('.').pop();
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `chat/attachment-${unique}.${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

module.exports = chatUpload;
