require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const cloudinary = require('cloudinary').v2;
const fs   = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const LOCAL_ROOT    = '/Users/mrudhulaapv/Desktop/Dissertation/images';
const CLOUDINARY_ROOT = 'homifyOne';

const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];

const getAllImages = (dir) => {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getAllImages(fullPath));
    } else if (imageExts.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
};

const run = async () => {
  const allImages = getAllImages(LOCAL_ROOT);
  console.log(`\n📁 Found ${allImages.length} images. Starting upload...\n`);

  const results = [];
  let done = 0;

  for (const imgPath of allImages) {
    const relative = path.relative(LOCAL_ROOT, imgPath);
    const withoutExt = relative.replace(/\.[^.]+$/, '');
    const cloudFolder = path.join(CLOUDINARY_ROOT, path.dirname(withoutExt)).replace(/\\/g, '/');
    const publicId = path.basename(withoutExt);

    try {
      const result = await cloudinary.uploader.upload(imgPath, {
        folder: cloudFolder,
        public_id: publicId,
        use_filename: false,
        overwrite: false,
        resource_type: 'image',
      });

      results.push({ localPath: relative, url: result.secure_url });
      done++;
      console.log(`✅ [${done}/${allImages.length}] ${relative}`);
    } catch (err) {
      console.error(`❌ Failed: ${relative} — ${err.message}`);
    }
  }

  const outPath = path.join(__dirname, 'cloudinary-urls.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ Done! ${done}/${allImages.length} uploaded.`);
  console.log(`📄 All URLs saved to scripts/cloudinary-urls.json`);
};

run();