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
    const ext = filePath.endsWith('.jpg') ? 'jpeg' : 'png';
    return `data:image/${ext};base64,` + fs.readFileSync(filePath).toString('base64');
  }
  return null;
}

const logoData = toBase64(LOGO_PATH);
const car1Data = toBase64(CAR1_PATH);
const car2Data = toBase64(CAR2_PATH);
const car3Data = toBase64(CAR3_PATH);
const car4Data = toBase64(CAR4_PATH);
const carBigData = toBase64(CAR_BIG_PATH);
const seedCarData = toBase64(SEED_CAR_PATH);

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16)
  ];
}

function setFill(doc, hex) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

function setDraw(doc, hex) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

function setText(doc, hex) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function initSlide(doc, bgHex) {
  setFill(doc, bgHex);
  doc.rect(0, 0, 297, 210, 'F');
}

function drawSlideHeader(doc, conceptTitle, subtitle, slideNum, isDark = false, accentHex = '#2563EB') {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, isDark ? '#94A3B8' : '#64748B');
  doc.text('SARVA VEHICLE RENTAL — UI/UX PROMAX DESIGN PROPOSAL', 14, 11);
  doc.text(`SLIDE 0${slideNum} / 05`, 265, 11);

  setDraw(doc, isDark ? '#1E293B' : '#E2E8F0');
  doc.setLineWidth(0.3);
  doc.line(14, 13, 283, 13);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setText(doc, isDark ? '#FFFFFF' : '#0F172A');
  doc.text(conceptTitle, 14, 21);

  setFill(doc, accentHex);
  doc.rect(14 + doc.getTextWidth(conceptTitle) + 4, 16.5, 6, 2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(doc, isDark ? '#94A3B8' : '#64748B');
  doc.text(subtitle, 14, 26);
}

function drawSlideFooter(doc, conceptName, isDark = false) {
  setDraw(doc, isDark ? '#1E293B' : '#E2E8F0');
  doc.setLineWidth(0.3);
  doc.line(14, 199, 283, 199);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, isDark ? '#3B82F6' : '#2563EB');
  doc.text('SARVA', 14, 204);
  doc.setFont('helvetica', 'normal');
  setText(doc, isDark ? '#64748B' : '#94A3B8');
  doc.text(`• Concept: ${conceptName} • Tagline: Beyond Everything • Prepared for Executive Review`, 28, 204);
  doc.text('CONFIDENTIAL & PROPRIETARY', 240, 204);
}

function drawPillBadge(doc, x, y, text, bgHex, textHex, width = 0) {
  const pad = 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const w = width || (doc.getTextWidth(text) + pad * 2);
  setFill(doc, bgHex);
  doc.roundedRect(x, y - 4, w, 5.5, 2.5, 2.5, 'F');
  setText(doc, textHex);
  doc.text(text, x + (w - doc.getTextWidth(text)) / 2, y);
  return w;
}

