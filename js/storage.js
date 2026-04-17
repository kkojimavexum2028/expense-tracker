/* ============================================
   storage.js - localStorage操作モジュール
   ============================================ */

const STORAGE_KEY = 'expenses';

/**
 * localStorageからすべての支出レコードを取得
 * @returns {Array<Object>} 支出レコードの配列
 */
function getAllExpenses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to load expenses from localStorage:', e);
    return [];
  }
}

/**
 * 支出レコードの配列をlocalStorageに保存
 * @param {Array<Object>} expenses - 支出レコードの配列
 */
function saveAllExpenses(expenses) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses to localStorage:', e);
    throw new Error('データの保存に失敗しました。ストレージの容量を確認してください。');
  }
}

/**
 * 新しい支出レコードを追加
 * @param {{date: string, category: string, amount: number, memo: string}} data - 入力データ
 * @returns {Object} 追加されたレコード（id, createdAt, updatedAt付き）
 */
function addExpense(data) {
  const expenses = getAllExpenses();
  const now = new Date().toISOString();
  const record = {
    id: Date.now(),
    date: data.date,
    category: data.category,
    amount: data.amount,
    memo: data.memo || '',
    createdAt: now,
    updatedAt: now,
  };
  expenses.push(record);
  saveAllExpenses(expenses);
  return record;
}

/**
 * 指定IDの支出レコードを削除
 * @param {number} id - 削除するレコードのID
 * @returns {boolean} 削除に成功した場合true
 */
function deleteExpense(id) {
  const expenses = getAllExpenses();
  const filtered = expenses.filter(e => e.id !== id);
  if (filtered.length === expenses.length) {
    return false; // 該当レコードなし
  }
  saveAllExpenses(filtered);
  return true;
}

/**
 * 指定IDの支出レコードを更新
 * @param {number} id - 更新するレコードのID
 * @param {{date?: string, category?: string, amount?: number, memo?: string}} updates - 更新データ
 * @returns {Object|null} 更新されたレコード、またはnull（見つからない場合）
 */
function updateExpense(id, updates) {
  const expenses = getAllExpenses();
  const index = expenses.findIndex(e => e.id === id);
  if (index === -1) return null;

  expenses[index] = {
    ...expenses[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  saveAllExpenses(expenses);
  return expenses[index];
}

/**
 * 指定した年月の支出レコードを取得
 * @param {number} year - 年
 * @param {number} month - 月（1〜12）
 * @returns {Array<Object>} フィルタされた支出レコードの配列（日付降順）
 */
function getExpensesByMonth(year, month) {
  const expenses = getAllExpenses();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return expenses
    .filter(e => e.date.startsWith(prefix))
    .sort((a, b) => {
      // 日付降順、同日の場合はID降順（新しい順）
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.id - a.id;
    });
}

export {
  getAllExpenses,
  saveAllExpenses,
  addExpense,
  deleteExpense,
  updateExpense,
  getExpensesByMonth,
};
