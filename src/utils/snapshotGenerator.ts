import { PharmacyScreen } from '../types';

/**
 * Tạo ảnh Snapshot tóm tắt trực quan tình trạng các nhà thuốc lúc cảnh báo (Zero Impact - Không gọi server)
 * Vẽ canvas thuần phía client, nén thành JPEG thu nhỏ (~60KB - 90KB)
 * 
 * @param pharmacies Danh sách quầy nhà thuốc hiện tại
 * @param targetPharmacyId ID quầy cần chụp riêng (nếu mode = 'single')
 * @param mode 'single': Tập trung quầy sự cố, 'all': Toàn cảnh lưới nhà thuốc
 * @param alertTitle Tiêu đề thông điệp cảnh báo
 */
export async function generateDispatchSnapshot(params: {
  pharmacies: PharmacyScreen[];
  targetPharmacyId?: string;
  mode?: 'single' | 'all';
  alertTitle?: string;
}): Promise<string | null> {
  try {
    const { pharmacies, targetPharmacyId, mode = 'all', alertTitle } = params;

    // Chọn danh sách quầy cần vẽ lên ảnh snapshot
    let displayList = pharmacies.filter((p) => p.enabled);
    if (mode === 'single' && targetPharmacyId) {
      const found = pharmacies.find((p) => p.id === targetPharmacyId);
      if (found) {
        displayList = [found];
      }
    }

    if (displayList.length === 0) return null;

    const isSingle = displayList.length === 1;
    const canvasWidth = isSingle ? 800 : 1000;
    const headerHeight = 90;
    const footerHeight = 40;
    const cardGap = 16;
    const padding = 20;

    // Tính toán chiều cao canvas dựa trên số card
    let cardsAreaHeight = 0;
    if (isSingle) {
      cardsAreaHeight = 320;
    } else {
      const cols = 2;
      const rows = Math.ceil(displayList.length / cols);
      cardsAreaHeight = rows * 200 + (rows - 1) * cardGap;
    }

    const canvasHeight = headerHeight + cardsAreaHeight + footerHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 1. Nền tổng thể Dark Slate hiện đại
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Đường viền ngoài tinh tế
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvasWidth - 2, canvasHeight - 2);

    // 2. Vẽ Header Bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, headerHeight);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(canvasWidth, headerHeight);
    ctx.stroke();

    // Huy hiệu Icon / Logo
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(40, headerHeight / 2, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QMS', 40, headerHeight / 2);

    // Tiêu đề hệ thống
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('HỆ THỐNG ĐIỀU PHỐI NHÀ THUỐC BỆNH VIỆN TÂM ANH', 72, 36);

    // Thông tin mốc thời gian & Chế độ chụp
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px monospace';
    const subText = alertTitle
      ? `🚨 ${alertTitle}  •  Thời điểm chụp: ${nowStr}`
      : `📸 SNAPSHOT TÌNH TRẠNG THỜI GIAN THỰC  •  ${nowStr}`;
    ctx.fillText(subText, 72, 64);

    // 3. Vẽ từng Card Nhà thuốc
    let currentY = headerHeight + padding;

    if (isSingle) {
      // Chế độ 1 Card To (Focus)
      const ph = displayList[0];
      const cardW = canvasWidth - padding * 2;
      const cardH = cardsAreaHeight;

      drawPharmacyCard({
        ctx,
        x: padding,
        y: currentY,
        width: cardW,
        height: cardH,
        pharmacy: ph,
        isLarge: true,
      });
    } else {
      // Chế độ Lưới 2 Cột
      const cols = 2;
      const colW = (canvasWidth - padding * 2 - cardGap) / cols;
      const cardH = 200;

      displayList.forEach((ph, idx) => {
        const colIdx = idx % cols;
        const rowIdx = Math.floor(idx / cols);
        const cardX = padding + colIdx * (colW + cardGap);
        const cardY = currentY + rowIdx * (cardH + cardGap);

        drawPharmacyCard({
          ctx,
          x: cardX,
          y: cardY,
          width: colW,
          height: cardH,
          pharmacy: ph,
          isLarge: false,
        });
      });
    }

    // 4. Vẽ Footer Bar (Ghi chú an toàn Zero-Impact)
    const footerY = canvasHeight - footerHeight;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, footerY, canvasWidth, footerHeight);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      'Hệ thống tự động chụp & đính kèm tin nhắn Zalo  •  Dữ liệu trực quan thời gian thực máy trạm điều phối',
      canvasWidth / 2,
      footerY + footerHeight / 2
    );

    // 5. Xuất ảnh nén JPEG chất lượng 70% (kích thước tối ưu chỉ ~60KB - 90KB)
    return canvas.toDataURL('image/jpeg', 0.70);
  } catch (err) {
    console.error('[Snapshot Generator] Lỗi tạo ảnh snapshot:', err);
    return null;
  }
}

/**
 * Hàm phụ trợ vẽ từng Card Nhà Thuốc chi tiết
 */
