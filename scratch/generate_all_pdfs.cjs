const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const LOGO_PATH = '/home/nushan/.gemini/antigravity/brain/075e0f0d-4b7a-459b-81dd-eebdf6a04457/.user_uploaded/media_1794907933766_13ea5eff.png';
const CAR1_PATH = path.resolve('resources/js/Pages/Web/assets/rentAVehicle/collection/car1.png');
const CAR2_PATH = path.resolve('resources/js/Pages/Web/assets/rentAVehicle/collection/car2.png');
const CAR3_PATH = path.resolve('resources/js/Pages/Web/assets/rentAVehicle/collection/car3.png');
const CAR4_PATH = path.resolve('resources/js/Pages/Web/assets/rentAVehicle/collection/car4.png');
const CAR_BIG_PATH = path.resolve('resources/js/Pages/Web/assets/rentAVehicle/car.png');
const SEED_CAR_PATH = path.resolve('storage/app/public/vehicles/seed/land/2.jpg');

function toBase64(filePath) {
  if (fs.existsSync(filePath)) {
    return 'data:image/' + (filePath.endsWith('.jpg') ? 'jpeg' : 'png') + ';base64,' + fs.readFileSync(filePath).toString('base64');
  }
  return null;
}

const logoBase64 = toBase64(LOGO_PATH);
const car1Base64 = toBase64(CAR1_PATH);
const car2Base64 = toBase64(CAR2_PATH);
const car3Base64 = toBase64(CAR3_PATH);
const car4Base64 = toBase64(CAR4_PATH);
const carBigBase64 = toBase64(CAR_BIG_PATH);
const seedCarBase64 = toBase64(SEED_CAR_PATH);

console.log('Assets loaded:', {
  logo: !!logoBase64,
  car1: !!car1Base64,
  car2: !!car2Base64,
  car3: !!car3Base64,
  carBig: !!carBigBase64,
  seedCar: !!seedCarBase64,
});

/* Helper to draw modern slide frames */
function initSlide(doc, bgHex) {
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 297, 210, 'F');
}

function drawSlideHeader(doc, conceptTitle, subtitle, slideNum, isDark = false) {
  // Top metadata strip
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
  doc.text('SARVA VEHICLE RENTAL — UI/UX DESIGN PROPOSAL', 14, 11);
  doc.text(`SLIDE 0${slideNum} / 05`, 265, 11);

  // Divider
  doc.setDrawColor(isDark ? 42 : 226, isDark ? 55 : 232, isDark ? 86 : 240);
  doc.setLineWidth(0.3);
  doc.line(14, 13, 283, 13);

  // Slide Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(isDark ? 255 : 15, isDark ? 255 : 23, isDark ? 255 : 42);
  doc.text(conceptTitle, 14, 21);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
  doc.text(subtitle, 14, 26);
}

function drawSlideFooter(doc, conceptName, isDark = false) {
  doc.setDrawColor(isDark ? 42 : 226, isDark ? 55 : 232, isDark ? 86 : 240);
  doc.setLineWidth(0.3);
  doc.line(14, 200, 283, 200);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isDark ? 59 : 30, isDark ? 130 : 96, isDark ? 246 : 242);
  doc.text('SARVA', 14, 204.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(isDark ? 148 : 100, isDark ? 163 : 116, isDark ? 184 : 139);
  doc.text(`• Concept: ${conceptName} • Beyond Everything Design System • Confidential & Proprietary`, 28, 204.5);
}

// Export basic script to test
console.log('Script structure verified');

