const { createCanvas, loadImage } = require('canvas');
const sharp = require('sharp');

async function getSkinPart(skinBuffer, x, y, width, height) {
    return sharp(skinBuffer).extract({ left: x, top: y, width: width, height: height }).toBuffer();
}

// Katmanlı Avatar
async function renderAvatar(skinBuffer) {
    const head = await getSkinPart(skinBuffer, 8, 8, 8, 8);
    const headOverlay = await getSkinPart(skinBuffer, 40, 8, 8, 8);

    return sharp(head)
        .composite([{ input: headOverlay, left: 0, top: 0 }])
        .resize(128, 128, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();
}

// YENİ: Katmansız Avatar
async function renderAvatarNoLayer(skinBuffer) {
    const head = await getSkinPart(skinBuffer, 8, 8, 8, 8);

    return sharp(head) // Sadece ana kafa dokusunu kullan
        .resize(128, 128, { kernel: sharp.kernel.nearest })
        .png()
        .toBuffer();
}


// 2D Vücut Renderı
async function renderBody(skinBuffer) {
     const bodyPart_head = await getSkinPart(skinBuffer, 8, 8, 8, 8);
     const bodyPart_headOverlay = await getSkinPart(skinBuffer, 40, 8, 8, 8);
     const bodyPart_body = await getSkinPart(skinBuffer, 20, 20, 8, 12);
     const bodyPart_armRight = await getSkinPart(skinBuffer, 44, 20, 4, 12);
     const bodyPart_armLeft = await getSkinPart(skinBuffer, 36, 52, 4, 12);
     const bodyPart_legRight = await getSkinPart(skinBuffer, 4, 20, 4, 12);
     const bodyPart_legLeft = await getSkinPart(skinBuffer, 20, 52, 4, 12);

     const canvas = createCanvas(16, 32);
     const ctx = canvas.getContext('2d');
     ctx.imageSmoothingEnabled = false;

     const headImg = await loadImage(await sharp(bodyPart_head).composite([{input: bodyPart_headOverlay}]).toBuffer());
     
     ctx.drawImage(await loadImage(bodyPart_legLeft), 8, 20, 4, 12);
     ctx.drawImage(await loadImage(bodyPart_legRight), 4, 20, 4, 12);
     ctx.drawImage(await loadImage(bodyPart_armLeft), 0, 8, 4, 12);
     ctx.drawImage(await loadImage(bodyPart_armRight), 12, 8, 4, 12);
     ctx.drawImage(await loadImage(bodyPart_body), 4, 8, 8, 12);
     ctx.drawImage(headImg, 4, 0, 8, 8);

     return sharp(canvas.toBuffer('image/png'))
         .resize(160, 320, { kernel: sharp.kernel.nearest })
         .toBuffer();
}

module.exports = {
    renderAvatar,
    renderAvatarNoLayer, // Yeni fonksiyonu export et
    renderBody
};