function drawPharmacyCard(params: {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  width: number;
  height: number;
  pharmacy: PharmacyScreen;
  isLarge: boolean;
}) {
  const { ctx, x, y, width, height, pharmacy, isLarge } = params;
  const stats = pharmacy.stats || { waitingCount: 0, servingCount: 0, activeCounters: [] };
  const counterCount = stats.activeCounters.length;
  const isOverload = counterCount > 0 ? stats.waitingCount / counterCount >= 3 : stats.waitingCount > 0;
  const isNoCounter = stats.waitingCount > 0 && counterCount === 0;

  // Màu viền và nền card
  ctx.save();
  ctx.fillStyle = '#111827';
  roundRect(ctx, x, y, width, height, 12);
  ctx.fill();

  // Viền trạng thái
  ctx.lineWidth = isOverload ? 2.5 : 1.5;
  ctx.strokeStyle = isNoCounter
    ? '#ef4444' // Đỏ chót
    : isOverload
    ? '#f97316' // Cam đậm
    : '#1e293b'; // Slate bình thường
  ctx.stroke();

  // Header của Card
  ctx.fillStyle = isNoCounter
    ? 'rgba(239, 68, 68, 0.15)'
    : isOverload
    ? 'rgba(249, 115, 22, 0.12)'
    : 'rgba(30, 41, 59, 0.5)';
  roundRect(ctx, x, y, width, 44, { tl: 12, tr: 12, br: 0, bl: 0 });
  ctx.fill();

  // Tag Mã Quầy (NT1, NT2...)
  ctx.fillStyle = isNoCounter ? '#ef4444' : isOverload ? '#f97316' : '#0284c7';
  roundRect(ctx, x + 14, y + 10, 46, 24, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pharmacy.code || 'NT', x + 37, y + 22);

  // Tên nhà thuốc
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(pharmacy.name, x + 68, y + 22);

  // Trạng thái badge bên phải header
  const statusLabel = isNoCounter
    ? '🚨 CHƯA MỞ QUẦY'
    : isOverload
    ? '⚠️ VƯỢT TẢI TRỌNG'
    : '✅ BÌNH THƯỜNG';
  const statusColor = isNoCounter ? '#ef4444' : isOverload ? '#f97316' : '#10b981';

  ctx.textAlign = 'right';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = statusColor;
  ctx.fillText(statusLabel, x + width - 16, y + 22);

  // Các khối chỉ số Telemetry (Waiting, Serving, Active Counters)
  const metricsY = y + 58;
  const metricsW = width - 28;
  const metricBoxW = (metricsW - 16) / 2;
  const metricBoxH = isLarge ? 110 : 70;

  // Ô 1: Số khách chờ
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, x + 14, metricsY, metricBoxW, metricBoxH, 8);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('KHÁCH ĐANG CHỜ', x + 24, metricsY + 18);

  ctx.fillStyle = stats.waitingCount > 3 ? '#f87171' : '#f8fafc';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(String(stats.waitingCount), x + 24, metricsY + (isLarge ? 64 : 48));

  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText('bệnh nhân', x + 24 + ctx.measureText(String(stats.waitingCount)).width + 8, metricsY + (isLarge ? 64 : 48));

  // Ô 2: Đang phục vụ
  const box2X = x + 14 + metricBoxW + 16;
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, box2X, metricsY, metricBoxW, metricBoxH, 8);
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px sans-serif';
  ctx.fillText('ĐANG PHỤC VỤ', box2X + 12, metricsY + 18);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText(String(stats.servingCount), box2X + 12, metricsY + (isLarge ? 64 : 48));

  ctx.fillStyle = '#64748b';
  ctx.font = '11px sans-serif';
  ctx.fillText('bệnh nhân', box2X + 12 + ctx.measureText(String(stats.servingCount)).width + 8, metricsY + (isLarge ? 64 : 48));

  // Dòng danh sách quầy đang mở
  const countersY = metricsY + metricBoxH + 18;
  ctx.fillStyle = '#334155';
  roundRect(ctx, x + 14, countersY, metricsW, 36, 6);
  ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.fillText('Quầy đang mở:', x + 24, countersY + 18);

  const counterListStr = stats.activeCounters.length > 0
    ? stats.activeCounters.map((c) => `Quầy ${c}`).join(', ')
    : 'Chưa có quầy mở!';
  ctx.fillStyle = stats.activeCounters.length > 0 ? '#4ade80' : '#f87171';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(counterListStr, x + 120, countersY + 18);

  // Tỉ lệ tải trọng
  if (isLarge) {
    const taiTrongStr = counterCount > 0 ? (stats.waitingCount / counterCount).toFixed(1) : `${stats.waitingCount}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = isOverload ? '#fb923c' : '#cbd5e1';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Tải trọng: ${taiTrongStr} khách/quầy`, x + width - 24, countersY + 18);
  }

  ctx.restore();
}

/**
 * Tiện ích vẽ hình chữ nhật bo góc Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number | { tl: number; tr: number; br: number; bl: number }
) {
  let r = { tl: 0, tr: 0, br: 0, bl: 0 };
  if (typeof radius === 'number') {
    r = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    r = radius;
  }

  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + width - r.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r.tr);
  ctx.lineTo(x + width, y + height - r.br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r.br, y + height);
  ctx.lineTo(x + r.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}
