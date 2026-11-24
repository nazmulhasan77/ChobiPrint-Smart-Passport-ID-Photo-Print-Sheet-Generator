/**
 * Generates sample studio portrait images on an HTML5 canvas for quick demo/testing.
 */
export function generateSamplePortrait(name: string, bgGradient: [string, string]): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 750;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  const grad = ctx.createLinearGradient(0, 0, 600, 750);
  grad.addColorStop(0, bgGradient[0]);
  grad.addColorStop(1, bgGradient[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 600, 750);

  // Studio lighting vignette
  const radial = ctx.createRadialGradient(300, 320, 50, 300, 320, 380);
  radial.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
  radial.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 600, 750);

  // Shoulders / Torso silhouette
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(300, 730, 240, 160, 0, 0, Math.PI * 2);
  ctx.fill();

  // Collar / Shirt detail
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.moveTo(250, 620);
  ctx.lineTo(300, 670);
  ctx.lineTo(350, 620);
  ctx.lineTo(330, 730);
  ctx.lineTo(270, 730);
  ctx.closePath();
  ctx.fill();

  // Neck
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.rect(265, 460, 70, 90);
  ctx.fill();

  // Head oval
  ctx.fillStyle = '#f6d8ae';
  ctx.beginPath();
  ctx.ellipse(300, 350, 105, 135, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(300, 275, 115, 80, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(265, 345, 9, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(335, 345, 9, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(250, 330);
  ctx.quadraticCurveTo(265, 325, 280, 330);
  ctx.moveTo(320, 330);
  ctx.quadraticCurveTo(335, 325, 350, 330);
  ctx.stroke();

  // Nose
  ctx.strokeStyle = '#d49b6a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(300, 345);
  ctx.lineTo(295, 385);
  ctx.lineTo(306, 385);
  ctx.stroke();

  // Gentle Smile
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(300, 415, 24, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Name badge at bottom
  ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
  ctx.fillRect(20, 690, 560, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(name, 300, 716);

  return canvas.toDataURL('image/jpeg', 0.95);
}
