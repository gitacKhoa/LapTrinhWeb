/* =========================================================
   SHARED UI UTILITIES
   ========================================================= */

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="dot"></span><span class="msg"></span>`;
    document.body.appendChild(toast);
  }
  toast.querySelector('.msg').textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

// Lọc bảng theo input tìm kiếm: gõ tới đâu, ẩn/hiện dòng tới đó
function initTableSearch(inputEl, tableBodyEl) {
  if (!inputEl || !tableBodyEl) return;
  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim().toLowerCase();
    [...tableBodyEl.rows].forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(q) ? '' : 'none';
    });
  });
}

// Đơn giản hoá việc gắn filter <select> để lọc bảng theo thuộc tính data-*
function initFilterSelect(selectEl, tableBodyEl, dataAttr) {
  if (!selectEl || !tableBodyEl) return;
  selectEl.addEventListener('change', () => {
    const v = selectEl.value;
    [...tableBodyEl.rows].forEach(row => {
      row.style.display = (!v || row.dataset[dataAttr] === v) ? '' : 'none';
    });
  });
}

function initTabs(tabsEl, panels) {
  if (!tabsEl) return;
  tabsEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      Object.entries(panels).forEach(([key, el]) => {
        el.style.display = key === target ? '' : 'none';
      });
    });
  });
}