/* ===================================================================
   TALLY — a personal budgeting companion
   Single-user, localStorage only, no backend.
   =================================================================== */

(() => {
'use strict';

/* ---------- icons ----------- */
const ICON = {
  home:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5h14V10"/></svg>',
  food:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3v8a4 4 0 0 0 8 0V3"/><path d="M8 3v18"/><path d="M16 3c2 0 4 2 4 5s-2 5-4 5v8"/></svg>',
  transport:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="7" rx="2"/><path d="M5 11l2-5h10l2 5"/><circle cx="7.5" cy="18" r="1.2"/><circle cx="16.5" cy="18" r="1.2"/></svg>',
  savings:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a6 6 0 0 1 12 0v3a3 3 0 0 0 3 3v-9"/><path d="M4 12v3a3 3 0 0 0 3 3h9"/><circle cx="13" cy="11" r="0.8" fill="currentColor"/></svg>',
  entertainment:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.2 5.4L20 9l-4.2 3.6L17 18l-5-3-5 3 1.2-5.4L4 9l5.8-0.6z"/></svg>',
  emergency:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
  personal:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"/></svg>',
  health:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.7-7 10-7 10z"/></svg>',
  bills:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h10l3 3v15l-2-1.2L15 21l-2-1.2L11 21l-2-1.2L7 21l-1-1.2V3z"/><path d="M9 8h7M9 12h7M9 16h4"/></svg>',
  dot:         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
  edit:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l5 5L9 20H4v-5z"/></svg>',
  trash:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  plus:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  close:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  clock:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
};

/* ---------- defaults ----------- */
const DEFAULT_CATEGORIES = [
  { id: 'housing',       name: 'Housing',         icon: 'home',          allocated: 0, essential: true,  tone: 'default' },
  { id: 'food',          name: 'Food & groceries',icon: 'food',          allocated: 0, essential: true,  tone: 'default' },
  { id: 'transport',     name: 'Transport',       icon: 'transport',     allocated: 0, essential: true,  tone: 'default' },
  { id: 'bills',         name: 'Bills & utilities',icon: 'bills',        allocated: 0, essential: true,  tone: 'default' },
  { id: 'savings',       name: 'Savings',         icon: 'savings',       allocated: 0, essential: false, tone: 'default' },
  { id: 'emergency',     name: 'Emergency fund',  icon: 'emergency',     allocated: 0, essential: false, tone: 'default' },
  { id: 'entertainment', name: 'Entertainment',   icon: 'entertainment', allocated: 0, essential: false, tone: 'warn' },
  { id: 'personal',      name: 'Personal',        icon: 'personal',      allocated: 0, essential: false, tone: 'default' }
];

const DEFAULT_STATE = {
  version: 1,
  income: 0,
  currency: '$',
  categories: DEFAULT_CATEGORIES.slice(),
  expenses: [],
  wishlist: [],
  settings: {
    theme: 'dark',
    reflectionEnabled: true,
    streakEnabled: true
  },
  streak: { count: 0, lastCheckedDate: null }
};

const NON_ESSENTIAL_FALLBACK = ['entertainment', 'personal'];
const MOODS = ['neutral', 'needed', 'bored', 'stressed', 'social', 'reward'];

/* ---------- state + persistence ----------- */
const STORAGE_KEY = 'tally:state:v1';
let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    // merge missing keys from defaults (forward compatibility)
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      streak: { ...DEFAULT_STATE.streak, ...(parsed.streak || {}) }
    };
  } catch (e) {
    console.warn('Could not load saved data, starting fresh.', e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Could not save state.', e); }
}

/* ---------- utility: ids, dates, money ----------- */
function uid() { return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

function todayISO() { return new Date().toISOString().slice(0, 10); }

function monthKey(date) {
  const d = date ? new Date(date) : new Date();
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function daysLeftInMonth() {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, last.getDate() - now.getDate() + 1);
}

function dayOfMonth() { return new Date().getDate(); }

function daysInCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function fmtMoney(n, opts = {}) {
  const cur = state.currency || '$';
  const abs = Math.abs(n);
  const fixed = abs < 100 && abs > 0 ? abs.toFixed(2) : Math.round(abs).toLocaleString();
  return (n < 0 ? '-' : '') + cur + fixed;
}

function fmtMoneyHero(n) {
  const cur = state.currency || '$';
  const safe = Math.max(0, n);
  const whole = Math.floor(safe);
  const decimals = Math.round((safe - whole) * 100).toString().padStart(2, '0');
  return `<span class="currency">${cur}</span>${whole.toLocaleString()}<span class="decimal">.${decimals}</span>`;
}

function fmtRelativeDate(iso) {
  const now = new Date();
  const d = new Date(iso);
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return diffMin + 'm ago';
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return diffHr + 'h ago';
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return diffDay + 'd ago';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ---------- computed ----------- */
function getCategory(id) { return state.categories.find(c => c.id === id); }

function expensesThisMonth() {
  const mk = monthKey();
  return state.expenses.filter(e => monthKey(e.date) === mk);
}

function categorySpent(catId) {
  return expensesThisMonth()
    .filter(e => e.categoryId === catId)
    .reduce((a, e) => a + e.amount, 0);
}

function totalSpent() {
  return expensesThisMonth().reduce((a, e) => a + e.amount, 0);
}

function totalAllocated() {
  return state.categories.reduce((a, c) => a + (Number(c.allocated) || 0), 0);
}

function unallocated() {
  return Math.max(0, state.income - totalAllocated());
}

function safeToSpendToday() {
  const remaining = state.income - totalSpent();
  const days = daysLeftInMonth();
  return remaining / days;
}

function paceStatus() {
  // are we on pace vs budget?
  if (state.income <= 0) return 'neutral';
  const day = dayOfMonth();
  const total = daysInCurrentMonth();
  const expectedFraction = day / total;
  const spentFraction = totalSpent() / state.income;
  if (spentFraction > expectedFraction + 0.08) return 'tight';
  if (spentFraction > 1) return 'over';
  return 'on-track';
}

/* ---------- greeting + streak ----------- */
function refreshHeader() {
  const hour = new Date().getHours();
  let greet = 'Good evening';
  if (hour < 12) greet = 'Good morning';
  else if (hour < 18) greet = 'Good afternoon';
  document.getElementById('greeting-line').textContent = greet;
  const day = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('greeting-sub').textContent = `${day} · day ${dayOfMonth()} of ${daysInCurrentMonth()}`;
  document.getElementById('streak-count').textContent = state.streak.count || 0;
  document.getElementById('streak-pill').style.opacity = state.settings.streakEnabled ? '1' : '0.4';
}

function checkStreak() {
  if (!state.settings.streakEnabled) return;
  const today = todayISO();
  if (state.streak.lastCheckedDate === today) return;

  // Streak logic: if yesterday's spending was within pace, increment.
  // Simple rule: spent so far this month <= (day-1)/total * income
  const day = dayOfMonth();
  const total = daysInCurrentMonth();
  const pace = state.income > 0 ? (day - 1) / total : 0;
  const spentFraction = state.income > 0 ? totalSpent() / state.income : 0;

  // increment if yesterday was new and we're still under pace
  if (spentFraction <= pace + 0.05) {
    state.streak.count = (state.streak.count || 0) + 1;
  } else {
    state.streak.count = 0;
  }
  state.streak.lastCheckedDate = today;
  saveState();
}

/* ---------- navigation ----------- */
const VIEWS = ['home', 'budget', 'wishlist', 'insights', 'settings'];
let currentView = 'home';

function setView(name) {
  if (!VIEWS.includes(name)) return;
  currentView = name;
  document.getElementById('app').dataset.view = name;
  VIEWS.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (!el) return;
    if (v === name) el.hidden = false;
    else el.hidden = true;
  });
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('is-active', b.dataset.view === name);
  });
  render();
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function render() {
  refreshHeader();
  if (currentView === 'home')      renderHome();
  if (currentView === 'budget')    renderBudget();
  if (currentView === 'wishlist')  renderWishlist();
  if (currentView === 'insights')  renderInsights();
  if (currentView === 'settings')  renderSettings();
}

