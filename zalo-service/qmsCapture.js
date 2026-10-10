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
 * Đảm bảo 100% trung thực nguyên gốc LCD QMS
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

    console.log(`[QMS Snapshot] Đang chụp màn hình thực tế: ${url} (Tỉ lệ thu nhỏ: ${Math.round(zoomLevel * 100)}%)...`);

    // Điều hướng đến URL màn hình QMS, đợi mạng ổn định
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Thu nhỏ tỷ lệ hiển thị trang nếu zoomLevel khác 1 (giúp khung hình nhìn trọn vẹn từ Logo đến Footer cam)
    if (zoomLevel !== 1) {
      await page.evaluate((z) => {
        document.body.style.zoom = String(z);
      }, zoomLevel);
    }

    // Đợi 1 giây để render ổn định dữ liệu bảng hàng chờ
    await new Promise((r) => setTimeout(r, 1000));

    // Chụp lại toàn bộ khung nhìn LCD thực tế dạng JPEG 75%
    const buffer = await page.screenshot({
      type: 'jpeg',
      quality: 75,
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
