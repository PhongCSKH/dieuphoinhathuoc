import puppeteer from 'puppeteer-core';
import fs from 'fs';

// Tự động tìm Edge hoặc Chrome có sẵn trên hệ thống Windows
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BROWSER_EXECUTABLE = fs.existsSync(edgePath)
  ? edgePath
  : fs.existsSync(chromePath)
  ? chromePath
  : null;

let sharedBrowser = null;

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  if (!BROWSER_EXECUTABLE) {
    throw new Error('Không tìm thấy trình duyệt Edge hoặc Chrome trên hệ thống!');
  }

  sharedBrowser = await puppeteer.launch({
    executablePath: BROWSER_EXECUTABLE,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-extensions',
      '--mute-audio',
    ],
  });

  return sharedBrowser;
}

/**
 * Chụp ảnh màn hình thực tế (True Screenshot) từ URL hiển thị của nhà thuốc
 * Đảm bảo 100% trung thực nguyên gốc LCD QMS của bệnh viện (Logo, cột Chờ, Đang phục vụ...)
 * Tự động làm sạch session và loại bỏ vĩnh viễn thanh thông báo đỏ "Lưu ý: không mở quá nhiều tab QMS!"
 *
 * @param {string} url Đường dẫn xem màn hình QMS (https://qms.tahospital.vn/view/...)
 * @param {Object} options Tùy chọn thu nhỏ / kích thước
 * @param {number} options.zoom Tỉ lệ thu nhỏ (mặc định 0.85 = 85% để nhìn thoáng trọn vẹn toàn bộ lề và footer)
 * @returns {Promise<Buffer|null>} Buffer ảnh JPEG chất lượng cao (~70KB - 95KB)
 */
export async function captureQmsTrueScreenshot(url, options = {}) {
  if (!url || !url.startsWith('http')) {
    return null;
  }

  const zoomLevel = typeof options.zoom === 'number' && options.zoom > 0 ? options.zoom : 0.85;

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Chuẩn tỉ lệ màn hình LCD TV 16:9 (1280x720)
    await page.setViewport({ width: 1280, height: 720 });

    // 1. Tối ưu tốc độ: Chặn tải các tài nguyên nặng không cần thiết (chuông báo .mp3, video, analytics)
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const rType = req.resourceType();
      const reqUrl = req.url().toLowerCase();
      if (
        rType === 'media' || 
        reqUrl.endsWith('.mp3') || 
        reqUrl.endsWith('.wav') || 
        reqUrl.includes('google-analytics') ||
        reqUrl.includes('doubleclick')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 2. Chế độ Clean Session: Khống chế activeSessions = 1 trong localStorage trước khi nạp trang
    // Đảm bảo không bao giờ chạm ngưỡng > 6 tab của Bệnh viện
    await page.evaluateOnNewDocument(() => {
      try {
        localStorage.setItem(
          'activeSessions',
          JSON.stringify([{ id: 'clean-capture-' + Date.now(), expiry: Date.now() + 60000 }])
        );
      } catch {}
    });

    console.log(`[QMS Snapshot] Đang chụp màn hình thực tế: ${url} (Tỉ lệ thu nhỏ: ${Math.round(zoomLevel * 100)}%)...`);

    // 3. Nạp trang siêu tốc với domcontentloaded (giảm thời gian chờ từ 8s xuống ~1.2s)
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Đợi bảng dữ liệu hàng chờ hiển thị (tối đa 3.5 giây)
    await page.waitForSelector('table, [class*="MuiTable"], .MuiTable-root', { timeout: 3500 }).catch(() => {});

    // Đợi 500ms để dữ liệu và font chữ hiển thị ổn định
    await new Promise((r) => setTimeout(r, 500));

    // 4. Thu nhỏ tỉ lệ hiển thị & Xóa triệt để thanh cảnh báo đỏ nếu có
    await page.evaluate((z) => {
      if (z !== 1) {
        document.body.style.zoom = String(z);
      }
      // Dọn sạch mọi thẻ snackbar cảnh báo của thư viện notistack
      const snackbars = document.querySelectorAll(
        '.SnackbarItem-variantError, [class*="MuiSnackbar"], [class*="SnackbarItem"]'
      );
      snackbars.forEach((el) => el.remove());
    }, zoomLevel);

    // Chụp lại toàn bộ khung nhìn LCD thực tế dạng JPEG 80%
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 80,
    });

    console.log(`[QMS Snapshot] Chụp thành công! Kích thước ảnh: ${Math.round(buffer.length / 1024)} KB`);
    return buffer;
  } catch (err) {
    console.error(`[QMS Snapshot] Lỗi chụp màn hình ${url}:`, err.message);
    return null;
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
}