/* ---------- view: HOME ----------- */
function renderHome() {
  const el = document.getElementById('view-home');
  const safe = safeToSpendToday();
  const pace = paceStatus();
  const paceLabel =
    pace === 'over'      ? 'Past your monthly budget' :
    pace === 'tight'     ? 'Spending faster than pace' :
    pace === 'neutral'   ? 'Add your monthly income to begin' :
                           'On pace with the month';
  const paceClass =
    pace === 'over'      ? 'over' :
    pace === 'tight'     ? 'tight' : '';

  const recent = state.expenses
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  el.innerHTML = `
    <div class="card safe-hero">
      <div class="safe-label">Safe to spend today</div>
      <div class="safe-amount">${fmtMoneyHero(safe)}</div>
      <div class="safe-sub ${paceClass}">
        <span class="dot"></span>
        <span>${paceLabel} · ${daysLeftInMonth()} days left</span>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-label">Income</div>
        <div class="stat-value">${fmtMoney(state.income)}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Spent</div>
        <div class="stat-value ${totalSpent() > state.income ? 'danger' : ''}">${fmtMoney(totalSpent())}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Left</div>
        <div class="stat-value">${fmtMoney(Math.max(0, state.income - totalSpent()))}</div>
      </div>
    </div>

    <div class="section-head">
      <div class="section-title">Categories</div>
      <button class="section-action" data-action="go-budget">Adjust</button>
    </div>
    ${state.categories.length === 0
      ? renderEmpty('No categories yet', 'Head to Budget to add some.')
      : `<div class="cat-list">${state.categories.map(renderCategoryRow).join('')}</div>`
    }

    <div class="section-head">
      <div class="section-title">Recent activity</div>
      ${recent.length ? '<button class="section-action" data-action="go-insights">Insights</button>' : ''}
    </div>
    ${recent.length === 0
      ? renderEmpty('Quiet so far', 'Tap the + below to log your first expense.')
      : `<div class="card activity">${recent.map(renderActivityRow).join('')}</div>`
    }
  `;

  el.querySelector('[data-action="go-budget"]')?.addEventListener('click', () => setView('budget'));
  el.querySelector('[data-action="go-insights"]')?.addEventListener('click', () => setView('insights'));
}

