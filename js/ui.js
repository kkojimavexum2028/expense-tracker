/* ============================================
   ui.js - DOM操作・レンダリングモジュール
   ============================================ */

import { CATEGORIES, getCategoryByName, aggregateByCategory } from './categories.js';

/**
 * 金額をフォーマット（¥1,234 形式）
 * @param {number} amount
 * @returns {string}
 */
function formatCurrency(amount) {
  return '¥' + amount.toLocaleString('ja-JP');
}

/**
 * 日付をフォーマット（M/D 形式）
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {string}
 */
function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}

/**
 * サマリーカード（合計・件数・日平均）を更新
 * @param {Array<Object>} expenses - 表示対象の支出レコード
 * @param {number} year - 表示年
 * @param {number} month - 表示月 (1-12)
 */
function renderSummary(expenses, year, month) {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const count = expenses.length;

  // その月の日数を計算
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
  const elapsedDays = isCurrentMonth ? today.getDate() : daysInMonth;
  const average = elapsedDays > 0 ? Math.round(total / elapsedDays) : 0;

  // DOM更新（カウントアップアニメーション付き）
  animateValue(document.getElementById('summary-total'), total, formatCurrency);
  animateValue(document.getElementById('summary-count'), count, v => `${v}件`);
  animateValue(document.getElementById('summary-average'), average, formatCurrency);
}

/**
 * 数値のカウントアップアニメーション
 * @param {HTMLElement} el - 対象の要素
 * @param {number} target - 目標値
 * @param {Function} formatter - フォーマット関数
 */
function animateValue(el, target, formatter) {
  const duration = 500;
  const startTime = performance.now();
  const startValue = parseInt(el.dataset.currentValue || '0') || 0;

  el.dataset.currentValue = target;

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutQuart
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(startValue + (target - startValue) * eased);
    el.textContent = formatter(current);

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/**
 * ドーナツ型円グラフを描画
 * @param {Array<{category: Object, total: number, percentage: number}>} aggregated - 集計データ
 * @param {number} grandTotal - 合計金額
 */
function renderPieChart(aggregated, grandTotal) {
  const canvas = document.getElementById('pie-chart');
  const ctx = canvas.getContext('2d');

  // Retina対応
  const wrapper = canvas.parentElement;
  const size = wrapper.clientWidth;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = size / 2 - 4;
  const innerRadius = outerRadius * 0.62; // ドーナツの穴
  const gap = 0.02; // スライス間のギャップ（ラジアン）

  ctx.clearRect(0, 0, size, size);

  // 中央の合計金額を更新
  document.getElementById('pie-chart-total').textContent = formatCurrency(grandTotal);

  if (aggregated.length === 0) {
    // データなしの場合は空のリングを描画
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fill();
    return;
  }

  // アニメーション
  const duration = 800;
  const startTime = performance.now();

  function drawFrame(currentTime) {
    const elapsed = currentTime - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    // easeOutCubic
    const progress = 1 - Math.pow(1 - rawProgress, 3);

    ctx.clearRect(0, 0, size, size);

    let currentAngle = -Math.PI / 2; // 12時の位置から開始
    const totalAngle = Math.PI * 2 * progress;

    aggregated.forEach(({ category, percentage }) => {
      const sliceAngle = (percentage / 100) * totalAngle;
      if (sliceAngle <= 0) return;

      const startAngle = currentAngle + gap / 2;
      const endAngle = currentAngle + sliceAngle - gap / 2;

      if (endAngle <= startAngle) {
        currentAngle += sliceAngle;
        return;
      }

      // スライス描画
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = category.color;
      ctx.fill();

      // 薄い光沢エフェクト
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, outerRadius - (outerRadius - innerRadius) * 0.35, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.fill();

      currentAngle += sliceAngle;
    });

    if (rawProgress < 1) {
      requestAnimationFrame(drawFrame);
    }
  }

  requestAnimationFrame(drawFrame);
}

/**
 * カテゴリ別集計セクションを描画（円グラフ + リスト）
 * @param {Array<Object>} expenses - 表示対象の支出レコード
 */
function renderCategorySummary(expenses) {
  const container = document.getElementById('category-list');
  const aggregated = aggregateByCategory(expenses);
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  // 円グラフを描画
  renderPieChart(aggregated, grandTotal);

  if (aggregated.length === 0) {
    container.innerHTML = `
      <div class="category-empty">
        まだ支出データがありません
      </div>`;
    return;
  }

  container.innerHTML = aggregated.map(({ category, total, percentage }) => `
    <div class="category-item">
      <div class="category-item__icon">${category.icon}</div>
      <div class="category-item__info">
        <div class="category-item__name">${category.name}</div>
        <div class="category-item__bar-track">
          <div class="category-item__bar-fill" style="width: ${percentage}%; background: ${category.color};"></div>
        </div>
      </div>
      <div class="category-item__amount">${formatCurrency(total)}<span class="category-item__percent"> (${percentage.toFixed(1)}%)</span></div>
    </div>
  `).join('');

  // バーアニメーション（遅延付きで順番にアニメーション）
  requestAnimationFrame(() => {
    const bars = container.querySelectorAll('.category-item__bar-fill');
    bars.forEach((bar, i) => {
      const targetWidth = bar.style.width;
      bar.style.width = '0%';
      bar.style.transition = 'none';
      setTimeout(() => {
        bar.style.transition = `width 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${i * 80}ms`;
        bar.style.width = targetWidth;
      }, 50);
    });
  });
}

/**
 * 支出一覧を描画
 * @param {Array<Object>} expenses - 表示対象の支出レコード
 * @param {Function} onDelete - 削除ボタンクリック時のコールバック (id) => void
 */
function renderExpenseList(expenses, onDelete) {
  const container = document.getElementById('expense-list');

  if (expenses.length === 0) {
    container.innerHTML = `
      <div class="expense-empty">
        <div class="expense-empty__icon">📝</div>
        <div class="expense-empty__text">この月の支出はまだありません<br>上のフォームから追加しましょう</div>
      </div>`;
    return;
  }

  container.innerHTML = expenses.map((exp, index) => {
    const cat = getCategoryByName(exp.category);
    const memo = exp.memo || exp.category;
    return `
      <div class="expense-item" style="animation-delay: ${index * 40}ms" data-id="${exp.id}">
        <div class="expense-item__icon">${cat.icon}</div>
        <div class="expense-item__info">
          <div class="expense-item__memo">${escapeHtml(memo)}</div>
          <div class="expense-item__meta">${formatDateShort(exp.date)} ・ ${cat.name}</div>
        </div>
        <div class="expense-item__amount">${formatCurrency(exp.amount)}</div>
        <button class="expense-item__delete" data-id="${exp.id}" title="削除" aria-label="${memo}を削除">🗑️</button>
      </div>`;
  }).join('');

  // 削除ボタンのイベントリスナーを登録
  container.querySelectorAll('.expense-item__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      onDelete(id);
    });
  });
}

