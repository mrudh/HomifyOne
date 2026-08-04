const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ROOM_FOLDER_OVERRIDES = {
  'living room': 'living_room',
  'master bedroom': 'bedroom',
  'bedroom': 'bedroom',
  'kitchen': 'kitchen',
  'bathroom': 'bathroom',
  'garden': 'garden',
};

function slugifyRoom(room) {
  const key = (room || 'general').trim().toLowerCase();
  if (ROOM_FOLDER_OVERRIDES[key]) return ROOM_FOLDER_OVERRIDES[key];
  return key.replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function folderFor(product) {
  const room = slugifyRoom(product?.room);
  const isChoice = product?.type === 'choice';
  const typeFolder = isChoice ? 'choices' : 'extras';
  const leaf = isChoice
    ? (product?.subCategory || product?.category || 'misc')
    : (product?.style || product?.subCategory || 'misc');
  const sub = leaf.toLowerCase().replace(/\s+/g, '-');
  return `homifyOne/${room}/${typeFolder}/${sub}`;
}

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req) => ({
    folder: folderFor(req.product),
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type: 'image',
  }),
});

const productImageUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, 
});

module.exports = productImageUpload;
