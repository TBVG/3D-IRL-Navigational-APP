import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const textures = [
  {
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg',
    filename: 'earth-texture.jpg'
  },
  {
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg',
    filename: 'earth-bump.jpg'
  },
  {
    url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png',
    filename: 'earth-clouds.png'
  }
];

const downloadFile = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(__dirname, '../public/textures', filename));
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename);
      reject(err);
    });
  });
};

const downloadAll = async () => {
  try {
    // Create textures directory if it doesn't exist
    const texturesDir = path.join(__dirname, '../public/textures');
    if (!fs.existsSync(texturesDir)) {
      fs.mkdirSync(texturesDir, { recursive: true });
    }

    // Download all textures
    for (const texture of textures) {
      await downloadFile(texture.url, texture.filename);
    }
    console.log('All textures downloaded successfully!');
  } catch (error) {
    console.error('Error downloading textures:', error);
  }
};

downloadAll(); 