function renderCategoryRow(cat) {
  const spent = categorySpent(cat.id);
  const allocated = Number(cat.allocated) || 0;
  const pct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0;
  const overage = allocated > 0 && spent > allocated;
  const tight = allocated > 0 && spent / allocated > 0.85;
  const barClass = overage ? 'danger' : tight ? 'warn' : '';
  const iconTone = overage ? 'danger' : (cat.tone === 'warn' ? 'warn' : '');
  return `
    <div class="cat-row" data-cat="${cat.id}">
      <div class="cat-row-top">
        <div class="cat-icon ${iconTone}">${ICON[cat.icon] || ICON.dot}</div>
        <div class="cat-meta">
          <div class="cat-name">${escapeHtml(cat.name)}</div>
          <div class="cat-sub">${cat.essential ? 'Essential' : 'Discretionary'}${allocated ? ' · ' + Math.round(pct) + '% used' : ' · no budget set'}</div>
        </div>
        <div class="cat-amounts">
          <div class="spent">${fmtMoney(spent)}</div>
          <div class="of">of ${fmtMoney(allocated)}</div>
        </div>
      </div>
      <div class="cat-progress"><div class="cat-progress-bar ${barClass}" style="width:${pct}%"></div></div>
    </div>
  `;
}

function renderActivityRow(exp) {
  const cat = getCategory(exp.categoryId);
  return `
    <div class="activity-row">
      <div class="activity-dot">${cat ? (ICON[cat.icon] || ICON.dot) : ICON.dot}</div>
      <div class="activity-meta">
        <div class="activity-cat">${escapeHtml(cat ? cat.name : 'Uncategorised')}</div>
        <div class="activity-note">${exp.note ? escapeHtml(exp.note) + ' · ' : ''}${fmtRelativeDate(exp.date)}</div>
      </div>
      <div class="activity-amount">${fmtMoney(exp.amount)}</div>
    </div>
  `;
}