/**
 * カテゴリ選択肢をselect要素に追加
 * @param {HTMLSelectElement} selectEl - select要素
 */
function populateCategorySelect(selectEl) {
  selectEl.innerHTML = CATEGORIES.map(c =>
    `<option value="${c.name}">${c.icon} ${c.name}</option>`
  ).join('');
}

/**
 * 月ナビゲーションのラベルを更新
 * @param {number} year
 * @param {number} month
 */
function updateMonthLabel(year, month) {
  const label = document.getElementById('month-label');
  label.textContent = `${year}年${month}月`;
}

/**
 * 確認ダイアログを表示
 * @param {string} title - タイトル
 * @param {string} message - メッセージ
 * @returns {Promise<boolean>} ユーザーが確認したらtrue
 */
function showConfirmDialog(title, message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog__title">${escapeHtml(title)}</div>
        <div class="dialog__message">${escapeHtml(message)}</div>
        <div class="dialog__actions">
          <button class="dialog__btn" id="dialog-cancel">キャンセル</button>
          <button class="dialog__btn dialog__btn--danger" id="dialog-confirm">削除する</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);

    const cleanup = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#dialog-cancel').addEventListener('click', () => cleanup(false));
    overlay.querySelector('#dialog-confirm').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * トースト通知を表示
 * @param {string} message - メッセージ
 * @param {'success'|'error'} type - 通知タイプ
 */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  const icon = type === 'success' ? '✅' : '❌';
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast--removing');
    toast.addEventListener('animationend', () => toast.remove());
  }, 2500);
}

/**
 * HTMLエスケープ
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export {
  renderSummary,
  renderCategorySummary,
  renderExpenseList,
  populateCategorySelect,
  updateMonthLabel,
  showConfirmDialog,
  showToast,
  formatCurrency,
};
