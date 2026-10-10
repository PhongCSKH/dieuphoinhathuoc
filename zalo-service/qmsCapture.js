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
  if (sharedBrowser && sharedBrowser.isConnected()) {
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
 * @returns {Promise<Buffer|null>} Buffer ảnh JPEG chất lượng cao (~80KB - 110KB)
 */
export async function captureQmsTrueScreenshot(url) {
  if (!url || !url.startsWith('http')) {
    return null;
  }

  let page = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Chuẩn tỉ lệ màn hình LCD TV 16:9 (1280x720)
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`[QMS Snapshot] Đang chụp màn hình thực tế: ${url}...`);

    // Điều hướng đến URL màn hình QMS, đợi mạng ổn định
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });

    // Đợi 1 giây để hiệu ứng render dữ liệu bảng hàng chờ hoàn tất
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
