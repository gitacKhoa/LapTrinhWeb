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

function getCurrentUser() {
  try {
    const raw = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveCurrentUser(user) {
  if (!user) return;
  const userData = JSON.stringify(user);
  localStorage.setItem('currentUser', userData);
  sessionStorage.setItem('currentUser', userData);
}

function clearAuthState() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('currentUser');
}

// Lọc bảng theo input tìm kiếm: gõ tới đâu, ẩn/hiện dòng tới đó
function initTableSearch(inputEl, tableBodyEl) {
  if (!inputEl || !tableBodyEl) return;
  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim().toLowerCase();
    [...tableBodyEl.rows].forEach((row) => {
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
    [...tableBodyEl.rows].forEach((row) => {
      row.style.display = !v || row.dataset[dataAttr] === v ? '' : 'none';
    });
  });
}

function initTabs(tabsEl, panels) {
  if (!tabsEl) return;
  tabsEl.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      Object.entries(panels).forEach(([key, el]) => {
        el.style.display = key === target ? '' : 'none';
      });
    });
  });
}

const API_BASE = '/api';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (response.status === 401 && !location.pathname.endsWith('login.html')) {
    clearAuthState();
    location.href = 'login.html';
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Không thể kết nối máy chủ');
  }
  return response.status === 204 ? null : response.json();
}

const apiGet = (endpoint) => apiRequest(endpoint);
const apiSave = (endpoint, data, method = 'POST') =>
  apiRequest(endpoint, { method, body: JSON.stringify(data) });

function openDataForm(title, fields) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'data-form-overlay';
    overlay.innerHTML = `<form class="data-form panel"><div class="panel-header"><h2>${title}</h2><button type="button" class="btn btn-ghost close-form">Đóng</button></div><div class="data-form-fields">${fields.map((field) => `<label class="field"><span>${field.label}</span><input name="${field.name}" type="${field.type || 'text'}" value="${field.value ?? ''}" ${field.required === false ? '' : 'required'} ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}></label>`).join('')}</div><div class="panel-actions"><button type="button" class="btn btn-secondary close-form">Hủy</button><button class="btn btn-primary" type="submit">Lưu dữ liệu</button></div></form>`;
    document.body.appendChild(overlay);
    const close = () => {
      overlay.remove();
      resolve(null);
    };
    overlay
      .querySelectorAll('.close-form')
      .forEach((button) => button.addEventListener('click', close));
    overlay.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      overlay.remove();
      resolve(data);
    });
  });
}

document.querySelectorAll('.sidebar-logout').forEach((link) =>
  link.addEventListener('click', () => {
    clearAuthState();
  })
);

async function hydrateSystemReport() {
  if (!location.pathname.endsWith('system-reports.html')) return;
  const data = await apiGet('/dashboard');
  const values = document.querySelectorAll('.stat-row .stat-value');
  [data.stats.students, data.stats.lecturers, data.stats.courses, data.stats.unpublished].forEach(
    (value, index) => {
      if (values[index]) values[index].textContent = value;
    }
  );
}

hydrateSystemReport().catch((error) => showToast(error.message));
