/* ============================================
   app.js - アプリ初期化・イベント管理
   ============================================ */

import { addExpense, deleteExpense, getExpensesByMonth } from './storage.js';
import { syncExpenseToSheet } from './gas-sync.js';
import {
  renderSummary,
  renderCategorySummary,
  renderExpenseList,
  populateCategorySelect,
  updateMonthLabel,
  showConfirmDialog,
  showToast,
} from './ui.js';

/* ---------- State ---------- */
let currentYear;
let currentMonth;

/**
 * 現在表示中の月のデータで画面全体を再描画
 */
function refreshView() {
  const expenses = getExpensesByMonth(currentYear, currentMonth);
  updateMonthLabel(currentYear, currentMonth);
  renderSummary(expenses, currentYear, currentMonth);
  renderCategorySummary(expenses);
  renderExpenseList(expenses, handleDelete);
}

/* ---------- Validation ---------- */

/**
 * フォーム入力値のバリデーション
 * @param {Object} data - {date, category, amount, memo}
 * @returns {{valid: boolean, errors: Object}}
 */
function validateForm(data) {
  const errors = {};

  if (!data.date) {
    errors.date = '日付を入力してください';
  }

  if (!data.category) {
    errors.category = 'カテゴリを選択してください';
  }

  const amount = parseInt(data.amount);
  if (!data.amount || isNaN(amount) || amount < 1) {
    errors.amount = '正しい金額を入力してください（1円以上）';
  }

  if (data.memo && data.memo.length > 100) {
    errors.memo = 'メモは100文字以内で入力してください';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * バリデーションエラーを表示
 * @param {Object} errors - フィールド名をキー、メッセージを値としたオブジェクト
 */
function showValidationErrors(errors) {
  // すべてのエラー表示をクリア
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });

  // エラーがあるフィールドにメッセージを表示
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) {
      errorEl.textContent = message;
    }
  });
}

/**
 * すべてのバリデーションエラーをクリア
 */
function clearValidationErrors() {
  document.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
  });
}

/* ---------- Event Handlers ---------- */

/**
 * フォーム送信ハンドラ
 * @param {Event} e
 */
function handleSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const data = {
    date: form.date.value,
    category: form.category.value,
    amount: form.amount.value,
    memo: form.memo.value.trim(),
  };

  // バリデーション
  const { valid, errors } = validateForm(data);
  if (!valid) {
    showValidationErrors(errors);
    return;
  }

  clearValidationErrors();

  // レコード追加
  const record = addExpense({
    ...data,
    amount: parseInt(data.amount),
  });

  // GAS同期（非同期・失敗しても問題なし）
  syncExpenseToSheet(record);

  // フォームリセット（日付はそのまま）
  const currentDate = form.date.value;
  form.reset();
  form.date.value = currentDate;

  // 登録した月に自動で移動
  const [y, m] = data.date.split('-').map(Number);
  if (y !== currentYear || m !== currentMonth) {
    currentYear = y;
    currentMonth = m;
  }

  // 再描画
  refreshView();
  showToast('支出を登録しました');

  // 金額フィールドにフォーカスを戻す（連続入力しやすく）
  form.amount.focus();
}

/**
 * 削除ハンドラ
 * @param {number} id - 削除するレコードのID
 */
async function handleDelete(id) {
  const confirmed = await showConfirmDialog(
    '支出を削除',
    'この支出レコードを削除しますか？この操作は取り消せません。'
  );

  if (!confirmed) return;

  const success = deleteExpense(id);
  if (success) {
    refreshView();
    showToast('支出を削除しました');
  } else {
    showToast('削除に失敗しました', 'error');
  }
}

/**
 * 月を変更する
 * @param {number} delta - -1（前月）または 1（翌月）
 */
function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 1) {
    currentMonth = 12;
    currentYear -= 1;
  } else if (currentMonth > 12) {
    currentMonth = 1;
    currentYear += 1;
  }
  refreshView();
}

/* ---------- Initialization ---------- */

function init() {
  // 現在の年月をセット
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth() + 1;

  // カテゴリ選択肢をセット
  const categorySelect = document.getElementById('input-category');
  populateCategorySelect(categorySelect);

  // 日付のデフォルト値を今日に
  const dateInput = document.getElementById('input-date');
  dateInput.value = now.toISOString().split('T')[0];

  // フォーム送信
  const form = document.getElementById('expense-form');
  form.addEventListener('submit', handleSubmit);

  // 月ナビゲーション
  document.getElementById('btn-prev-month').addEventListener('click', () => changeMonth(-1));
  document.getElementById('btn-next-month').addEventListener('click', () => changeMonth(1));

  // 入力時にエラーをクリア
  form.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('input', () => {
      const errorEl = document.getElementById(`error-${input.name}`);
      if (errorEl) errorEl.textContent = '';
    });
  });

  // 初回描画
  refreshView();
}

// DOMContentLoaded で初期化
document.addEventListener('DOMContentLoaded', init);