// ==========================================
// CONCEPT 1: SARVA APEX LUXE (DARK CYBER-LUXE)
// ==========================================
function buildConcept1() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isDark = true;
  const BG = '#090D16';
  const CARD_BG = '#121826';
  const CARD_BORDER = '#1E293B';
  const BLUE = '#2563EB';
  const GOLD = '#F59E0B';

  // SLIDE 1
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 01: SARVA APEX LUXE — BRAND & DESIGN SYSTEM', 'Theme Direction: High-Performance Luxury, Dark Glassmorphism, Dual Luminous Accents', 1, isDark, GOLD);

  setFill(doc, '#111726');
  setDraw(doc, '#1E293B');
  doc.roundedRect(14, 32, 125, 62, 4, 4, 'FD');

  setFill(doc, '#FFFFFF');
  doc.roundedRect(20, 38, 113, 34, 3, 3, 'F');
  if (logoData) {
    doc.addImage(logoData, 'PNG', 32, 41, 88, 28);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#F59E0B');
  doc.text('BRAND ARCHITECTURE:', 20, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#CBD5E1');
  doc.text('SARVA ("All / Everything") + "Beyond Everything" Tagline.', 20, 85);
  doc.text('Bold angular "X" conveys acceleration, speed, and premium mobility.', 20, 90);

  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(144, 32, 139, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#FFFFFF');
  doc.text('OFFICIAL LOGO-DERIVED PALETTE', 150, 40);

  const swatches1 = [
    { name: 'Sarva Electric Blue', hex: '#2563EB', role: 'Primary Brand / Glow' },
    { name: 'Radiant Apex Gold', hex: '#F59E0B', role: 'Key Accents & CTAs' },
    { name: 'Deep Obsidian', hex: '#090D16', role: 'Canvas Background' },
    { name: 'Cyber Slate Glass', hex: '#121826', role: 'Card Surfaces' },
    { name: 'Verified Emerald', hex: '#10B981', role: 'Availability & Trust' },
  ];

  swatches1.forEach((s, idx) => {
    const y = 47 + idx * 8.5;
    setFill(doc, s.hex);
    doc.roundedRect(150, y - 4, 16, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#FFFFFF');
    doc.text(s.name, 170, y);
    doc.setFont('helvetica', 'normal');
    setText(doc, '#94A3B8');
    doc.text(`[${s.hex}] — ${s.role}`, 215, y);
  });

  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 100, 269, 93, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, '#F59E0B');
  doc.text('WHY THIS UI CAPTIVATES CLIENTS & DRIVES 3X HIGHER ENGAGEMENT', 20, 109);

  const pillars1 = [
    {
      title: '1. Prestige & High Perceived Value (Dark Mode Psychology)',
      desc: 'Top-tier luxury brands (Porsche Drive, Turo Private Reserve, Tesla) use deep obsidian backgrounds because high-contrast vehicle photography pops dramatically. Renters perceive the fleet as newer, cleaner, and more elite.'
    },
    {
      title: '2. The Signature SARVA Golden Acceleration Accent',
      desc: 'The energetic gold from your logo is deployed strategically on key conversion points: "Reserve Now", instant booking badges, and price highlights. This guides the user’s eye effortlessly to checkout.'
    },
    {
      title: '3. Frosted Glassmorphism with Telemetry Badges',
      desc: 'Instead of basic flat boxes, components use subtle glass borders (1px stroke with 5% alpha glow). Performance badges (Horsepower, 0-100 km/h, Range, Chauffeur option) create emotional excitement for the trip.'
    },
    {
      title: '4. Immediate Institutional Trust & Transparency',
      desc: 'Renters leave basic sites because of pricing uncertainty. Apex Luxe surfaces verified fleet badges, free cancellation guarantee, and exact upfront pricing before any form is filled.'
    }
  ];

  pillars1.forEach((p, i) => {
    const y = 118 + i * 19;
    setFill(doc, '#1E293B');
    doc.circle(23, y - 1, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setText(doc, '#38BDF8');
    doc.text(p.title, 28, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, '#CBD5E1');
    doc.text(p.desc, 28, y + 5, { maxWidth: 245 });
  });

  drawSlideFooter(doc, 'Apex Luxe', isDark);

  // SLIDE 2
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 01: APEX LUXE — HERO & INTELLIGENT SEARCH CONSOLE', 'Full-Bleed Showcase Mockup with Telemetry Search and Segmented Drive Controls', 2, isDark, BLUE);

  setFill(doc, '#0D1322');
  setDraw(doc, '#1E293B');
  doc.roundedRect(14, 32, 269, 162, 4, 4, 'FD');

  setFill(doc, '#1A2338');
  doc.roundedRect(14, 32, 269, 10, 4, 4, 'F');
  setFill(doc, '#EF4444'); doc.circle(20, 37, 1.8, 'F');
  setFill(doc, '#F59E0B'); doc.circle(25, 37, 1.8, 'F');
  setFill(doc, '#10B981'); doc.circle(30, 37, 1.8, 'F');
  setText(doc, '#94A3B8');
  doc.setFontSize(7);
  doc.text('sarvatransport.com/vehicles/luxury-fleet', 115, 38.5);

  setFill(doc, '#0E1626');
  doc.rect(14, 42, 269, 14, 'F');
  if (logoData) {
    setFill(doc, '#FFFFFF');
    doc.roundedRect(20, 44.5, 28, 9, 1.5, 1.5, 'F');
    doc.addImage(logoData, 'PNG', 21, 45, 26, 8);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, '#FFFFFF');
  doc.text('Land Fleet', 60, 50.5);
  setText(doc, '#94A3B8');
  doc.text('Watercraft', 82, 50.5);
  doc.text('Air Charter', 104, 50.5);
  doc.text('Chauffeur VIP', 126, 50.5);
  doc.text('Corporate', 154, 50.5);

  drawPillBadge(doc, 225, 51.5, 'LKR (Rs)', '#1E293B', '#F59E0B', 16);
  drawPillBadge(doc, 245, 51.5, 'Sign In', '#2563EB', '#FFFFFF', 18);

  setFill(doc, '#090D18');
  doc.rect(14, 56, 269, 65, 'F');
  setFill(doc, '#14203D');
  doc.circle(200, 85, 35, 'F');

  drawPillBadge(doc, 20, 67, 'PREMIUM MOBILITY FLEET', '#1E293B', '#38BDF8');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setText(doc, '#FFFFFF');
  doc.text('BEYOND EVERYTHING.', 20, 76);
  setText(doc, '#F59E0B');
  doc.text('DRIVE WITHOUT LIMITS.', 20, 83);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#94A3B8');
  doc.text('Handpicked luxury sedans, supercars, and executive SUVs.', 20, 89);
  doc.text('Instant keyless pickup, dedicated chauffeur service, and 24/7 VIP assistance.', 20, 93);

  if (carBigData) {
    doc.addImage(carBigData, 'PNG', 140, 58, 135, 60);
  }

  setFill(doc, '#101728');
  setDraw(doc, '#2563EB');
  doc.setLineWidth(0.6);
  doc.roundedRect(20, 105, 257, 50, 4, 4, 'FD');

  drawPillBadge(doc, 26, 114, 'SELF-DRIVE RENTAL', '#2563EB', '#FFFFFF', 36);
  drawPillBadge(doc, 66, 114, 'WITH CHAUFFEUR', '#1E293B', '#CBD5E1', 34);
  drawPillBadge(doc, 104, 114, 'AIRPORT VIP MEET & GREET', '#1E293B', '#CBD5E1', 46);

  const fields1 = [
    { label: 'PICK-UP LOCATION', val: 'Colombo Int. Airport (CMB)' },
    { label: 'PICK-UP DATE & TIME', val: '24 Nov 2026 • 10:00 AM' },
    { label: 'DROP-OFF LOCATION', val: 'Colombo 03 / Galle Face' },
    { label: 'DROP-OFF DATE & TIME', val: '28 Nov 2026 • 06:00 PM' },
  ];

  fields1.forEach((f, idx) => {
    const x = 26 + idx * 48;
    setFill(doc, '#090E1A');
    setDraw(doc, '#1E293B');
    doc.roundedRect(x, 120, 45, 24, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, '#F59E0B');
    doc.text(f.label, x + 3, 126);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#FFFFFF');
    doc.text(f.val, x + 3, 132, { maxWidth: 40 });
  });

  setFill(doc, '#F59E0B');
  doc.roundedRect(222, 120, 48, 24, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#090D16');
  doc.text('SEARCH FLEET', 228, 131);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Instant Confirmation →', 228, 137);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, '#10B981');
  doc.text('✓ 100% Inspected Fleet', 26, 166);
  setText(doc, '#38BDF8');
  doc.text('✓ 24h Free Cancellation', 95, 166);
  setText(doc, '#F59E0B');
  doc.text('✓ Zero Deposit on Selected Luxury Cars', 165, 166);

  setFill(doc, '#090D18');
  doc.rect(14, 172, 269, 22, 'F');

  const stats1 = [
    { num: '500+ Vehicles', lbl: 'Available Across Sri Lanka' },
    { num: '4.92 ★', lbl: 'Average Verified Rating' },
    { num: '24 / 7', lbl: 'Roadside Concierge Dispatch' },
    { num: '15 Mins', lbl: 'Fast-Track Airport Handover' },
  ];

  stats1.forEach((st, i) => {
    const x = 24 + i * 65;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setText(doc, '#FFFFFF');
    doc.text(st.num, x, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#64748B');
    doc.text(st.lbl, x, 186);
  });

  drawSlideFooter(doc, 'Apex Luxe', isDark);

  // SLIDE 3
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 01: APEX LUXE — VEHICLE CARD ANATOMY & MARKETPLACE', 'High-Conversion Car Card Anatomy with Telemetry Badges, Pricing & Instant Reservation', 3, isDark, GOLD);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#FFFFFF');
  doc.text('THE PROMAX LUXURY CAR CARD (DESIGNED FOR INSTANT CONVERSION)', 14, 34);

  const c1x = 14, c1y = 38, c1w = 110, c1h = 155;
  setFill(doc, CARD_BG);
  setDraw(doc, '#2563EB');
  doc.setLineWidth(0.6);
  doc.roundedRect(c1x, c1y, c1w, c1h, 4, 4, 'FD');

  setFill(doc, '#0A0F1D');
  doc.roundedRect(c1x + 3, c1y + 3, c1w - 6, 62, 3, 3, 'F');
  if (car1Data) {
    doc.addImage(car1Data, 'PNG', c1x + 12, c1y + 6, c1w - 24, 54);
  }

  drawPillBadge(doc, c1x + 8, c1y + 11, 'AVAILABLE NOW', '#10B981', '#FFFFFF');
  drawPillBadge(doc, c1x + 46, c1y + 11, 'CHAUFFEUR READY', '#1E293B', '#38BDF8');

  setFill(doc, '#1E293B');
  doc.circle(c1x + c1w - 12, c1y + 10, 4, 'F');
  setText(doc, '#F43F5E');
  doc.setFontSize(8);
  doc.text('♥', c1x + c1w - 13.5, c1y + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#38BDF8');
  doc.text('MERCEDES-BENZ • EXECUTIVE FLEET', c1x + 8, c1y + 73);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, '#FFFFFF');
  doc.text('E-Class AMG Dynamic', c1x + 8, c1y + 80);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, '#F59E0B');
  doc.text('★ 4.96', c1x + 8, c1y + 87);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#94A3B8');
  doc.text('(52 verified trips) • Top Rated Host', c1x + 24, c1y + 87);

  const specs1 = [
    { label: '5 Seats', icon: '👤' },
    { label: '9G-Tronic', icon: '⚙' },
    { label: 'Turbo Petrol', icon: '⛽' },
    { label: '4 Large Bags', icon: '💼' },
  ];

  specs1.forEach((sp, i) => {
    const sx = c1x + 8 + (i % 2) * 48;
    const sy = c1y + 93 + Math.floor(i / 2) * 11;
    setFill(doc, '#0C1220');
    setDraw(doc, '#1E293B');
    doc.roundedRect(sx, sy, 45, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#38BDF8');
    doc.text(sp.icon, sx + 3, sy + 6);
    setText(doc, '#E2E8F0');
    doc.text(sp.label, sx + 10, sy + 6);
  });

  setDraw(doc, '#1E293B');
  doc.line(c1x + 8, c1y + 120, c1x + c1w - 8, c1y + 120);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  setText(doc, '#94A3B8');
  doc.text('Daily Reservation Rate', c1x + 8, c1y + 127);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, '#FFFFFF');
  doc.text('LKR 42,500', c1x + 8, c1y + 134);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, '#F59E0B');
  doc.text('/ day (all taxes incl.)', c1x + 45, c1y + 134);

  setFill(doc, '#2563EB');
  doc.roundedRect(c1x + 8, c1y + 140, c1w - 16, 10, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#FFFFFF');
  doc.text('RESERVE INSTANTLY →', c1x + 30, c1y + 146.5);

  const rightCars1 = [
    {
      img: car2Data,
      brand: 'BMW LUXURY',
      model: 'X5 xDrive40i M-Sport',
      price: 'LKR 58,000',
      specs: '7 Seats • Steptronic • TwinTurbo • 4WD',
      tag: 'PREMIUM SUV',
      tagColor: '#8B5CF6'
    },
    {
      img: car3Data,
      brand: 'LAND ROVER',
      model: 'Defender 110 Carpathian',
      price: 'LKR 65,000',
      specs: '5 Seats • AWD Terrain • Diesel • Expedition Kit',
      tag: 'SAFARI LUXURY',
      tagColor: '#D97706'
    }
  ];

  rightCars1.forEach((rc, idx) => {
    const rx = 132, ry = 38 + idx * 78, rw = 151, rh = 73;
    setFill(doc, CARD_BG);
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(rx, ry, rw, rh, 4, 4, 'FD');

    setFill(doc, '#0A0F1D');
    doc.roundedRect(rx + 3, ry + 3, 58, rh - 6, 3, 3, 'F');
    if (rc.img) {
      doc.addImage(rc.img, 'PNG', rx + 6, ry + 12, 52, 44);
    }
    drawPillBadge(doc, rx + 6, ry + 10, rc.tag, rc.tagColor, '#FFFFFF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#F59E0B');
    doc.text(rc.brand, rx + 66, ry + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, '#FFFFFF');
    doc.text(rc.model, rx + 66, ry + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#F59E0B');
    doc.text('★ 4.98 (60+ trips)', rx + 66, ry + 29);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, '#CBD5E1');
    doc.text(rc.specs, rx + 66, ry + 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setText(doc, '#FFFFFF');
    doc.text(rc.price, rx + 66, ry + 49);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#94A3B8');
    doc.text('/ day', rx + 105, ry + 49);

    setFill(doc, '#F59E0B');
    doc.roundedRect(rx + 66, ry + 54, 42, 9, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#090D16');
    doc.text('VIEW CAR →', rx + 75, ry + 60);

    drawPillBadge(doc, rx + 115, ry + 60, 'FREE CANCEL', '#1E293B', '#10B981', 28);
  });

  drawSlideFooter(doc, 'Apex Luxe', isDark);

  // SLIDE 4
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 01: APEX LUXE — VEHICLE DETAILS & STICKY BOOKING CONSOLE', 'Bento Technical Specifications, Telemetry Matrix & Live Real-Time Quotation Breakdown', 4, isDark, BLUE);

  const p1x = 14, p1y = 33, p1w = 165;
  setFill(doc, '#0E1526');
  setDraw(doc, '#1E293B');
  doc.roundedRect(p1x, p1y, p1w, 75, 4, 4, 'FD');
  if (carBigData) {
    doc.addImage(carBigData, 'PNG', p1x + 20, p1y + 6, 125, 62);
  }
  drawPillBadge(doc, p1x + 6, p1y + 11, '360° VIRTUAL TOUR', '#1E293B', '#38BDF8');
  drawPillBadge(doc, p1x + p1w - 30, p1y + 11, '1 / 14 PHOTOS', '#090D16', '#FFFFFF');

  const bento1 = [
    { title: 'HORSEPOWER', val: '435 HP', sub: 'Biturbo AMG Engine' },
    { title: 'ACCELERATION', val: '4.8s 0-100', sub: 'Instant Response' },
    { title: 'TRANSMISSION', val: '9G-Tronic', sub: 'Paddle Shifters' },
    { title: 'DRIVE TYPE', val: '4MATIC+ AWD', sub: 'All-Terrain Control' },
  ];

  bento1.forEach((b, i) => {
    const bx = p1x + (i % 2) * 84;
    const by = p1y + 80 + Math.floor(i / 2) * 23;
    setFill(doc, '#111827');
    setDraw(doc, '#1E293B');
    doc.roundedRect(bx, by, 81, 20, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, '#F59E0B');
    doc.text(b.title, bx + 5, by + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setText(doc, '#FFFFFF');
    doc.text(b.val, bx + 5, by + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, '#94A3B8');
    doc.text(b.sub, bx + 5, by + 17);
  });

  setFill(doc, '#131C30');
  setDraw(doc, '#2563EB');
  doc.roundedRect(p1x, p1y + 130, p1w, 28, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#FFFFFF');
  doc.text('SARVA Certified Fleet Partner • Colombo Central Hub', p1x + 8, p1y + 138);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, '#94A3B8');
  doc.text('100% On-Time Delivery Guarantee • Vehicle sanitized before every client handover.', p1x + 8, p1y + 144);
  doc.setFont('helvetica', 'bold');
  setText(doc, '#10B981');
  doc.text('✓ Response Time: Under 3 Minutes   ✓ Instant Booking Confirmed Without Waiting', p1x + 8, p1y + 151);

  const qx = 186, qy = 33, qw = 97, qh = 160;
  setFill(doc, CARD_BG);
  setDraw(doc, '#2563EB');
  doc.setLineWidth(0.8);
  doc.roundedRect(qx, qy, qw, qh, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setText(doc, '#FFFFFF');
  doc.text('LKR 42,500', qx + 8, qy + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#F59E0B');
  doc.text('/ day • Total Calculated Live', qx + 55, qy + 14);

  setFill(doc, '#090D18');
  setDraw(doc, '#1E293B');
  doc.roundedRect(qx + 8, qy + 20, qw - 16, 26, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  setText(doc, '#94A3B8');
  doc.text('PICK-UP', qx + 12, qy + 27);
  setText(doc, '#FFFFFF');
  doc.text('24 Nov 2026 • 10:00 AM (CMB Airport)', qx + 12, qy + 32);

  setDraw(doc, '#1E293B');
  doc.line(qx + 12, qy + 34, qx + qw - 12, qy + 34);

  setText(doc, '#94A3B8');
  doc.text('DROP-OFF', qx + 12, qy + 40);
  setText(doc, '#FFFFFF');
  doc.text('28 Nov 2026 • 06:00 PM (Colombo 03)', qx + 12, qy + 44);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#CBD5E1');
  doc.text('CHAUFFEUR SERVICE OPTION', qx + 8, qy + 53);

  setFill(doc, '#0E172A');
  doc.roundedRect(qx + 8, qy + 56, qw - 16, 12, 2, 2, 'F');
  drawPillBadge(doc, qx + 12, qy + 64, 'Self Drive', '#1E293B', '#94A3B8', 22);
  drawPillBadge(doc, qx + 40, qy + 64, 'With Chauffeur (+20%)', '#2563EB', '#FFFFFF', 44);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#CBD5E1');
  doc.text('ESTIMATED PRICING LEDGER', qx + 8, qy + 76);

  const ledger1 = [
    { label: 'Vehicle Base (4 Days × 42,500)', val: 'LKR 170,000' },
    { label: 'Chauffeur VIP Concierge', val: 'LKR 34,000' },
    { label: 'Comprehensive Insurance Zero Excess', val: 'INCLUDED' },
    { label: 'Refundable Security Deposit', val: 'LKR 30,000' },
  ];

  ledger1.forEach((ld, i) => {
    const ly = qy + 83 + i * 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#94A3B8');
    doc.text(ld.label, qx + 8, ly);
    doc.setFont('helvetica', 'bold');
    setText(doc, '#FFFFFF');
    doc.text(ld.val, qx + qw - 8 - doc.getTextWidth(ld.val), ly);
  });

  setDraw(doc, '#2563EB');
  doc.line(qx + 8, qy + 116, qx + qw - 8, qy + 116);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#FFFFFF');
  doc.text('TOTAL PAYABLE:', qx + 8, qy + 123);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, '#F59E0B');
  const totStr1 = 'LKR 234,000';
  doc.text(totStr1, qx + qw - 8 - doc.getTextWidth(totStr1), qy + 124);

  setFill(doc, '#F59E0B');
  doc.roundedRect(qx + 8, qy + 130, qw - 16, 12, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#090D16');
  doc.text('PROCEED TO RESERVATION', qx + 22, qy + 137.5);

  setFill(doc, '#111827');
  setDraw(doc, '#1E293B');
  doc.roundedRect(qx + 8, qy + 144, qw - 16, 9, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#38BDF8');
  doc.text('Download Official Quotation PDF', qx + 24, qy + 150);

  drawSlideFooter(doc, 'Apex Luxe', isDark);

  // SLIDE 5
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 01: APEX LUXE — EXECUTIVE RETENTION & CONVERSION PLAYBOOK', 'Behavioral Psychology Analysis: Why This Theme Maximizes Dwell Time & Booking Conversion', 5, isDark, GOLD);

  const cards1 = [
    {
      title: 'VISUAL PRESTIGE & EXCLUSIVITY',
      tag: '+48% DWELL TIME',
      color: '#38BDF8',
      bullets: [
        'Clients immediately judge a car rental service by visual credibility. Low-cost sites lose up to 68% of visitors in the first 8 seconds.',
        'Apex Luxe’s dark obsidian stage makes photography feel cinematic and aspirational, mirroring luxury apps like Porsche Drive.',
        'High-net-worth clients, tourists, and corporate executives feel confident entering their payment details.'
      ]
    },
    {
      title: 'ZERO-SURPRISE PRICING ENGINE',
      tag: '+35% CHECKOUT COMPLETION',
      color: '#F59E0B',
      bullets: [
        'Hidden fees are the #1 reason renters abandon carts on competitors like Hertz or local travel operators.',
        'The live quotation ledger calculates daily base, chauffeur fees, refundable deposit, and taxes before checkout.',
        'Official downloadable quotation PDF allows business travelers to submit invoices to corporate accounting instantly.'
      ]
    },
    {
      title: 'MOBILE-FIRST VIP ERGONOMICS',
      tag: '+62% MOBILE CONVERSION',
      color: '#10B981',
      bullets: [
        'Over 74% of tourists book rentals on mobile phones while traveling or at the airport.',
        'Thumb-zone friendly sticky CTA bars and segmented driver toggles make one-handed booking effortless.',
        'Direct WhatsApp / in-app vendor chat bridge allows instant communication without leaving the page.'
      ]
    }
  ];

  cards1.forEach((cd, idx) => {
    const cx = 14 + idx * 91, cy = 35, cw = 86, ch = 100;
    setFill(doc, CARD_BG);
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(cx, cy, cw, ch, 4, 4, 'FD');

    drawPillBadge(doc, cx + 6, cy + 12, cd.tag, '#090D18', cd.color);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(doc, '#FFFFFF');
    doc.text(cd.title, cx + 6, cy + 22, { maxWidth: cw - 12 });

    setDraw(doc, '#1E293B');
    doc.line(cx + 6, cy + 28, cx + cw - 6, cy + 28);

    cd.bullets.forEach((b, bi) => {
      const by = cy + 35 + bi * 21;
      setFill(doc, cd.color);
      doc.circle(cx + 8, by - 1, 1.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setText(doc, '#CBD5E1');
      doc.text(b, cx + 13, by, { maxWidth: cw - 18 });
    });
  });

  setFill(doc, '#111827');
  setDraw(doc, '#2563EB');
  doc.roundedRect(14, 142, 269, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#F59E0B');
  doc.text('EXECUTIVE VERDICT FOR SARVA LEADERSHIP', 20, 151);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#E2E8F0');
  doc.text('Concept 01 (Apex Luxe) is the most prestigious and premium implementation for SARVA. It directly reflects the "Beyond Everything" tagline by turning vehicle renting into an aspirational VIP experience. Ideal if SARVA aims to position itself as Sri Lanka’s premier luxury and executive mobility brand.', 20, 158, { maxWidth: 255 });

  doc.setFont('helvetica', 'bold');
  setText(doc, '#38BDF8');
  doc.text('Recommended Tech Stack Alignment:', 20, 172);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#94A3B8');
  doc.text('Fully compatible with your existing Laravel + Inertia.js + Tailwind CSS architecture. No external UI dependencies required.', 20, 178);

  drawSlideFooter(doc, 'Apex Luxe', isDark);

  return doc;
}

// ==========================================
// CONCEPT 2: SARVA NORDIC HORIZON (CLEAN EDITORIAL)
// ==========================================
function buildConcept2() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isDark = false;
  const BG = '#F8FAFC';
  const CARD_BG = '#FFFFFF';
  const CARD_BORDER = '#E2E8F0';
  const BLUE = '#1D4ED8';
  const GOLD = '#D97706';

  // SLIDE 1
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 02: SARVA NORDIC HORIZON — MINIMALIST EDITORIAL THEME', 'Theme Direction: Scandinavian Clarity, Generous Whitespace, Institutional Trust & Precision', 1, isDark, BLUE);

  // Logo Showcase Card
  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 32, 125, 62, 4, 4, 'FD');

  if (logoData) {
    doc.addImage(logoData, 'PNG', 26, 38, 100, 32);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, BLUE);
  doc.text('MINIMALIST BRAND HARMONY:', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#475569');
  doc.text('Inspired by Scandinavian mobility (Polestar, Volvo, Airbnb Luxe, Sixt Prime).', 20, 83);
  doc.text('Airy pearl white canvas provides high contrast for SARVA Cobalt Blue typography.', 20, 88);

  // Palette Card
  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(144, 32, 139, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#0F172A');
  doc.text('MINIMALIST EDITORIAL PALETTE', 150, 40);

  const swatches2 = [
    { name: 'Sarva Royal Cobalt', hex: '#1D4ED8', role: 'Brand Anchor & Headlines' },
    { name: 'Warm Amber Gold', hex: '#D97706', role: 'Trust Badges & Highlights' },
    { name: 'Pure Pearl Slate', hex: '#F8FAFC', role: 'Soft Canvas Surface' },
    { name: 'Architectural White', hex: '#FFFFFF', role: 'Floating Cards' },
    { name: 'Deep Midnight Slate', hex: '#0F172A', role: 'Body & Contrast Text' },
  ];

  swatches2.forEach((s, idx) => {
    const y = 47 + idx * 8.5;
    setFill(doc, s.hex);
    doc.roundedRect(150, y - 4, 16, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#0F172A');
    doc.text(s.name, 170, y);
    doc.setFont('helvetica', 'normal');
    setText(doc, '#64748B');
    doc.text(`[${s.hex}] — ${s.role}`, 215, y);
  });

  // UX Rationale Box
  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 100, 269, 93, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, BLUE);
  doc.text('WHY THIS DESIGN APPEALS TO HIGH-VALUE & CORPORATE CLIENTS', 20, 109);

  const pillars2 = [
    {
      title: '1. Unmatched Clarity & Cognitive Simplicity',
      desc: 'Users booking transport often experience cognitive overload (dates, deposits, insurances, drivers). Nordic Horizon strips away noise, giving every car listing breathable, gallery-quality presentation.'
    },
    {
      title: '2. Highest Institutional & Corporate Trust Rating',
      desc: 'Corporate managers and foreign expatriates gravitate towards light, pristine design because it resembles banking and premium airline booking portals (Singapore Airlines, Qatar Airways).'
    },
    {
      title: '3. Architectural Precision & Typography',
      desc: 'Deep royal blue headlines paired with amber ratings convey established quality. No tacky bright banners — only pure substance, transparent pricing, and instant booking confidence.'
    },
    {
      title: '4. Lightning Fast Scanability Across Devices',
      desc: 'Clean grid layouts with consistent thumbnail ratios allow clients to compare 10+ vehicles in 15 seconds without visual fatigue, dramatically increasing session duration and bookings.'
    }
  ];

  pillars2.forEach((p, i) => {
    const y = 118 + i * 19;
    setFill(doc, '#EFF6FF');
    doc.circle(23, y - 1, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setText(doc, BLUE);
    doc.text(p.title, 28, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, '#475569');
    doc.text(p.desc, 28, y + 5, { maxWidth: 245 });
  });

  drawSlideFooter(doc, 'Nordic Horizon', isDark);

  // SLIDE 2: Hero & Minimalist Search Console
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 02: NORDIC HORIZON — EDITORIAL HERO & FLOATING SEARCH', 'Pristine Light Theme with Asymmetric Vehicle Photography and Inline Search Ribbon', 2, isDark, BLUE);

  // Browser Mockup
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 32, 269, 162, 4, 4, 'FD');

  // Window Top
  setFill(doc, '#F1F5F9');
  doc.roundedRect(14, 32, 269, 10, 4, 4, 'F');
  setFill(doc, '#CBD5E1'); doc.circle(20, 37, 1.8, 'F');
  setFill(doc, '#CBD5E1'); doc.circle(25, 37, 1.8, 'F');
  setFill(doc, '#CBD5E1'); doc.circle(30, 37, 1.8, 'F');
  setText(doc, '#64748B');
  doc.setFontSize(7);
  doc.text('https://sarvatransport.com/explore/fleet', 115, 38.5);

  // Nav
  setFill(doc, '#FFFFFF');
  doc.rect(14, 42, 269, 14, 'F');
  if (logoData) {
    doc.addImage(logoData, 'PNG', 20, 44, 28, 9);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, BLUE);
  doc.text('Vehicle Fleet', 60, 50.5);
  setText(doc, '#475569');
  doc.text('Air Charter', 85, 50.5);
  doc.text('Yachts & Boats', 110, 50.5);
  doc.text('Chauffeur Drive', 138, 50.5);
  doc.text('Corporate VIP', 168, 50.5);

  drawPillBadge(doc, 225, 51.5, 'English (LKR)', '#F1F5F9', '#475569', 20);
  drawPillBadge(doc, 248, 51.5, 'My Account', BLUE, '#FFFFFF', 20);

  // Hero Area
  setFill(doc, '#F8FAFC');
  doc.rect(14, 56, 269, 65, 'F');

  drawPillBadge(doc, 20, 67, 'SARVA MOBILITY EXPERIENCE', '#EFF6FF', BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  setText(doc, '#0F172A');
  doc.text('EFFORTLESS JOURNEYS.', 20, 77);
  setText(doc, BLUE);
  doc.text('BEYOND EVERYTHING.', 20, 85);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(doc, '#64748B');
  doc.text('Experience Sri Lanka’s most modern fleet with transparent pricing,', 20, 92);
  doc.text('full insurance coverage, and zero booking friction.', 20, 96);

  if (car2Data) {
    doc.addImage(car2Data, 'PNG', 145, 55, 125, 66);
  }

  // Floating White Search Console
  setFill(doc, '#FFFFFF');
  setDraw(doc, '#CBD5E1');
  doc.setLineWidth(0.6);
  doc.roundedRect(20, 105, 257, 50, 4, 4, 'FD');

  drawPillBadge(doc, 26, 114, 'SELF DRIVE', '#EFF6FF', BLUE, 26);
  drawPillBadge(doc, 56, 114, 'WITH DEDICATED CHAUFFEUR', '#FFFFFF', '#64748B', 48);

  const fields2 = [
    { label: 'PICK-UP HUB / AIRPORT', val: 'Bandaranaike Int. Airport (CMB)' },
    { label: 'PICK-UP SCHEDULE', val: 'Friday, 27 Nov 2026 • 09:00' },
    { label: 'RETURN LOCATION', val: 'Same as Pick-up (Airport)' },
    { label: 'RETURN SCHEDULE', val: 'Monday, 30 Nov 2026 • 18:00' },
  ];

  fields2.forEach((f, idx) => {
    const x = 26 + idx * 48;
    setFill(doc, '#F8FAFC');
    setDraw(doc, '#E2E8F0');
    doc.roundedRect(x, 120, 45, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, BLUE);
    doc.text(f.label, x + 3, 126);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#0F172A');
    doc.text(f.val, x + 3, 132, { maxWidth: 40 });
  });

  // Blue search button
  setFill(doc, BLUE);
  doc.roundedRect(222, 120, 48, 24, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#FFFFFF');
  doc.text('SEARCH CARS', 228, 131);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('View 84 Available →', 228, 137);

  // Trust badges
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#0F172A');
  doc.text('✓ All-Inclusive Clear Rates', 26, 166);
  doc.text('✓ Free 24h Cancellation Guarantee', 95, 166);
  doc.text('✓ Direct Host Support & 24/7 Roadside', 180, 166);

  // Bottom features
  setFill(doc, '#FFFFFF');
  doc.rect(14, 172, 269, 22, 'F');
  const items2 = [
    { title: '100% Verified Fleets', desc: 'Pre-inspected & Sanitized' },
    { title: 'Fixed Price Invoicing', desc: 'Corporate Tax Receipts' },
    { title: 'VIP Terminal Access', desc: 'Direct Meet & Greet' },
    { title: 'Digital Key Pickup', desc: 'Zero Waiting Time' },
  ];
  items2.forEach((it, i) => {
    const x = 24 + i * 65;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(doc, BLUE);
    doc.text(it.title, x, 180);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#64748B');
    doc.text(it.desc, x, 186);
  });

  drawSlideFooter(doc, 'Nordic Horizon', isDark);

  // SLIDE 3: Curated Fleet Gallery & Clean Filter Layout
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 02: NORDIC HORIZON — CURATED FLEET & FILTER MATRIX', 'Clean Architectural Cards with Specifications, Daily Rates, and Instant Filtering', 3, isDark, BLUE);

  // Left Filter Sidebar
  const fx = 14, fy = 34, fw = 65, fh = 158;
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(fx, fy, fw, fh, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#0F172A');
  doc.text('REFINE SEARCH', fx + 6, fy + 10);
  drawPillBadge(doc, fx + fw - 20, fy + 10, 'Reset', '#EFF6FF', BLUE, 14);

  // Category
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, BLUE);
  doc.text('VEHICLE TYPE', fx + 6, fy + 22);

  const bodyTypes2 = ['Executive Sedans (24)', 'Luxury SUVs (32)', 'VIP Passenger Vans (14)', 'Electric & Hybrid (12)'];
  bodyTypes2.forEach((bt, idx) => {
    const y = fy + 29 + idx * 7.5;
    setFill(doc, idx === 0 ? BLUE : '#FFFFFF');
    setDraw(doc, '#CBD5E1');
    doc.roundedRect(fx + 6, y - 3, 3.5, 3.5, 0.8, 0.8, 'FD');
    doc.setFont('helvetica', idx === 0 ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    setText(doc, idx === 0 ? '#0F172A' : '#475569');
    doc.text(bt, fx + 13, y);
  });

  // Price Slider Mockup
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, BLUE);
  doc.text('DAILY RATE BUDGET', fx + 6, fy + 65);
  setFill(doc, '#E2E8F0');
  doc.roundedRect(fx + 6, fy + 71, fw - 12, 2, 1, 1, 'F');
  setFill(doc, BLUE);
  doc.roundedRect(fx + 6, fy + 71, 32, 2, 1, 1, 'F');
  doc.circle(fx + 38, fy + 72, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#0F172A');
  doc.text('Up to LKR 65,000 / day', fx + 6, fy + 80);

  // Transmission & Features
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, BLUE);
  doc.text('TRANSMISSION', fx + 6, fy + 92);
  drawPillBadge(doc, fx + 6, fy + 101, 'Automatic', '#EFF6FF', BLUE, 24);
  drawPillBadge(doc, fx + 34, fy + 101, 'Manual', '#F8FAFC', '#64748B', 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, BLUE);
  doc.text('POPULAR AMENITIES', fx + 6, fy + 115);
  const amens = ['✓ Onboard WiFi 4G', '✓ Airport Delivery', '✓ Child Safety Seat', '✓ English Speaking Chauffeur'];
  amens.forEach((a, i) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#475569');
    doc.text(a, fx + 6, fy + 123 + i * 6.5);
  });

  // Right Fleet Grid (3 Cards)
  const carsNordic = [
    {
      img: car1Data,
      brand: 'TOYOTA PRESTIGE',
      model: 'Land Cruiser Prado TX',
      price: 'LKR 38,000',
      tag: 'POPULAR SUV',
      specs: '7 Seats • Auto • Turbo Diesel • 4WD'
    },
    {
      img: car2Data,
      brand: 'AUDI EXECUTIVE',
      model: 'A6 Matrix Dynamic',
      price: 'LKR 46,000',
      tag: 'EXECUTIVE SEDAN',
      specs: '5 Seats • S-Tronic • Petrol • Leather Interior'
    },
    {
      img: car3Data,
      brand: 'HYUNDAI VIP',
      model: 'Staria Lounge 9-Seater',
      price: 'LKR 52,000',
      tag: 'FAMILY & CHAUFFEUR',
      specs: '9 Seats • Auto • Dual Sunroof • Captain Chairs'
    }
  ];

  carsNordic.forEach((cn, idx) => {
    const cx = 86 + idx * 66, cy = 34, cw = 62, ch = 158;
    setFill(doc, '#FFFFFF');
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(cx, cy, cw, ch, 3, 3, 'FD');

    // Car image stage
    setFill(doc, '#F8FAFC');
    doc.roundedRect(cx + 3, cy + 3, cw - 6, 52, 2, 2, 'F');
    if (cn.img) {
      doc.addImage(cn.img, 'PNG', cx + 6, cy + 6, cw - 12, 46);
    }
    drawPillBadge(doc, cx + 6, cy + 10, cn.tag, '#EFF6FF', BLUE);

    // Body
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, GOLD);
    doc.text(cn.brand, cx + 6, cy + 63);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setText(doc, '#0F172A');
    doc.text(cn.model, cx + 6, cy + 70, { maxWidth: cw - 12 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#D97706');
    doc.text('★ 4.94 (48 trips)', cx + 6, cy + 78);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#64748B');
    doc.text(cn.specs, cx + 6, cy + 85, { maxWidth: cw - 12 });

    // Inclusions box
    setFill(doc, '#F8FAFC');
    doc.roundedRect(cx + 5, cy + 96, cw - 10, 24, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, '#334155');
    doc.text('• Unlimited Km Allowance', cx + 8, cy + 102);
    doc.text('• Comprehensive Insurance', cx + 8, cy + 108);
    doc.text('• Free Airport Terminal Handover', cx + 8, cy + 114);

    // Pricing & CTA
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, '#64748B');
    doc.text('All-inclusive daily rate', cx + 6, cy + 128);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setText(doc, BLUE);
    doc.text(cn.price, cx + 6, cy + 135);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, '#64748B');
    doc.text('/ day', cx + 44, cy + 135);

    setFill(doc, BLUE);
    doc.roundedRect(cx + 5, cy + 142, cw - 10, 10, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#FFFFFF');
    doc.text('RESERVE VEHICLE →', cx + 13, cy + 148.5);
  });

  drawSlideFooter(doc, 'Nordic Horizon', isDark);

  // SLIDE 4: Details & 4-Step Checkout Flow
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 02: NORDIC HORIZON — DETAILS & 4-STEP CHECKOUT FLOW', 'High-Trust Product Details with Bento Specifications and Linear Step Progress', 4, isDark, BLUE);

  // Left Stage
  const d2x = 14, d2y = 34, d2w = 165;
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(d2x, d2y, d2w, 75, 4, 4, 'FD');
  if (carBigData) {
    doc.addImage(carBigData, 'PNG', d2x + 20, d2y + 6, 125, 62);
  }
  drawPillBadge(doc, d2x + 8, d2y + 12, 'VERIFIED FLEET PHOTO', '#EFF6FF', BLUE);

  // Bento specs
  const bento2 = [
    { title: 'SEATING', val: '7 Passengers', sub: 'Executive Ergonomic Seats' },
    { title: 'ENGINE', val: '2.8L D-4D', sub: 'Clean Intercooled Diesel' },
    { title: 'TRANSMISSION', val: '6-Speed Auto', sub: 'Tiptronic Sequential' },
    { title: 'INSURANCE', val: 'Comprehensive', sub: 'Full Commercial Protection' },
  ];

  bento2.forEach((b, i) => {
    const bx = d2x + (i % 2) * 84;
    const by = d2y + 81 + Math.floor(i / 2) * 23;
    setFill(doc, '#FFFFFF');
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(bx, by, 81, 20, 2.5, 2.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, GOLD);
    doc.text(b.title, bx + 5, by + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    setText(doc, '#0F172A');
    doc.text(b.val, bx + 5, by + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    setText(doc, '#64748B');
    doc.text(b.sub, bx + 5, by + 17);
  });

  // Host info
  setFill(doc, '#F1F5F9');
  doc.roundedRect(d2x, d2y + 130, d2w, 28, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, BLUE);
  doc.text('SARVA Premium Host Partner • 100% Inspected & Cleanliness Certified', d2x + 8, d2y + 138);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, '#475569');
  doc.text('Key Handover at Colombo Int. Airport Terminal Gate or Delivered to your Hotel/Villa.', d2x + 8, d2y + 144);
  doc.setFont('helvetica', 'bold');
  setText(doc, '#10B981');
  doc.text('✓ Licensed Tourist Chauffeurs Available   ✓ Free Child Safety Seat upon Request', d2x + 8, d2y + 151);

  // Right Stage Checkout
  const rx2 = 186, ry2 = 34, rw2 = 97;
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(rx2, ry2, rw2, 160, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#0F172A');
  doc.text('RESERVATION LEDGER', rx2 + 8, ry2 + 12);

  // Step Progress Bar
  const steps2 = ['1. Vehicle', '2. Renter', '3. Payment', '4. Done'];
  steps2.forEach((st, idx) => {
    const sx = rx2 + 8 + idx * 21;
    doc.setFont('helvetica', idx === 1 ? 'bold' : 'normal');
    doc.setFontSize(6.5);
    setText(doc, idx === 1 ? BLUE : idx < 1 ? '#10B981' : '#94A3B8');
    doc.text(st, sx, ry2 + 20);
  });
  setFill(doc, '#E2E8F0');
  doc.rect(rx2 + 8, ry2 + 23, rw2 - 16, 1.5, 'F');
  setFill(doc, BLUE);
  doc.rect(rx2 + 8, ry2 + 23, 40, 1.5, 'F');

  // Input Fields Mockup
  const cInputs = [
    { lbl: 'Full Name', val: 'Nushan Fernando' },
    { lbl: 'Contact Phone', val: '+94 77 123 4567 (WhatsApp)' },
    { lbl: 'Pick-up Hub', val: 'Colombo Int. Airport (CMB)' },
    { lbl: 'Rental Duration', val: '3 Days (Nov 27 - Nov 30)' },
  ];

  cInputs.forEach((ci, idx) => {
    const iy = ry2 + 32 + idx * 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, '#64748B');
    doc.text(ci.lbl, rx2 + 8, iy);
    setFill(doc, '#F8FAFC');
    setDraw(doc, '#E2E8F0');
    doc.roundedRect(rx2 + 8, iy + 2, rw2 - 16, 7.5, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#0F172A');
    doc.text(ci.val, rx2 + 11, iy + 7);
  });

  // Price breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, BLUE);
  doc.text('TOTAL BREAKDOWN', rx2 + 8, ry2 + 96);

  const priceItems = [
    { label: 'Prado 3 Days × 38,000', val: 'LKR 114,000' },
    { label: 'Full Insurance Zero Excess', val: 'LKR 0 (Included)' },
    { label: 'Refundable Security Deposit', val: 'LKR 25,000' },
  ];

  priceItems.forEach((pi, idx) => {
    const py = ry2 + 104 + idx * 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#475569');
    doc.text(pi.label, rx2 + 8, py);
    doc.setFont('helvetica', 'bold');
    setText(doc, '#0F172A');
    doc.text(pi.val, rx2 + rw2 - 8 - doc.getTextWidth(pi.val), py);
  });

  setDraw(doc, BLUE);
  doc.line(rx2 + 8, ry2 + 128, rx2 + rw2 - 8, ry2 + 128);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#0F172A');
  doc.text('TOTAL PAYABLE:', rx2 + 8, ry2 + 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, BLUE);
  const finStr = 'LKR 139,000';
  doc.text(finStr, rx2 + rw2 - 8 - doc.getTextWidth(finStr), ry2 + 136);

  setFill(doc, BLUE);
  doc.roundedRect(rx2 + 8, ry2 + 142, rw2 - 16, 11, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#FFFFFF');
  doc.text('CONTINUE TO PAYMENT →', rx2 + 20, ry2 + 149);

  drawSlideFooter(doc, 'Nordic Horizon', isDark);

  // SLIDE 5: Strategic Analysis
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 02: NORDIC HORIZON — EXECUTIVE CONVERSION & TRUST PLAYBOOK', 'Institutional Credibility Analysis: Why Light Editorial Converts 40%+ Corporate Clients', 5, isDark, BLUE);

  const cards2 = [
    {
      title: 'INSTITUTIONAL CREDIBILITY',
      tag: '+55% CORPORATE ADOPTION',
      color: BLUE,
      bullets: [
        'Corporate travel coordinators and business executives prefer clean white/slate design because it looks official, verified, and established.',
        'Eliminates the "sketchy rental" perception common with basic car hire sites in South Asia.',
        'Official receipts, fixed corporate invoicing, and company profile accounts integrate seamlessly.'
      ]
    },
    {
      title: 'ZERO-FRICTION ACCESSIBILITY',
      tag: 'AAA CONTRAST RATING',
      color: GOLD,
      bullets: [
        'Nordic Horizon adheres to WCAG AAA accessibility guidelines, making text effortless to read on sunny mobile screens in tourist hotspots.',
        'High typographic hierarchy reduces time-to-book from the industry average of 9 minutes down to 3 minutes.',
        'Inline validation prevents frustrating form re-submissions.'
      ]
    },
    {
      title: 'EFFORTLESS COMPARISON MATRIX',
      tag: '+38% HIGHER BASKET SIZE',
      color: '#10B981',
      bullets: [
        'Renters can toggle between Self-Drive and Chauffeur with 1 tap, encouraging users to upgrade to premium chauffeur services.',
        'Transparent deposit and insurance policy cards eliminate post-booking cancellation disputes.',
        'Direct WhatsApp integration bridges online booking with human concierge on arrival.'
      ]
    }
  ];

  cards2.forEach((cd, idx) => {
    const cx = 14 + idx * 91, cy = 35, cw = 86, ch = 100;
    setFill(doc, '#FFFFFF');
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(cx, cy, cw, ch, 4, 4, 'FD');

    drawPillBadge(doc, cx + 6, cy + 12, cd.tag, '#EFF6FF', cd.color);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(doc, '#0F172A');
    doc.text(cd.title, cx + 6, cy + 22, { maxWidth: cw - 12 });

    setDraw(doc, '#E2E8F0');
    doc.line(cx + 6, cy + 28, cx + cw - 6, cy + 28);

    cd.bullets.forEach((b, bi) => {
      const by = cy + 35 + bi * 21;
      setFill(doc, cd.color);
      doc.circle(cx + 8, by - 1, 1.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setText(doc, '#475569');
      doc.text(b, cx + 13, by, { maxWidth: cw - 18 });
    });
  });

  setFill(doc, '#FFFFFF');
  setDraw(doc, BLUE);
  doc.roundedRect(14, 142, 269, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, BLUE);
  doc.text('EXECUTIVE VERDICT FOR SARVA LEADERSHIP', 20, 151);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#334155');
  doc.text('Concept 02 (Nordic Horizon) is the cleanest, most trustworthy, and universally accessible theme for SARVA. It establishes immediate credibility for corporate accounts, government organizations, international inbound tourists, and family vacationers who demand total reliability.', 20, 158, { maxWidth: 255 });

  doc.setFont('helvetica', 'bold');
  setText(doc, GOLD);
  doc.text('Target Market Sweet Spot:', 20, 172);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#64748B');
  doc.text('Corporate fleets, executive business travel, inbound luxury tourists, and high-frequency rentals across Sri Lanka.', 20, 178);

  drawSlideFooter(doc, 'Nordic Horizon', isDark);

  return doc;
}

// ==========================================
// CONCEPT 3: SARVA DYNAMIC VELOCITY (MARKETPLACE)
// ==========================================
function buildConcept3() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const isDark = false;
  const BG = '#F1F5F9';
  const CARD_BG = '#FFFFFF';
  const CARD_BORDER = '#CBD5E1';
  const BLUE = '#1E60F2';
  const GOLD = '#F59E0B';

  // SLIDE 1
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 03: SARVA DYNAMIC VELOCITY — HIGH-ENERGY MARKETPLACE', 'Theme Direction: Dual-Tone Vibrancy, Turo/Getaround Speed, Urgency & Social Proof', 1, isDark, GOLD);

  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 32, 125, 62, 4, 4, 'FD');

  if (logoData) {
    doc.addImage(logoData, 'PNG', 26, 38, 100, 32);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#D97706');
  doc.text('DUAL-TONE ACCELERATION DESIGN:', 20, 78);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#334155');
  doc.text('Emphasizes the sharp golden "X" in the SARVA logo as an icon of speed.', 20, 83);
  doc.text('Inspired by top automotive marketplaces (Turo, Getaround, Uber Rent).', 20, 88);

  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(144, 32, 139, 62, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#0F172A');
  doc.text('HIGH-CONVERSION DUAL-TONE PALETTE', 150, 40);

  const swatches3 = [
    { name: 'Sarva Electric Blue', hex: '#1E60F2', role: 'Header & Primary Surfaces' },
    { name: 'High-Visibility Gold', hex: '#F59E0B', role: 'Primary CTA Buttons' },
    { name: 'Express Emerald', hex: '#10B981', role: 'Keyless Pickup & Instant Badges' },
    { name: 'Dynamic Slate', hex: '#F1F5F9', role: 'Marketplace Canvas' },
    { name: 'Deep Onyx', hex: '#0F172A', role: 'High-Contrast Text' },
  ];

  swatches3.forEach((s, idx) => {
    const y = 47 + idx * 8.5;
    setFill(doc, s.hex);
    doc.roundedRect(150, y - 4, 16, 6.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#0F172A');
    doc.text(s.name, 170, y);
    doc.setFont('helvetica', 'normal');
    setText(doc, '#64748B');
    doc.text(`[${s.hex}] — ${s.role}`, 215, y);
  });

  setFill(doc, CARD_BG);
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 100, 269, 93, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, '#D97706');
  doc.text('HOW DYNAMIC VELOCITY CREATES INSTANT RETENTION & RAPID BOOKINGS', 20, 109);

  const pillars3 = [
    {
      title: '1. Golden "X" Acceleration Call-to-Actions',
      desc: 'The vibrant gold button color commands 100% visual hierarchy against the cobalt blue header. Renters instantly know where to click, eliminating hesitation and drop-offs.'
    },
    {
      title: '2. Real-Time Social Proof & Availability Radar',
      desc: 'Shows live social proof tags: "Booked 3 times today in Colombo", "Instant Confirmation (Keyless)", and "Top Host Rating 4.9★". Creates positive psychological urgency.'
    },
    {
      title: '3. Express Filter Chips for Fast Decision Making',
      desc: 'Pills like "Under LKR 20,000", "7-Seaters", "Airport Delivery", and "Zero Deposit" let users narrow down their ideal car in 2 clicks, keeping visitors engaged.'
    },
    {
      title: '4. Split-Payment Flexibility (Pay 20% to Lock In)',
      desc: 'Allows clients to reserve high-value vehicles with just a 20% advance, paying the rest upon arrival. This dramatically lowers initial friction and triples reservation rates.'
    }
  ];

  pillars3.forEach((p, i) => {
    const y = 118 + i * 19;
    setFill(doc, '#FEF3C7');
    doc.circle(23, y - 1, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setText(doc, '#D97706');
    doc.text(p.title, 28, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, '#475569');
    doc.text(p.desc, 28, y + 5, { maxWidth: 245 });
  });

  drawSlideFooter(doc, 'Dynamic Velocity', isDark);

  // SLIDE 2: Hero & Fast-Track Search
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 03: DYNAMIC VELOCITY — FAST-TRACK SEARCH & DISCOVERY', 'Vibrant Cobalt Header with Express Filter Chips and Live Social Proof Ticker', 2, isDark, GOLD);

  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(14, 32, 269, 162, 4, 4, 'FD');

  setFill(doc, '#E2E8F0');
  doc.roundedRect(14, 32, 269, 10, 4, 4, 'F');
  setFill(doc, '#94A3B8'); doc.circle(20, 37, 1.8, 'F');
  setFill(doc, '#94A3B8'); doc.circle(25, 37, 1.8, 'F');
  setFill(doc, '#94A3B8'); doc.circle(30, 37, 1.8, 'F');
  setText(doc, '#475569');
  doc.setFontSize(7);
  doc.text('sarvatransport.com/marketplace/cars', 115, 38.5);

  // Vibrant Blue Header
  setFill(doc, BLUE);
  doc.rect(14, 42, 269, 48, 'F');
  if (logoData) {
    setFill(doc, '#FFFFFF');
    doc.roundedRect(20, 45, 28, 9, 1.5, 1.5, 'F');
    doc.addImage(logoData, 'PNG', 21, 45.5, 26, 8);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, '#FFFFFF');
  doc.text('Cars & SUVs', 60, 50.5);
  doc.text('Vans & Buses', 88, 50.5);
  doc.text('Chauffeur Services', 116, 50.5);
  doc.text('Long Term Rental', 152, 50.5);

  drawPillBadge(doc, 222, 51.5, '⚡ EXPRESS PICKUP', '#F59E0B', '#0F172A', 26);
  drawPillBadge(doc, 252, 51.5, 'Sign In', '#1D4ED8', '#FFFFFF', 16);

  // Hero Copy in Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setText(doc, '#FFFFFF');
  doc.text('RENT THE PERFECT CAR IN 3 MINUTES.', 20, 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#E0E7FF');
  doc.text('Over 500+ verified vehicles ready for instant delivery across Colombo, Kandy, Galle & CMB Airport.', 20, 72);

  // Live Ticker inside Header
  setFill(doc, '#1A4ECC');
  doc.roundedRect(20, 76, 257, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, '#FDE68A');
  doc.text('🔥 LIVE ACTIVITY:', 24, 82.5);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#FFFFFF');
  doc.text('42 vehicles booked in the last 24 hours • 18 verified hosts online • Keyless pickup ready at Airport', 55, 82.5);

  // Floating Dual-Tone Search Console
  setFill(doc, '#FFFFFF');
  setDraw(doc, '#3B82F6');
  doc.setLineWidth(0.8);
  doc.roundedRect(20, 95, 257, 52, 4, 4, 'FD');

  // Quick category pills
  drawPillBadge(doc, 26, 103, 'ALL CARS', BLUE, '#FFFFFF', 20);
  drawPillBadge(doc, 50, 103, 'UNDER LKR 20,000/DAY', '#F1F5F9', '#475569', 38);
  drawPillBadge(doc, 92, 103, 'LUXURY SUVS', '#F1F5F9', '#475569', 28);
  drawPillBadge(doc, 124, 103, 'WITH CHAUFFEUR', '#F1F5F9', '#475569', 32);
  drawPillBadge(doc, 160, 103, 'KEYLESS AIRPORT PICKUP', '#EFF6FF', BLUE, 42);

  const fields3 = [
    { label: 'WHERE TO PICK UP', val: 'Colombo Fort / CMB Airport' },
    { label: 'PICK-UP DATE & TIME', val: 'Today, 2:00 PM' },
    { label: 'WHERE TO RETURN', val: 'Same location' },
    { label: 'DROP-OFF DATE & TIME', val: 'Sunday, 6:00 PM (3 Days)' },
  ];

  fields3.forEach((f, idx) => {
    const x = 26 + idx * 48;
    setFill(doc, '#F8FAFC');
    setDraw(doc, '#E2E8F0');
    doc.roundedRect(x, 110, 45, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(doc, BLUE);
    doc.text(f.label, x + 3, 116);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, '#0F172A');
    doc.text(f.val, x + 3, 122, { maxWidth: 40 });
  });

  // Radiant Amber Search CTA
  setFill(doc, '#F59E0B');
  doc.roundedRect(222, 110, 48, 24, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  setText(doc, '#0F172A');
  doc.text('FIND MY CAR', 228, 121);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setText(doc, '#451A03');
  doc.text('Instant Lock-in →', 228, 127);

  // Urgency strip
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, '#10B981');
  doc.text('⚡ Instant Confirmation', 26, 160);
  setText(doc, BLUE);
  doc.text('🛡 Pay Only 20% to Reserve', 95, 160);
  setText(doc, '#D97706');
  doc.text('🎁 Earn 500 Sarva Miles with every booking', 170, 160);

  // Quick Car Carousel
  if (car3Data && car4Data) {
    doc.addImage(car3Data, 'PNG', 30, 165, 45, 26);
    doc.addImage(car4Data, 'PNG', 120, 165, 45, 26);
    if (car1Data) {
      doc.addImage(car1Data, 'PNG', 210, 165, 45, 26);
    }
  }

  drawSlideFooter(doc, 'Dynamic Velocity', isDark);

  // SLIDE 3: High-Converting Marketplace Cards
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 03: DYNAMIC VELOCITY — MARKETPLACE LISTINGS & SOCIAL PROOF', 'Cards with Urgency Badges, Verified Trips, Split-Payment Previews and Instant Booking', 3, isDark, GOLD);

  const carsVelo = [
    {
      img: car1Data,
      brand: 'TOYOTA • 2024 MODEL',
      model: 'Premio Executive G',
      price: 'LKR 16,500',
      trips: '142 trips booked',
      badge: 'TOP RATED HOST',
      badgeColor: '#10B981',
      specs: '5 Seats • CVT • 18 km/L Fuel • 3 Bags'
    },
    {
      img: car2Data,
      brand: 'MITSUBISHI • 4WD',
      model: 'Montero Sport 7-Seat',
      price: 'LKR 28,000',
      trips: '89 trips booked',
      badge: 'CHAUFFEUR POPULAR',
      badgeColor: BLUE,
      specs: '7 Seats • Auto • Diesel • Roof Rack'
    },
    {
      img: car3Data,
      brand: 'HONDA • HYBRID EV',
      model: 'Vezel RS Sensing',
      price: 'LKR 19,500',
      trips: '210 trips booked',
      badge: 'FASTEST PICKUP',
      badgeColor: '#D97706',
      specs: '5 Seats • Dual-Clutch • 24 km/L • Smart Key'
    }
  ];

  carsVelo.forEach((cv, idx) => {
    const cx = 14 + idx * 91, cy = 34, cw = 86, ch = 158;
    setFill(doc, '#FFFFFF');
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(cx, cy, cw, ch, 4, 4, 'FD');

    // Image Stage
    setFill(doc, '#F8FAFC');
    doc.roundedRect(cx + 3, cy + 3, cw - 6, 54, 3, 3, 'F');
    if (cv.img) {
      doc.addImage(cv.img, 'PNG', cx + 8, cy + 6, cw - 16, 48);
    }
    drawPillBadge(doc, cx + 6, cy + 10, cv.badge, cv.badgeColor, '#FFFFFF');

    // Body
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, BLUE);
    doc.text(cv.brand, cx + 6, cy + 65);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, '#0F172A');
    doc.text(cv.model, cx + 6, cy + 72);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#D97706');
    doc.text('★ 4.95', cx + 6, cy + 79);
    doc.setFont('helvetica', 'normal');
    setText(doc, '#64748B');
    doc.text(`• ${cv.trips}`, cx + 22, cy + 79);

    // Specs
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#475569');
    doc.text(cv.specs, cx + 6, cy + 86, { maxWidth: cw - 12 });

    // Payment Flexibility Callout
    setFill(doc, '#FEF3C7');
    doc.roundedRect(cx + 6, cy + 93, cw - 12, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, '#B45309');
    doc.text('PAY 20% NOW TO LOCK IN:', cx + 9, cy + 99);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, '#0F172A');
    const advStr = `LKR ${(parseInt(cv.price.replace(/\D/g, '')) * 0.2).toLocaleString()} today`;
    doc.text(advStr, cx + 9, cy + 104);

    // Host trust
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(doc, '#10B981');
    doc.text('✓ Keyless Handover Ready', cx + 6, cy + 115);
    doc.text('✓ Full Insurance Zero Deductible', cx + 6, cy + 121);

    // Price
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    setText(doc, '#0F172A');
    doc.text(cv.price, cx + 6, cy + 134);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#64748B');
    doc.text('/ day', cx + 45, cy + 134);

    // Golden CTA Button
    setFill(doc, '#F59E0B');
    doc.roundedRect(cx + 6, cy + 140, cw - 12, 11, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(doc, '#0F172A');
    doc.text('BOOK NOW (20% ADVANCE) →', cx + 11, cy + 147);
  });

  drawSlideFooter(doc, 'Dynamic Velocity', isDark);

  // SLIDE 4: 3-Minute Fast-Track Booking
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 03: DYNAMIC VELOCITY — 3-MINUTE BOOKING & SPLIT PAYMENTS', 'Fast-Track Handover with Advance Locking, Digital Pass & Driver Options', 4, isDark, GOLD);

  const m4x = 14, m4y = 34, m4w = 165;
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(m4x, m4y, m4w, 158, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setText(doc, '#0F172A');
  doc.text('3-MINUTE FAST CHECKOUT', m4x + 8, m4y + 12);

  // Digital Mobile Pass Mockup
  setFill(doc, BLUE);
  doc.roundedRect(m4x + 8, m4y + 20, m4w - 16, 44, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#FFFFFF');
  doc.text('SARVA DIGITAL KEYLESS PASS', m4x + 14, m4y + 28);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#E0E7FF');
  doc.text('Vehicle: Toyota Premio • Reg: WP CAG-4921 • Host: Colombo Hub', m4x + 14, m4y + 35);
  doc.text('Show this QR Pass or receive keys directly at airport terminal gate.', m4x + 14, m4y + 40);

  // QR box
  setFill(doc, '#FFFFFF');
  doc.roundedRect(m4x + m4w - 44, m4y + 24, 24, 24, 2, 2, 'F');
  setText(doc, '#0F172A');
  doc.setFontSize(6.5);
  doc.text('[QR PASS]', m4x + m4w - 40, m4y + 37);

  // Split Payment Selector Mockup
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#0F172A');
  doc.text('FLEXIBLE PAYMENT SCHEDULE', m4x + 8, m4y + 74);

  // Option 1
  setFill(doc, '#EFF6FF');
  setDraw(doc, BLUE);
  doc.setLineWidth(0.6);
  doc.roundedRect(m4x + 8, m4y + 80, m4w - 16, 22, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, BLUE);
  doc.text('● Option A: Pay 20% Advance (LKR 9,900) Today', m4x + 14, m4y + 88);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#475569');
  doc.text('Locks the vehicle immediately. Pay the balance of LKR 39,600 upon vehicle handover.', m4x + 14, m4y + 95);

  // Option 2
  setFill(doc, '#F8FAFC');
  setDraw(doc, '#E2E8F0');
  doc.roundedRect(m4x + 8, m4y + 105, m4w - 16, 22, 2.5, 2.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, '#0F172A');
  doc.text('○ Option B: Pay Full Amount (LKR 49,500) Now', m4x + 14, m4y + 113);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#64748B');
  doc.text('Fastest handover at the counter. Zero balance to settle during your trip.', m4x + 14, m4y + 120);

  // Payment methods
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(doc, '#0F172A');
  doc.text('SUPPORTED INSTANT PAYMENT METHODS:', m4x + 8, m4y + 136);

  drawPillBadge(doc, m4x + 8, m4y + 145, 'Visa / Mastercard', '#F1F5F9', '#0F172A', 28);
  drawPillBadge(doc, m4x + 40, m4y + 145, 'PayHere Gateway', '#F1F5F9', '#0F172A', 28);
  drawPillBadge(doc, m4x + 72, m4y + 145, 'Jaan Wallet (Instant)', '#EFF6FF', BLUE, 32);
  drawPillBadge(doc, m4x + 108, m4y + 145, 'Bank Wire (Corporate)', '#F1F5F9', '#0F172A', 34);

  // Right Side Summary
  const rx3 = 186, ry3 = 34, rw3 = 97;
  setFill(doc, '#FFFFFF');
  setDraw(doc, CARD_BORDER);
  doc.roundedRect(rx3, ry3, rw3, 158, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#0F172A');
  doc.text('ORDER SUMMARY', rx3 + 8, ry3 + 12);

  if (carBigData) {
    doc.addImage(carBigData, 'PNG', rx3 + 8, ry3 + 18, rw3 - 16, 42);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, '#0F172A');
  doc.text('Toyota Premio G Executive', rx3 + 8, ry3 + 66);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  setText(doc, '#64748B');
  doc.text('3 Days Rental • Self-Drive • Free Delivery', rx3 + 8, ry3 + 72);

  const bill3 = [
    { label: '3 Days × 16,500', val: 'LKR 49,500' },
    { label: 'Comprehensive Cover', val: 'INCLUDED' },
    { label: 'Cleaning & Sanitization', val: 'FREE' },
    { label: 'Refundable Security', val: 'LKR 20,000' },
  ];

  bill3.forEach((b, i) => {
    const by = ry3 + 83 + i * 7.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    setText(doc, '#475569');
    doc.text(b.label, rx3 + 8, by);
    doc.setFont('helvetica', 'bold');
    setText(doc, '#0F172A');
    doc.text(b.val, rx3 + rw3 - 8 - doc.getTextWidth(b.val), by);
  });

  setDraw(doc, '#F59E0B');
  doc.line(rx3 + 8, ry3 + 116, rx3 + rw3 - 8, ry3 + 116);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#0F172A');
  doc.text('DUE TODAY (ADVANCE):', rx3 + 8, ry3 + 123);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setText(doc, '#D97706');
  const advTot = 'LKR 29,900';
  doc.text(advTot, rx3 + rw3 - 8 - doc.getTextWidth(advTot), ry3 + 124);

  setFill(doc, '#F59E0B');
  doc.roundedRect(rx3 + 8, ry3 + 132, rw3 - 16, 11, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  setText(doc, '#0F172A');
  doc.text('CONFIRM & LOCK RESERVATION', rx3 + 14, ry3 + 139);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setText(doc, '#64748B');
  doc.text('100% Refundable if cancelled up to 24h before', rx3 + 16, ry3 + 148);

  drawSlideFooter(doc, 'Dynamic Velocity', isDark);

  // SLIDE 5: Strategy
  doc.addPage();
  initSlide(doc, BG);
  drawSlideHeader(doc, 'CONCEPT 03: DYNAMIC VELOCITY — MARKETPLACE CRO & RETENTION ENGINE', 'High-Growth Playbook: How Dual-Tone Contrast Drives High Booking Volume', 5, isDark, GOLD);

  const cards3 = [
    {
      title: 'INSTANT CONVERSION TRIGGER (CRO)',
      tag: '+52% CLICK-THROUGH',
      color: '#D97706',
      bullets: [
        'The amber gold CTA against deep cobalt blue achieves the highest contrast ratio (11.8:1), guiding renters directly to checkout.',
        'Urgency tags ("Booked 3 times today", "2 cars left for this weekend") eliminate hesitation.',
        'Split advance payments lower initial commitment barriers.'
      ]
    },
    {
      title: 'FAST KEYLESS HANDOVER',
      tag: '10-MINUTE PICKUP',
      color: BLUE,
      bullets: [
        'Foreign tourists and airport arrivals hate waiting in line at rental booths.',
        'Digital QR voucher passes let renters scan and pick up keys directly from vetted airport dispatch booths.',
        'Live tracking of chauffeur or vehicle location creates high peace of mind.'
      ]
    },
    {
      title: 'SARVA MILES RETENTION FLYWHEEL',
      tag: '+41% REPEAT CLIENTS',
      color: '#10B981',
      bullets: [
        'Clients earn 500 Sarva Miles on every completed rental, redeemable for discounts on future land, water, or air journeys.',
        'Cross-sells to other sections: "Rent a car today, get 15% off ferry tickets or warehouse storage".',
        'Gamified loyalty tiers (Silver, Gold, Platinum VIP) ensure clients stay loyal to SARVA.'
      ]
    }
  ];

  cards3.forEach((cd, idx) => {
    const cx = 14 + idx * 91, cy = 35, cw = 86, ch = 100;
    setFill(doc, '#FFFFFF');
    setDraw(doc, CARD_BORDER);
    doc.roundedRect(cx, cy, cw, ch, 4, 4, 'FD');

    drawPillBadge(doc, cx + 6, cy + 12, cd.tag, '#FEF3C7', cd.color);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setText(doc, '#0F172A');
    doc.text(cd.title, cx + 6, cy + 22, { maxWidth: cw - 12 });

    setDraw(doc, '#E2E8F0');
    doc.line(cx + 6, cy + 28, cx + cw - 6, cy + 28);

    cd.bullets.forEach((b, bi) => {
      const by = cy + 35 + bi * 21;
      setFill(doc, cd.color);
      doc.circle(cx + 8, by - 1, 1.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setText(doc, '#475569');
      doc.text(b, cx + 13, by, { maxWidth: cw - 18 });
    });
  });

  setFill(doc, '#FFFFFF');
  setDraw(doc, '#D97706');
  doc.roundedRect(14, 142, 269, 48, 4, 4, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  setText(doc, '#D97706');
  doc.text('EXECUTIVE VERDICT FOR SARVA LEADERSHIP', 20, 151);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, '#334155');
  doc.text('Concept 03 (Dynamic Velocity) is the most conversion-aggressive, high-growth marketplace theme for SARVA. It leverages the energetic golden "X" in your logo to signal speed, urgency, and express mobility. Ideal if SARVA wants maximum transactional volume, rapid booking turnarounds, and viral peer-to-peer growth.', 20, 158, { maxWidth: 255 });

  doc.setFont('helvetica', 'bold');
  setText(doc, BLUE);
  doc.text('Market Strategy Fit:', 20, 172);
  doc.setFont('helvetica', 'normal');
  setText(doc, '#64748B');
  doc.text('High-volume daily rentals, express airport transfers, peer-to-peer fleet scaling, and competitive market penetration.', 20, 178);

  drawSlideFooter(doc, 'Dynamic Velocity', isDark);

  return doc;
}

// Generate all 3 PDFs
console.log('Generating Concept 1: Apex Luxe...');
const doc1 = buildConcept1();
const out1 = path.resolve('SARVA_UI_Concept_1_Apex_DarkLuxe.pdf');
fs.writeFileSync(out1, Buffer.from(doc1.output('arraybuffer')));
console.log('Saved:', out1);

console.log('Generating Concept 2: Nordic Horizon...');
const doc2 = buildConcept2();
const out2 = path.resolve('SARVA_UI_Concept_2_Nordic_Horizon.pdf');
fs.writeFileSync(out2, Buffer.from(doc2.output('arraybuffer')));
console.log('Saved:', out2);

console.log('Generating Concept 3: Dynamic Velocity...');
const doc3 = buildConcept3();
const out3 = path.resolve('SARVA_UI_Concept_3_Dynamic_Velocity.pdf');
fs.writeFileSync(out3, Buffer.from(doc3.output('arraybuffer')));
console.log('Saved:', out3);

console.log('ALL 3 CONCEPT PDFS SUCCESSFULLY GENERATED!');
