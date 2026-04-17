/* ============================================
   categories.js - カテゴリ定義・集計ロジック
   ============================================ */

/**
 * プリセットカテゴリの定義
 * @type {Array<{name: string, icon: string, color: string}>}
 */
const CATEGORIES = [
  { name: '食費',   icon: '🍽️', color: '#f97316' },
  { name: '交通費', icon: '🚃', color: '#3b82f6' },
  { name: '娯楽費', icon: '🎮', color: '#8b5cf6' },
  { name: '住居費', icon: '🏠', color: '#06b6d4' },
  { name: '衣服費', icon: '👕', color: '#ec4899' },
  { name: '医療費', icon: '💊', color: '#ef4444' },
  { name: '教育費', icon: '📚', color: '#14b8a6' },
  { name: '日用品', icon: '📦', color: '#f59e0b' },
  { name: '交際費', icon: '🎁', color: '#e879f9' },
  { name: 'その他', icon: '❓', color: '#64748b' },
];

/**
 * カテゴリ名からカテゴリオブジェクトを取得
 * @param {string} name - カテゴリ名
 * @returns {{name: string, icon: string, color: string}} カテゴリオブジェクト
 */
function getCategoryByName(name) {
  return CATEGORIES.find(c => c.name === name) || CATEGORIES[CATEGORIES.length - 1];
}

/**
 * カテゴリ別に支出を集計する
 * @param {Array<Object>} expenses - 支出レコードの配列
 * @returns {Array<{category: Object, total: number, count: number, percentage: number}>}
 *   categoryオブジェクト、合計額、件数、全体に占める割合（%）の配列。合計額降順でソート済み。
 */
function aggregateByCategory(expenses) {
  // カテゴリごとに合計と件数を集計
  const map = {};
  let grandTotal = 0;

  expenses.forEach(exp => {
    if (!map[exp.category]) {
      map[exp.category] = { total: 0, count: 0 };
    }
    map[exp.category].total += exp.amount;
    map[exp.category].count += 1;
    grandTotal += exp.amount;
  });

  // 配列に変換し、合計額とパーセンテージを計算
  const result = Object.entries(map).map(([name, { total, count }]) => ({
    category: getCategoryByName(name),
    total,
    count,
    percentage: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
  }));

  // 合計額降順でソート
  result.sort((a, b) => b.total - a.total);

  return result;
}

export { CATEGORIES, getCategoryByName, aggregateByCategory };
