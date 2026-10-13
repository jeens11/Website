export function createMiniMap(canvas, markerContainer, gates, player, worldRadius) {
  const context = canvas.getContext('2d');

  return function drawMiniMap(heading) {
    const rect = canvas.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    if (!size) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixels = Math.round(size * ratio);
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);

    const center = size / 2;
    const radius = size * 0.43;
    const scale = (radius - 12) / worldRadius;
    context.strokeStyle = 'rgba(168, 184, 216, .22)';
    context.lineWidth = 1;
    context.beginPath();
    context.arc(center, center, radius, 0, Math.PI * 2);
    context.stroke();

    gates.forEach((gate, index) => {
      const x = center + gate.pos.x * scale;
      const y = center + gate.pos.z * scale;
      context.strokeStyle = gate.color ? `#${gate.color.getHexString()}33` : 'rgba(130, 163, 255, .2)';
      context.beginPath();
      context.moveTo(center, center);
      context.lineTo(x, y);
      context.stroke();
      context.beginPath();
      context.fillStyle = gate.color ? `#${gate.color.getHexString()}` : '#477cff';
      context.arc(x, y, Math.max(3.5, size * 0.043), 0, Math.PI * 2);
      context.fill();

      const marker = markerContainer.children[index];
      if (marker) {
        marker.style.left = `${x}px`;
        marker.style.top = `${y}px`;
        if (gate.color) marker.style.setProperty('--accent', `#${gate.color.getHexString()}`);
        marker.classList.toggle('active', index === heading.nearestIndex && heading.near);
        if (index === heading.nearestIndex && heading.near) marker.setAttribute('aria-current', 'location');
        else marker.removeAttribute('aria-current');
      }
    });

    const x = center + player.car.position.x * scale;
    const y = center + player.car.position.z * scale;
    const dx = x - center;
    const dy = y - center;
    const distance = Math.hypot(dx, dy);
    const limit = radius - 7;
    const carX = distance > limit ? center + (dx / distance) * limit : x;
    const carY = distance > limit ? center + (dy / distance) * limit : y;
    context.save();
    context.translate(carX, carY);
    context.rotate(-player.car.rotation.y);
    context.fillStyle = '#f0f4ff';
    context.shadowColor = '#ff4fa3';
    context.shadowBlur = 7;
    context.beginPath();
    context.moveTo(0, -6);
    context.lineTo(4.2, 4);
    context.lineTo(0, 2.2);
    context.lineTo(-4.2, 4);
    context.closePath();
    context.fill();
    context.restore();
  };
}