function renderEmpty(title, sub) {
  return `<div class="card empty"><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
}

/* ---------- view: BUDGET ----------- */
function renderBudget() {
  const el = document.getElementById('view-budget');
  const unalloc = unallocated();
  const ualClass = unalloc < 0 ? 'danger' : '';
  el.innerHTML = `
    <div class="card">
      <div class="section-head" style="margin: 0 0 12px;">
        <div class="section-title">Monthly income</div>
      </div>
      <input type="number" inputmode="decimal" class="input input-amount" id="income-input"
             value="${state.income || ''}" placeholder="0" min="0" step="0.01" />
      <div class="spacer-sm"></div>
      <div class="muted tiny">Every dollar should have a job. Below: assign your income to categories.</div>
    </div>

    <div class="stat-row">
      <div class="stat">
        <div class="stat-label">Allocated</div>
        <div class="stat-value">${fmtMoney(totalAllocated())}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Unassigned</div>
        <div class="stat-value ${ualClass}">${fmtMoney(state.income - totalAllocated())}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Income</div>
        <div class="stat-value">${fmtMoney(state.income)}</div>
      </div>
    </div>

    <div class="section-head">
      <div class="section-title">Categories</div>
      <button class="section-action" data-action="add-cat">+ Add</button>
    </div>

    <div class="cat-list">
      ${state.categories.map(c => `
        <div class="cat-row" data-edit-cat="${c.id}">
          <div class="cat-row-top">
            <div class="cat-icon ${c.tone === 'warn' ? 'warn' : ''}">${ICON[c.icon] || ICON.dot}</div>
            <div class="cat-meta">
              <div class="cat-name">${escapeHtml(c.name)}</div>
              <div class="cat-sub">${c.essential ? 'Essential' : 'Discretionary'}</div>
            </div>
            <div class="cat-amounts">
              <div class="spent">${fmtMoney(Number(c.allocated) || 0)}</div>
              <div class="of">${fmtMoney(categorySpent(c.id))} spent</div>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const incomeInput = el.querySelector('#income-input');
  incomeInput.addEventListener('input', e => {
    state.income = Math.max(0, parseFloat(e.target.value) || 0);
    saveState();
    renderBudget();
    // Re-query the newly-rendered input and restore focus + caret.
    const fresh = document.querySelector('#income-input');
    if (fresh) {
      fresh.focus();
      const len = fresh.value.length;
      try { fresh.setSelectionRange(len, len); } catch (_) {}
    }
  });

  el.querySelector('[data-action="add-cat"]').addEventListener('click', openAddCategory);
  el.querySelectorAll('[data-edit-cat]').forEach(row => {
    row.addEventListener('click', () => openEditCategory(row.dataset.editCat));
  });
}

/* ---------- view: WISHLIST ----------- */
function renderWishlist() {
  const el = document.getElementById('view-wishlist');
  const sorted = state.wishlist.slice().sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

  el.innerHTML = `
    <div class="section-head" style="margin-top: 6px;">
      <div class="section-title">Wishlist</div>
      <button class="section-action" data-action="add-wish">+ Add</button>
    </div>
    <div class="muted tiny" style="margin: 0 4px 14px;">A place to park wants. Sit with them for 24 hours before deciding.</div>

    ${sorted.length === 0
      ? renderEmpty('Nothing waiting', 'Add an item you’re tempted by. Future you decides.')
      : sorted.map(renderWishItem).join('')
    }
  `;

  el.querySelector('[data-action="add-wish"]').addEventListener('click', openAddWishlist);
  el.querySelectorAll('[data-wish-approve]').forEach(b => b.addEventListener('click', () => approveWish(b.dataset.wishApprove)));
  el.querySelectorAll('[data-wish-remove]').forEach(b => b.addEventListener('click', () => removeWish(b.dataset.wishRemove)));
}

function renderWishItem(w) {
  const hours = (Date.now() - new Date(w.savedAt).getTime()) / 36e5;
  const ready = hours >= 24;
  const status = ready
    ? `<span class="wish-status ready">Ready to decide · waited ${Math.floor(hours)}h</span>`
    : `<span class="wish-status">Waiting · ${Math.max(0, Math.ceil(24 - hours))}h to go</span>`;
  return `
    <div class="wish-card">
      <div class="wish-top">
        <div class="wish-name">${escapeHtml(w.name)}</div>
        <div class="wish-amount">${fmtMoney(w.amount)}</div>
      </div>
      ${w.why ? `<div class="wish-why">${escapeHtml(w.why)}</div>` : ''}
      ${status}
      <div class="wish-actions">
        <button class="btn btn-primary" data-wish-approve="${w.id}">Buy it</button>
        <button class="btn btn-ghost" data-wish-remove="${w.id}">Let go</button>
      </div>
    </div>
  `;
}

/* ---------- view: INSIGHTS ----------- */
function renderInsights() {
  const el = document.getElementById('view-insights');
  const expenses = expensesThisMonth();
  const total = totalSpent();

  // build daily series
  const days = daysInCurrentMonth();
  const today = dayOfMonth();
  const series = Array(days).fill(0);
  expenses.forEach(e => {
    const day = new Date(e.date).getDate();
    series[day - 1] += e.amount;
  });

  // category breakdown
  const breakdown = state.categories
    .map(c => ({ ...c, spent: categorySpent(c.id) }))
    .filter(c => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  // top day-of-week / time-of-day pattern
  const dowSpend = [0,0,0,0,0,0,0];
  expenses.forEach(e => { dowSpend[new Date(e.date).getDay()] += e.amount; });
  const dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const peakIdx = dowSpend.indexOf(Math.max(...dowSpend));

  // mood breakdown
  const moodCounts = {};
  expenses.forEach(e => { if (e.mood) moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1; });
  const moodEntries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);

  el.innerHTML = `
    <div class="card">
      <div class="safe-label">This month so far</div>
      <div style="font-family:var(--font-display); font-size:46px; font-weight:300; letter-spacing:-0.03em; margin-top:6px;">${fmtMoney(total)}</div>
      <div class="muted tiny" style="margin-top:6px;">across ${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'}</div>
      ${renderSpark(series, today)}
    </div>

    <div class="section-head"><div class="section-title">Where it went</div></div>
    ${breakdown.length === 0
      ? renderEmpty('No spending yet', 'Once you log expenses, breakdowns appear here.')
      : `<div class="card"><div class="bar-list">${breakdown.map(c => `
          <div class="bar-row">
            <div class="bar-row-head">
              <span class="name">${escapeHtml(c.name)}</span>
              <span class="val">${fmtMoney(c.spent)} · ${total ? Math.round(c.spent / total * 100) : 0}%</span>
            </div>
            <div class="bar-track"><div class="bar-fill" style="width:${total ? (c.spent / total * 100) : 0}%"></div></div>
          </div>
        `).join('')}</div></div>`
    }

    ${expenses.length >= 3 ? `
      <div class="section-head"><div class="section-title">Patterns</div></div>
      <div class="card">
        <div class="toggle-row" style="border:none; padding: 8px 0;">
          <div class="label-block">
            <div class="label-title">Biggest spending day</div>
            <div class="label-sub">When wallets open most often</div>
          </div>
          <div style="font-family:var(--font-display); font-size:18px;">${dowNames[peakIdx]}</div>
        </div>
        ${moodEntries.length ? `
          <div style="border-top:1px solid var(--border); padding-top: 14px; margin-top: 6px;">
            <div class="muted tiny" style="margin-bottom: 8px;">Most common moods when spending</div>
            <div class="mood-row">
              ${moodEntries.slice(0, 4).map(([m, n]) => `<div class="mood is-selected">${escapeHtml(m)} · ${n}</div>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    ` : ''}
  `;
}

function renderSpark(series, today) {
  const w = 480, h = 100, pad = 6;
  const max = Math.max(1, ...series);
  const stepX = (w - pad * 2) / Math.max(1, series.length - 1);
  const pts = series.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return [x, y];
  });
  const lineD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const areaD = `${lineD} L ${pts[pts.length-1][0].toFixed(1)} ${h-pad} L ${pad} ${h-pad} Z`;
  const todayX = pad + (today - 1) * stepX;
  return `
    <svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <path class="area" d="${areaD}"/>
      <path class="line" d="${lineD}"/>
      <line class="axis" x1="${todayX}" y1="${pad}" x2="${todayX}" y2="${h-pad}" stroke-dasharray="2 3"/>
    </svg>
  `;
}

/* ---------- view: SETTINGS ----------- */
function renderSettings() {
  const el = document.getElementById('view-settings');
  el.innerHTML = `
    <div class="section-head" style="margin-top:6px;"><div class="section-title">Preferences</div></div>
    <div class="settings-group">
      <div class="toggle-row">
        <div class="label-block">
          <div class="label-title">Pause-before-purchase prompt</div>
          <div class="label-sub">Show a gentle reflection when logging discretionary expenses.</div>
        </div>
        <button class="toggle ${state.settings.reflectionEnabled ? 'on' : ''}" data-toggle="reflectionEnabled" aria-label="Toggle reflection"></button>
      </div>
      <div class="toggle-row">
        <div class="label-block">
          <div class="label-title">Budget streak</div>
          <div class="label-sub">Count days where you stayed on pace.</div>
        </div>
        <button class="toggle ${state.settings.streakEnabled ? 'on' : ''}" data-toggle="streakEnabled" aria-label="Toggle streak"></button>
      </div>
      <div class="toggle-row">
        <div class="label-block">
          <div class="label-title">Light theme</div>
          <div class="label-sub">Switch to a warm, paper-like background.</div>
        </div>
        <button class="toggle ${state.settings.theme === 'light' ? 'on' : ''}" data-theme-toggle aria-label="Toggle theme"></button>
      </div>
    </div>

    <div class="section-head"><div class="section-title">Currency</div></div>
    <div class="card card-tight">
      <input class="input" id="currency-input" value="${escapeHtml(state.currency)}" maxlength="3" />
      <div class="muted tiny" style="margin-top:8px;">Any short symbol works: $, €, £, ¥, RWF, etc.</div>
    </div>

    <div class="section-head"><div class="section-title">Your data</div></div>
    <div class="card card-tight">
      <div class="btn-row">
        <button class="btn" data-action="export">Export backup</button>
        <button class="btn" data-action="import">Import backup</button>
      </div>
      <div class="spacer-md"></div>
      <button class="btn btn-danger" data-action="reset">Reset everything</button>
      <div class="muted tiny" style="margin-top:10px;">Data is stored locally on this device. Nothing is sent anywhere.</div>
    </div>

    <div class="muted tiny center" style="margin: 26px 0 10px;">Tally · v1 · offline · single-user</div>
  `;

  el.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      state.settings[key] = !state.settings[key];
      saveState();
      renderSettings();
      refreshHeader();
    });
  });

  el.querySelector('[data-theme-toggle]').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
    renderSettings();
  });

  el.querySelector('#currency-input').addEventListener('input', e => {
    state.currency = e.target.value.trim() || '$';
    saveState();
  });

  el.querySelector('[data-action="export"]').addEventListener('click', exportData);
  el.querySelector('[data-action="import"]').addEventListener('click', () => document.getElementById('import-file').click());
  el.querySelector('[data-action="reset"]').addEventListener('click', confirmReset);
}

/* ---------- theme ----------- */
function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme || 'dark';
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', state.settings.theme === 'light' ? '#F7F5EF' : '#0F0F11');
}

/* ===================================================================
   MODALS
   =================================================================== */

const modalRoot = document.getElementById('modal-root');

function openModal(html, onClose) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-close></div>
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-handle"></div>
      ${html}
    </div>
  `;
  modalRoot.classList.add('is-open');
  modalRoot.setAttribute('aria-hidden', 'false');
  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal(onClose));
}

function closeModal(cb) {
  modalRoot.classList.remove('is-open');
  modalRoot.setAttribute('aria-hidden', 'true');
  modalRoot.innerHTML = '';
  if (typeof cb === 'function') cb();
}

/* ----- add expense modal ----- */
function openAddExpense(prefill = {}) {
  const cats = state.categories;
  if (cats.length === 0) {
    openModal(`
      <h2 class="modal-title">Add a category first</h2>
      <p class="modal-sub">You need at least one budget category to log expenses.</p>
      <button class="btn btn-primary" data-go-budget>Go to Budget</button>
    `);
    modalRoot.querySelector('[data-go-budget]').addEventListener('click', () => { closeModal(); setView('budget'); });
    return;
  }

  let selectedCat = prefill.categoryId || cats[0].id;
  let selectedMood = prefill.mood || '';
  let amount = prefill.amount || '';
  let note = prefill.note || '';
  let date = prefill.date || todayISO();

  openModal(`
    <h2 class="modal-title">Add expense</h2>
    <p class="modal-sub">Quick log. Pause to reflect if it's not essential.</p>

    <div class="field">
      <label>Amount</label>
      <input type="number" inputmode="decimal" class="input input-amount" id="exp-amount" value="${amount}" placeholder="0.00" autofocus />
    </div>

    <div class="field">
      <label>Category</label>
      <div class="pill-row" id="exp-cats">
        ${cats.map(c => `
          <button type="button" class="pill ${c.id === selectedCat ? 'is-selected' : ''}" data-cat="${c.id}">
            ${ICON[c.icon] || ''} <span>${escapeHtml(c.name)}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="field">
      <label>Note (optional)</label>
      <input class="input" id="exp-note" value="${escapeHtml(note)}" placeholder="What was it for?" />
    </div>

    <div class="field">
      <label>How did you feel?</label>
      <div class="mood-row" id="exp-moods">
        ${MOODS.map(m => `<button type="button" class="mood ${m === selectedMood ? 'is-selected' : ''}" data-mood="${m}">${m}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label>Date</label>
      <input type="date" class="input" id="exp-date" value="${date}" />
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="exp-save">Save expense</button>
    </div>
  `);

  const m = modalRoot;
  m.querySelector('[data-close]').addEventListener('click', () => closeModal());
  m.querySelectorAll('#exp-cats .pill').forEach(p => {
    p.addEventListener('click', () => {
      selectedCat = p.dataset.cat;
      m.querySelectorAll('#exp-cats .pill').forEach(x => x.classList.toggle('is-selected', x.dataset.cat === selectedCat));
    });
  });
  m.querySelectorAll('#exp-moods .mood').forEach(p => {
    p.addEventListener('click', () => {
      selectedMood = selectedMood === p.dataset.mood ? '' : p.dataset.mood;
      m.querySelectorAll('#exp-moods .mood').forEach(x => x.classList.toggle('is-selected', x.dataset.mood === selectedMood));
    });
  });

  m.querySelector('#exp-save').addEventListener('click', () => {
    const amt = parseFloat(m.querySelector('#exp-amount').value);
    if (!amt || amt <= 0) { m.querySelector('#exp-amount').focus(); return; }
    const cat = getCategory(selectedCat);
    const data = {
      amount: amt,
      categoryId: selectedCat,
      note: m.querySelector('#exp-note').value.trim(),
      date: m.querySelector('#exp-date').value || todayISO(),
      mood: selectedMood,
      _fromWishId: prefill._fromWishId
    };
    if (state.settings.reflectionEnabled && cat && !cat.essential) {
      openReflection(data);
    } else {
      commitExpense(data);
    }
  });
}

function commitExpense(data) {
  const fromWishId = data._fromWishId;
  const exp = { id: uid(), ...data };
  delete exp._fromWishId;
  state.expenses.push(exp);
  if (fromWishId) {
    state.wishlist = state.wishlist.filter(x => x.id !== fromWishId);
  }
  saveState();
  closeModal();
  render();
}

/* ----- reflection prompt ----- */
function openReflection(data) {
  const cat = getCategory(data.categoryId);
  const questions = [
    'Will you appreciate this in seven days?',
    'Is this a need, or a feeling?',
    'What goal does this trade off against?',
    'Future you — would they thank you?'
  ];
  const q = questions[Math.floor(Math.random() * questions.length)];

  openModal(`
    <div class="reflection">
      <div class="item-preview">${fmtMoney(data.amount)} · ${escapeHtml(cat?.name || '')}${data.note ? ' · ' + escapeHtml(data.note) : ''}</div>
      <div class="question">${q}</div>
      <div class="btn-row">
        <button class="btn btn-ghost" data-action="wish">Save to wishlist</button>
        <button class="btn btn-primary" data-action="confirm">Yes, log it</button>
      </div>
      <div class="spacer-sm"></div>
      <button class="btn btn-ghost" data-close>Cancel</button>
    </div>
  `);

  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal());
  modalRoot.querySelector('[data-action="confirm"]').addEventListener('click', () => commitExpense(data));
  modalRoot.querySelector('[data-action="wish"]').addEventListener('click', () => {
    state.wishlist.push({
      id: uid(),
      name: data.note || (cat ? cat.name + ' item' : 'Wishlist item'),
      amount: data.amount,
      why: '',
      savedAt: new Date().toISOString()
    });
    saveState();
    closeModal();
    setView('wishlist');
  });
}

/* ----- category modals ----- */
function openAddCategory() {
  let icon = 'personal';
  let tone = 'default';
  let essential = false;
  openModal(`
    <h2 class="modal-title">New category</h2>
    <p class="modal-sub">Name it, pick an icon, give it a job.</p>

    <div class="field">
      <label>Name</label>
      <input class="input" id="cat-name" placeholder="e.g. Coffee, Gym, Books" autofocus />
    </div>

    <div class="field">
      <label>Allocated amount</label>
      <input type="number" inputmode="decimal" class="input" id="cat-alloc" placeholder="0.00" />
    </div>

    <div class="field">
      <label>Icon</label>
      <div class="pill-row" id="cat-icons">
        ${['personal','food','transport','savings','entertainment','emergency','health','bills','home']
          .map(i => `<button type="button" class="pill ${i === icon ? 'is-selected' : ''}" data-icon="${i}">${ICON[i]}</button>`).join('')}
      </div>
    </div>

    <div class="field">
      <label>Type</label>
      <div class="pill-row" id="cat-types">
        <button type="button" class="pill" data-essential="true">Essential</button>
        <button type="button" class="pill is-selected" data-essential="false">Discretionary</button>
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="cat-save">Add category</button>
    </div>
  `);

  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal());
  modalRoot.querySelectorAll('#cat-icons .pill').forEach(p => p.addEventListener('click', () => {
    icon = p.dataset.icon;
    modalRoot.querySelectorAll('#cat-icons .pill').forEach(x => x.classList.toggle('is-selected', x.dataset.icon === icon));
  }));
  modalRoot.querySelectorAll('#cat-types .pill').forEach(p => p.addEventListener('click', () => {
    essential = p.dataset.essential === 'true';
    modalRoot.querySelectorAll('#cat-types .pill').forEach(x => x.classList.toggle('is-selected', x.dataset.essential === String(essential)));
  }));

  modalRoot.querySelector('#cat-save').addEventListener('click', () => {
    const name = modalRoot.querySelector('#cat-name').value.trim();
    if (!name) return;
    const alloc = parseFloat(modalRoot.querySelector('#cat-alloc').value) || 0;
    state.categories.push({
      id: uid(),
      name, icon, allocated: alloc, essential, tone: essential ? 'default' : 'warn'
    });
    saveState();
    closeModal();
    render();
  });
}

function openEditCategory(catId) {
  const cat = getCategory(catId);
  if (!cat) return;

  openModal(`
    <h2 class="modal-title">Edit category</h2>
    <p class="modal-sub">Adjust the amount or remove it.</p>

    <div class="field">
      <label>Name</label>
      <input class="input" id="cat-name" value="${escapeHtml(cat.name)}" />
    </div>

    <div class="field">
      <label>Allocated for this month</label>
      <input type="number" inputmode="decimal" class="input input-amount" id="cat-alloc" value="${cat.allocated || ''}" placeholder="0.00" />
    </div>

    <div class="field">
      <label>Spent so far</label>
      <input class="input" disabled value="${fmtMoney(categorySpent(cat.id))}" />
    </div>

    <div class="btn-row">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="cat-save">Save</button>
    </div>
    <div class="spacer-md"></div>
    <button class="btn btn-danger" id="cat-delete">Delete category</button>
  `);

  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal());
  modalRoot.querySelector('#cat-save').addEventListener('click', () => {
    cat.name = modalRoot.querySelector('#cat-name').value.trim() || cat.name;
    cat.allocated = parseFloat(modalRoot.querySelector('#cat-alloc').value) || 0;
    saveState();
    closeModal();
    render();
  });
  modalRoot.querySelector('#cat-delete').addEventListener('click', () => {
    confirmAction('Delete this category?', 'Expenses logged to it will stay, but become uncategorised.', () => {
      state.categories = state.categories.filter(c => c.id !== catId);
      saveState();
      closeModal();
      render();
    });
  });
}

/* ----- wishlist modal ----- */
function openAddWishlist() {
  openModal(`
    <h2 class="modal-title">Add to wishlist</h2>
    <p class="modal-sub">Sit with this for at least 24 hours.</p>
    <div class="field">
      <label>What is it?</label>
      <input class="input" id="w-name" placeholder="e.g. new headphones" autofocus />
    </div>
    <div class="field">
      <label>How much?</label>
      <input type="number" inputmode="decimal" class="input input-amount" id="w-amount" placeholder="0.00" />
    </div>
    <div class="field">
      <label>Why do you want it? (optional)</label>
      <textarea class="textarea" id="w-why" placeholder="Just a sentence."></textarea>
    </div>
    <div class="btn-row">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-primary" id="w-save">Save</button>
    </div>
  `);
  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal());
  modalRoot.querySelector('#w-save').addEventListener('click', () => {
    const name = modalRoot.querySelector('#w-name').value.trim();
    const amount = parseFloat(modalRoot.querySelector('#w-amount').value) || 0;
    const why = modalRoot.querySelector('#w-why').value.trim();
    if (!name) return;
    state.wishlist.push({ id: uid(), name, amount, why, savedAt: new Date().toISOString() });
    saveState();
    closeModal();
    render();
  });
}

function approveWish(id) {
  const w = state.wishlist.find(x => x.id === id);
  if (!w) return;
  // Open expense modal pre-filled. Mark the wish id so it gets removed only on save.
  openAddExpense({ amount: w.amount, note: w.name, _fromWishId: id });
}

function removeWish(id) {
  state.wishlist = state.wishlist.filter(x => x.id !== id);
  saveState();
  render();
}

/* ----- confirm modal ----- */
function confirmAction(title, sub, onConfirm) {
  openModal(`
    <h2 class="modal-title">${escapeHtml(title)}</h2>
    <p class="modal-sub">${escapeHtml(sub)}</p>
    <div class="btn-row">
      <button class="btn btn-ghost" data-close>Cancel</button>
      <button class="btn btn-danger" data-action="confirm">Yes, do it</button>
    </div>
  `);
  modalRoot.querySelector('[data-close]').addEventListener('click', () => closeModal());
  modalRoot.querySelector('[data-action="confirm"]').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

/* ===================================================================
   IMPORT / EXPORT / RESET
   =================================================================== */
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tally-backup-${todayISO()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (typeof parsed !== 'object') throw new Error('Bad file');
      confirmAction('Replace your data with this backup?', 'Your current data will be overwritten.', () => {
        state = { ...DEFAULT_STATE, ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) } };
        saveState();
        applyTheme();
        render();
      });
    } catch (e) {
      alert('That file does not look like a Tally backup.');
    }
  };
  reader.readAsText(file);
}

function confirmReset() {
  confirmAction('Reset all data?', 'This clears your income, categories, expenses, and wishlist on this device. There is no undo.', () => {
    state = structuredClone(DEFAULT_STATE);
    saveState();
    applyTheme();
    render();
  });
}

/* ===================================================================
   UTILS
   =================================================================== */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ===================================================================
   INIT
   =================================================================== */
function init() {
  applyTheme();
  refreshHeader();
  checkStreak();

  // bottom nav
  document.querySelectorAll('.nav-item').forEach(b => {
    b.addEventListener('click', () => setView(b.dataset.view));
  });
  document.getElementById('open-add').addEventListener('click', () => openAddExpense());

  // streak tap → insights
  document.getElementById('streak-pill').addEventListener('click', () => setView('insights'));

  // import file
  document.getElementById('import-file').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  // close modal on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalRoot.classList.contains('is-open')) closeModal();
  });

  // hidden Insights view: tap "Insights" link in home to switch
  // (We already wired this in renderHome; no global needed here.)

  setView('home');
}

document.addEventListener('DOMContentLoaded', init);

})();
