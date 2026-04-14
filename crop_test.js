const { Jimp } = require('jimp');

async function cropImages() {
  try {
    const image = await Jimp.read('public/perry-logo.jpg');
    console.log(`Original dimensions: ${image.bitmap.width}x${image.bitmap.height}`);
    
    const size = 600;
    const x = Math.floor((image.bitmap.width - size) / 2);
    
    // Top crop (y=0)
    const img1 = image.clone();
    img1.crop({ x, y: 0, w: size, h: size });
    await img1.write('/Users/ivanjoselopezboyer/.gemini/antigravity/brain/c186ce49-b42f-466d-b228-8c6b498efae1/crop_variation_1_top.png');
    
    // Semi-top (y=150)
    const img2 = image.clone();
    img2.crop({ x, y: 150, w: size, h: size });
    await img2.write('/Users/ivanjoselopezboyer/.gemini/antigravity/brain/c186ce49-b42f-466d-b228-8c6b498efae1/crop_variation_2_semi.png');
    
    // Y=250
    const img3 = image.clone();
    img3.crop({ x, y: 250, w: size, h: size });
    await img3.write('/Users/ivanjoselopezboyer/.gemini/antigravity/brain/c186ce49-b42f-466d-b228-8c6b498efae1/crop_variation_3_centered.png');
    
    console.log("Done cropping!");
  } catch(err) {
    console.error(err);
  }
}

cropImages();
