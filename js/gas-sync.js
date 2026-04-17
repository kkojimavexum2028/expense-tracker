/* ============================================
   gas-sync.js - Google Apps Script 連携モジュール
   ============================================ */

/**
 * GAS Webアプリ URL
 * デプロイ後にここにURLを設定してください
 * 例: 'https://script.google.com/macros/s/xxxxx/exec'
 */
let GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxFwb-_BN4rlhSt9EnjfmbzPnlzCGgEYWFS38lY_0d74n9jZGE-mYE2wy5DruS-MVOe/exec';

/**
 * GASエンドポイントを設定する
 * @param {string} url - GAS WebアプリのURL
 */
function setGasEndpoint(url) {
  GAS_ENDPOINT = url;
  localStorage.setItem('gas_endpoint', url);
}

/**
 * 保存済みのGASエンドポイントを読み込む
 */
function loadGasEndpoint() {
  const saved = localStorage.getItem('gas_endpoint');
  if (saved) {
    GAS_ENDPOINT = saved;
  }
}

/**
 * GAS連携が有効かどうかを返す
 * @returns {boolean}
 */
function isGasEnabled() {
  return GAS_ENDPOINT.length > 0;
}

/**
 * 支出レコードをGAS経由でSpreadsheetに送信（非同期）
 * @param {Object} expense - 支出レコード
 * @returns {Promise<Object|null>} レスポンスデータ、またはnull（エラー時）
 */
async function syncExpenseToSheet(expense) {
  if (!isGasEnabled()) return null;

  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(expense),
    });
    return await response.json();
  } catch (error) {
    console.warn('GAS sync failed:', error);
    return null;
  }
}

/**
 * Spreadsheetから全レコードを取得（非同期）
 * @returns {Promise<Array<Object>|null>} レコード配列、またはnull（エラー時）
 */
async function fetchExpensesFromSheet() {
  if (!isGasEnabled()) return null;

  try {
    const response = await fetch(`${GAS_ENDPOINT}?action=getAll`);
    return await response.json();
  } catch (error) {
    console.warn('GAS fetch failed:', error);
    return null;
  }
}

// 初期化時にエンドポイントをロード
loadGasEndpoint();

export {
  setGasEndpoint,
  isGasEnabled,
  syncExpenseToSheet,
  fetchExpensesFromSheet,
};
