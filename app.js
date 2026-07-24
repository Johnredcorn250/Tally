/* ===================================================================
   Tally — app logic
   Single file, no build step, no dependencies. Everything persists to
   localStorage under STORAGE_KEY.

   Tweak points:
   - DEFAULT_CATEGORIES  → starter categories
   - safeToSpendToday()  → the core formula
   - categoryPace()      → what counts as a category "running hot"
   - computeTradeoff()   → what the pre-purchase pause screen shows
   - MOODS               → the mood chips shown in that pause screen
=================================================================== */

const STORAGE_KEY = "tally:state:v1";

const DEFAULT_CATEGORIES = [
  { id: "cat-groceries", name: "Groceries", budget: 400, essential: true },
  { id: "cat-dining", name: "Dining & delivery", budget: 150, essential: false },
  { id: "cat-transport", name: "Transport", budget: 120, essential: true },
  { id: "cat-shopping", name: "Shopping", budget: 100, essential: false },
  { id: "cat-subscriptions", name: "Subscriptions", budget: 60, essential: false },
  { id: "cat-fun", name: "Going out", budget: 100, essential: false },
];

const MOODS = [
  { id: "stressed", label: "Stressed" },
  { id: "bored", label: "Bored" },
  { id: "celebrating", label: "Celebrating" },
  { id: "needed", label: "Needed it" },
  { id: "social", label: "Social" },
];

const HOT_PACE_GRACE = 0.15;   // category counts "hot" once actual% exceeds expected% by this much
const STREAK_GRACE = 0.10;     // day counts "on pace" within this margin
const CAT_CREEP_TRIGGER = true; // whether a hot (non-essential-independent) category also triggers tradeoff

let state = null;
let ui = {
  selectedAddCategory: null,
  selectedWishCategory: null,
  selectedMood: null,
  pendingExpense: null, // {amount, categoryId, note} awaiting tradeoff decision
};

/* ------------------------------------------------------------------
   State: load / save / defaults / month rollover
------------------------------------------------------------------ */

function defaultState() {
  const now = new Date();
  return {
    version: 1,
    income: 0,
    categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
    transactions: [],
    wishlist: [],
    goal: {
      enabled: false,
      name: "",
      targetAmount: 0,
      targetDate: "",
      monthlyContribution: 0,
      saved: 0,
      contributions: [],
    },
    settings: {
      theme: "dark",
      currency: "$",
      tradeoffPromptEnabled: true,
      streakEnabled: true,
      smallPurchaseThreshold: 10,
    },
    meta: {
      createdAt: now.toISOString(),
      lastOpenedMonth: monthKey(now),
    },
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    state = defaultState();
    saveState();
    return;
  }
  try {
    const parsed = JSON.parse(raw);
    // shallow-merge so any new fields introduced later get sane defaults
    const base = defaultState();
    state = {
      ...base,
      ...parsed,
      goal: { ...base.goal, ...(parsed.goal || {}) },
      settings: { ...base.settings, ...(parsed.settings || {}) },
      meta: { ...base.meta, ...(parsed.meta || {}) },
    };
  } catch (e) {
    console.error("Failed to parse saved state, starting fresh.", e);
    state = defaultState();
  }
  runMonthRollover();
  saveState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* Every time the app opens in a new calendar month, deposit that
   month's goal contribution (once per elapsed month, in case the
   app wasn't opened for a while). */
function runMonthRollover() {
  const g = state.goal;
  let cursor = state.meta.lastOpenedMonth;
  const current = monthKey();
  let guard = 0;
  while (cursor !== current && guard < 240) {
    if (g.enabled && g.monthlyContribution > 0) {
      g.saved += g.monthlyContribution;
      g.contributions.push({
        date: cursor + "-01",
        amount: g.monthlyContribution,
        source: "monthly",
      });
    }
    cursor = nextMonthKey(cursor);
    guard++;
  }
  state.meta.lastOpenedMonth = current;
}

/* ------------------------------------------------------------------
   Small utilities
------------------------------------------------------------------ */

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function fmt(amount) {
  const sym = (state && state.settings && state.settings.currency) || "$";
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  return `${sign}${sym}${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtCents(amount) {
  const sym = (state && state.settings && state.settings.currency) || "$";
  const n = Number(amount) || 0;
  return `${sym}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m, 1); // m is already next month (0-indexed trick)
  return monthKey(d);
}

function daysInMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function daysLeftInMonth(d = new Date()) {
  return daysInMonth(d) - d.getDate() + 1;
}

function startOfWeek(d = new Date()) {
  const copy = new Date(d);
  const day = copy.getDay(); // 0 = Sunday
  copy.setDate(copy.getDate() - day);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function isSameMonth(dateStr, mKey) {
  return dateStr.slice(0, 7) === mKey;
}

function relativeDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------
   Core money calculations
------------------------------------------------------------------ */

function monthTransactions(mKey = monthKey()) {
  return state.transactions.filter((t) => isSameMonth(t.date, mKey));
}

function totalSpent(mKey = monthKey()) {
  return monthTransactions(mKey).reduce((s, t) => s + t.amount, 0);
}

function categorySpent(categoryId, mKey = monthKey()) {
  return monthTransactions(mKey)
    .filter((t) => t.categoryId === categoryId)
    .reduce((s, t) => s + t.amount, 0);
}

/* safe-to-spend-today = (income - spent so far - goal reserve) / days left.
   Pass extraSpend to preview what a hypothetical purchase would do to it. */
function safeToSpendToday(extraSpend = 0) {
  const spent = totalSpent() + extraSpend;
  const reserved = state.goal.enabled ? state.goal.monthlyContribution || 0 : 0;
  const available = state.income - spent - reserved;
  const dLeft = daysLeftInMonth();
  return available / Math.max(dLeft, 1);
}

/* How a category is pacing against the calendar. "hot" = spending
   faster than the month is elapsing, beyond a grace margin. */
function categoryPace(categoryId) {
  const cat = state.categories.find((c) => c.id === categoryId);
  if (!cat) return { expectedPct: 0, actualPct: 0, hot: false, spent: 0, budget: 0 };
  const spent = categorySpent(categoryId);
  const dim = daysInMonth();
  const dom = new Date().getDate();
  const expectedPct = dom / dim;
  const actualPct = cat.budget > 0 ? spent / cat.budget : 0;
  const hot = cat.budget > 0 && actualPct - expectedPct > HOT_PACE_GRACE;
  return { expectedPct, actualPct, hot, spent, budget: cat.budget };
}

function isRiskyCategory(categoryId) {
  const cat = state.categories.find((c) => c.id === categoryId);
  if (!cat) return false;
  const pace = categoryPace(categoryId);
  return !cat.essential || (CAT_CREEP_TRIGGER && pace.hot);
}

/* What the pre-purchase pause screen needs to show: category impact,
   safe-to-spend impact, and goal impact. */
function computeTradeoff(amount, categoryId) {
  const cat = state.categories.find((c) => c.id === categoryId);
  const pace = categoryPace(categoryId);
  const newSpent = pace.spent + amount;
  const catPct = pace.budget > 0 ? Math.round((newSpent / pace.budget) * 100) : null;

  const before = safeToSpendToday();
  const after = safeToSpendToday(amount);

  let goalPct = null;
  if (state.goal.enabled && state.goal.monthlyContribution > 0) {
    goalPct = Math.round((amount / state.goal.monthlyContribution) * 100);
  }

  return { cat, pace, newSpent, catPct, before, after, goalPct };
}

function goalProjection() {
  const g = state.goal;
  if (!g.enabled || !g.monthlyContribution) return null;
  const remaining = g.targetAmount - g.saved;
  if (remaining <= 0) return { monthsLeft: 0, eta: new Date(), done: true };
  const monthsLeft = Math.ceil(remaining / g.monthlyContribution);
  const eta = new Date();
  eta.setMonth(eta.getMonth() + monthsLeft);
  return { monthsLeft, eta, done: false };
}

/* Streak: consecutive days (ending today) where cumulative spend for
   the month stayed within pace of the calendar, plus a grace margin. */
function computeStreak() {
  if (!state.settings.streakEnabled) return 0;
  const today = new Date();
  const dim = daysInMonth(today);
  let streak = 0;
  for (let day = today.getDate(); day >= 1; day--) {
    const cutoff = new Date(today.getFullYear(), today.getMonth(), day, 23, 59, 59);
    const spentByThen = state.transactions
      .filter((t) => isSameMonth(t.date, monthKey(today)) && new Date(t.date) <= cutoff)
      .reduce((s, t) => s + t.amount, 0);
    const expectedByThen = state.income * (day / dim);
    if (state.income <= 0 || spentByThen <= expectedByThen * (1 + STREAK_GRACE)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/* ------------------------------------------------------------------
   Toast
------------------------------------------------------------------ */

let toastTimer = null;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
}

/* ------------------------------------------------------------------
   Tab navigation
------------------------------------------------------------------ */

function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(`view-${name}`).classList.add("active");
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  renderView(name);
}

function renderView(name) {
  if (name === "home") renderHome();
  if (name === "budget") renderBudget();
  if (name === "add") renderAdd();
  if (name === "wishlist") renderWishlist();
  if (name === "insights") renderInsights();
  if (name === "settings") renderSettings();
}

function renderAll() {
  applyTheme();
  document.getElementById("streak-count").textContent = computeStreak();
  renderView(currentView());
}

function currentView() {
  const active = document.querySelector(".view.active");
  return active ? active.id.replace("view-", "") : "home";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.settings.theme === "light" ? "light" : "dark");
}

/* ------------------------------------------------------------------
   HOME
------------------------------------------------------------------ */

function renderHome() {
  const safe = safeToSpendToday();
  const amountEl = document.getElementById("home-safe-amount");
  amountEl.textContent = fmt(safe);
  amountEl.classList.remove("warn", "danger");
  if (safe < 0) amountEl.classList.add("danger");
  else if (safe < safeBaselineWarnThreshold()) amountEl.classList.add("warn");

  document.getElementById("home-safe-sub").textContent =
    daysLeftInMonth() === 1 ? "Last day of the month" : `${daysLeftInMonth()} days left this month`;

  // goal card
  const g = state.goal;
  if (g.enabled && g.targetAmount > 0) {
    const pct = Math.min(100, Math.round((g.saved / g.targetAmount) * 100));
    document.getElementById("home-goal-name").textContent = g.name || "Goal";
    document.getElementById("home-goal-fill").style.width = `${pct}%`;
    document.getElementById("home-goal-saved").textContent = fmt(g.saved);
    document.getElementById("home-goal-target").textContent = `of ${fmt(g.targetAmount)}`;
    const proj = goalProjection();
    document.getElementById("home-goal-eta").textContent = proj
      ? proj.done
        ? "reached!"
        : `~${proj.eta.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`
      : "set a monthly amount";
  } else {
    document.getElementById("home-goal-name").textContent = "No goal set yet — add one in Budget";
    document.getElementById("home-goal-fill").style.width = "0%";
    document.getElementById("home-goal-saved").textContent = fmt(0);
    document.getElementById("home-goal-target").textContent = "of $0";
    document.getElementById("home-goal-eta").textContent = "—";
  }

  // this week stats
  const weekStart = startOfWeek();
  const weekTx = state.transactions.filter((t) => new Date(t.date) >= weekStart);
  const weekSpent = weekTx.reduce((s, t) => s + t.amount, 0);
  const smallTx = weekTx.filter((t) => t.small);
  const smallTotal = smallTx.reduce((s, t) => s + t.amount, 0);
  const weekContribs = g.contributions.filter(
    (c) => c.source === "wishlist-skip" && new Date(c.date) >= weekStart
  );
  const avoided = weekContribs.reduce((s, c) => s + c.amount, 0);

  document.getElementById("home-week-spent").textContent = fmt(weekSpent);
  document.getElementById("home-week-small").textContent = fmt(smallTotal);
  document.getElementById("home-small-count").textContent = smallTx.length;
  document.getElementById("home-week-avoided").textContent = fmt(avoided);

  // categories
  const catList = document.getElementById("home-categories");
  catList.innerHTML = "";
  if (state.categories.length === 0) {
    catList.innerHTML = `<div class="empty-note">No categories yet. Add some in Budget.</div>`;
  }
  state.categories.forEach((cat) => {
    const pace = categoryPace(cat.id);
    const pct = cat.budget > 0 ? Math.min(100, Math.round((pace.spent / cat.budget) * 100)) : 0;
    const row = document.createElement("div");
    row.className = "category-row";
    row.innerHTML = `
      <div class="cat-row-top">
        <span>${escapeHtml(cat.name)}${pace.hot ? '<span class="cat-badge hot">Hot</span>' : ""}</span>
        <span>${fmt(pace.spent)} / ${fmt(cat.budget)}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${pace.hot ? "danger" : pct > 85 ? "warn" : ""}" style="width:${pct}%"></div>
      </div>`;
    catList.appendChild(row);
  });

  // recent activity
  const recentList = document.getElementById("home-recent");
  recentList.innerHTML = "";
  const recent = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
  if (recent.length === 0) {
    recentList.innerHTML = `<div class="empty-note">No expenses logged yet.</div>`;
  }
  recent.forEach((t) => {
    const cat = state.categories.find((c) => c.id === t.categoryId);
    const item = document.createElement("div");
    item.className = "activity-item";
    item.innerHTML = `
      <div>
        <div>${escapeHtml(t.note || (cat ? cat.name : "Uncategorized"))}</div>
        <div class="activity-meta">${cat ? escapeHtml(cat.name) : ""} · ${relativeDate(t.date)}</div>
      </div>
      <div class="activity-amount ${t.tag === "impulse" ? "impulse" : ""}">${fmt(t.amount)}</div>`;
    recentList.appendChild(item);
  });
}

function safeBaselineWarnThreshold() {
  // warn when today's safe-to-spend is less than a third of the naive
  // even-split of income across the whole month
  return state.income > 0 ? state.income / daysInMonth() / 3 : 0;
}

/* ------------------------------------------------------------------
   BUDGET
------------------------------------------------------------------ */

function renderBudget() {
  document.getElementById("budget-income").value = state.income || "";

  const list = document.getElementById("budget-categories");
  list.innerHTML = "";
  state.categories.forEach((cat) => {
    const row = document.createElement("div");
    row.className = "budget-cat-row";
    row.innerHTML = `
      <span class="budget-cat-name">${escapeHtml(cat.name)}${cat.essential ? "" : " · discretionary"}</span>
      <input type="number" class="budget-cat-input" min="0" step="1" value="${cat.budget}" data-cat="${cat.id}" />`;
    list.appendChild(row);
  });
  list.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", (e) => {
      const cat = state.categories.find((c) => c.id === e.target.dataset.cat);
      cat.budget = Number(e.target.value) || 0;
      saveState();
      renderBudget();
    });
  });

  const allocated = state.categories.reduce((s, c) => s + (c.budget || 0), 0) + (state.goal.enabled ? state.goal.monthlyContribution : 0);
  document.getElementById("budget-unallocated").textContent = fmt(state.income - allocated);

  document.getElementById("goal-name").value = state.goal.name || "";
  document.getElementById("goal-target").value = state.goal.targetAmount || "";
  document.getElementById("goal-date").value = state.goal.targetDate || "";
  document.getElementById("goal-monthly").value = state.goal.monthlyContribution || "";

  const proj = goalProjection();
  const projEl = document.getElementById("goal-projection");
  if (!state.goal.name) {
    projEl.textContent = "Name a goal and set a monthly contribution to see a projection.";
  } else if (proj && proj.done) {
    projEl.textContent = `🎉 ${state.goal.name} is fully funded.`;
  } else if (proj) {
    projEl.textContent = `At ${fmt(state.goal.monthlyContribution)}/mo, you'll hit ${fmt(state.goal.targetAmount)} around ${proj.eta.toLocaleDateString(undefined, { month: "long", year: "numeric" })}.`;
  } else {
    projEl.textContent = "Set a monthly contribution to see a projection.";
  }
}

/* ------------------------------------------------------------------
   ADD
------------------------------------------------------------------ */

function renderAddCategoryChips(containerId, selectedGetter, onSelect) {
  const box = document.getElementById(containerId);
  box.innerHTML = "";
  state.categories.forEach((cat) => {
    const pace = categoryPace(cat.id);
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (selectedGetter() === cat.id ? " selected" : "") + (pace.hot ? " hot-cat" : "");
    chip.textContent = cat.name;
    chip.addEventListener("click", () => {
      onSelect(cat.id);
      renderAddCategoryChips(containerId, selectedGetter, onSelect);
    });
    box.appendChild(chip);
  });
}

function renderAdd() {
  if (!ui.selectedAddCategory && state.categories.length) ui.selectedAddCategory = state.categories[0].id;
  renderAddCategoryChips(
    "add-category-chips",
    () => ui.selectedAddCategory,
    (id) => (ui.selectedAddCategory = id)
  );
}

function handleAddSubmit() {
  const amount = Number(document.getElementById("add-amount").value);
  const note = document.getElementById("add-note").value.trim();
  const categoryId = ui.selectedAddCategory;

  if (!amount || amount <= 0) {
    toast("Enter an amount first");
    return;
  }
  if (!categoryId) {
    toast("Pick a category first");
    return;
  }

  if (state.settings.tradeoffPromptEnabled && isRiskyCategory(categoryId)) {
    ui.pendingExpense = { amount, categoryId, note };
    openTradeoffModal();
    return;
  }

  logExpense(amount, categoryId, note, false, null);
  clearAddForm();
  toast("Added");
  switchView("home");
}

function logExpense(amount, categoryId, note, impulse, mood) {
  state.transactions.push({
    id: uid(),
    date: new Date().toISOString(),
    amount,
    categoryId,
    note,
    tag: impulse ? "impulse" : null,
    mood: mood || null,
    small: amount < (state.settings.smallPurchaseThreshold || 0),
  });
  saveState();
}

function clearAddForm() {
  document.getElementById("add-amount").value = "";
  document.getElementById("add-note").value = "";
}

/* ------------------------------------------------------------------
   TRADEOFF MODAL
------------------------------------------------------------------ */

function openTradeoffModal() {
  const { amount, categoryId } = ui.pendingExpense;
  const t = computeTradeoff(amount, categoryId);

  document.getElementById("tradeoff-amount").textContent = fmtCents(amount);

  const lines = [];
  if (t.pace.budget > 0) {
    lines.push(
      `<div class="tradeoff-line ${t.pace.hot ? "warn" : ""}"><span>${escapeHtml(t.cat.name)} budget</span><strong>${t.catPct}% used${t.pace.hot ? " · running hot" : ""}</strong></div>`
    );
  }
  lines.push(
    `<div class="tradeoff-line"><span>Daily safe-to-spend</span><strong>${fmt(t.before)} → ${fmt(t.after)}</strong></div>`
  );
  if (t.goalPct !== null) {
    lines.push(
      `<div class="tradeoff-line"><span>vs. this month's ${escapeHtml(state.goal.name || "goal")} contribution</span><strong>${t.goalPct}%</strong></div>`
    );
  }
  document.getElementById("tradeoff-lines").innerHTML = lines.join("");

  ui.selectedMood = null;
  document.querySelectorAll("#mood-chips .chip").forEach((c) => c.classList.remove("selected"));

  document.getElementById("tradeoff-modal").classList.add("open");
}

function closeTradeoffModal() {
  document.getElementById("tradeoff-modal").classList.remove("open");
  ui.pendingExpense = null;
}

/* ------------------------------------------------------------------
   WISHLIST
------------------------------------------------------------------ */

const WISH_WAIT_MS = 24 * 60 * 60 * 1000;

function isWishReady(item) {
  return item.status === "waiting" && Date.now() - new Date(item.addedAt).getTime() >= WISH_WAIT_MS;
}

function renderWishlist() {
  if (!ui.selectedWishCategory && state.categories.length) ui.selectedWishCategory = state.categories[0].id;
  renderAddCategoryChips(
    "wish-category-chips",
    () => ui.selectedWishCategory,
    (id) => (ui.selectedWishCategory = id)
  );

  const waitingBox = document.getElementById("wishlist-waiting");
  const readyBox = document.getElementById("wishlist-ready");
  waitingBox.innerHTML = "";
  readyBox.innerHTML = "";

  const waiting = state.wishlist.filter((w) => w.status === "waiting" && !isWishReady(w));
  const ready = state.wishlist.filter((w) => w.status === "waiting" && isWishReady(w));

  if (waiting.length === 0) waitingBox.innerHTML = `<div class="empty-note">Nothing waiting.</div>`;
  waiting.forEach((w) => {
    const hoursLeft = Math.max(0, Math.ceil((WISH_WAIT_MS - (Date.now() - new Date(w.addedAt).getTime())) / 3600000));
    const row = document.createElement("div");
    row.className = "wish-item";
    row.innerHTML = `
      <div>
        <div class="wish-info">${escapeHtml(w.name)} · ${fmt(w.amount)}</div>
        <div class="wish-meta">ready in ~${hoursLeft}h</div>
      </div>`;
    waitingBox.appendChild(row);
  });

  if (ready.length === 0) readyBox.innerHTML = `<div class="empty-note">Nothing ready to decide yet.</div>`;
  ready.forEach((w) => {
    const row = document.createElement("div");
    row.className = "wish-item";
    row.innerHTML = `
      <div>
        <div class="wish-info">${escapeHtml(w.name)} · ${fmt(w.amount)}</div>
        <div class="wish-meta">waited 24h — still want it?</div>
      </div>
      <div class="wish-actions">
        <button class="buy-btn" data-id="${w.id}">Buy</button>
        <button class="skip-btn" data-id="${w.id}">Skip → goal</button>
      </div>`;
    readyBox.appendChild(row);
  });

  readyBox.querySelectorAll(".buy-btn").forEach((btn) =>
    btn.addEventListener("click", () => decideWishlistItem(btn.dataset.id, "buy"))
  );
  readyBox.querySelectorAll(".skip-btn").forEach((btn) =>
    btn.addEventListener("click", () => decideWishlistItem(btn.dataset.id, "skip"))
  );
}

function decideWishlistItem(id, decision) {
  const item = state.wishlist.find((w) => w.id === id);
  if (!item) return;
  if (decision === "buy") {
    logExpense(item.amount, item.categoryId, item.name, false, null);
    item.status = "bought";
    item.decidedAt = new Date().toISOString();
    toast("Logged as an expense");
  } else {
    item.status = "skipped";
    item.decidedAt = new Date().toISOString();
    if (state.goal.enabled) {
      state.goal.saved += item.amount;
      state.goal.contributions.push({ date: new Date().toISOString(), amount: item.amount, source: "wishlist-skip" });
      toast(`Nice — ${fmt(item.amount)} just moved toward ${state.goal.name || "your goal"}`);
    } else {
      toast("Skipped — set a goal in Budget to route savings like this automatically");
    }
  }
  saveState();
  renderWishlist();
  renderHome();
}

function handleWishSubmit() {
  const name = document.getElementById("wish-name").value.trim();
  const amount = Number(document.getElementById("wish-amount").value);
  const categoryId = ui.selectedWishCategory;
  if (!name) return toast("Give it a name");
  if (!amount || amount <= 0) return toast("Enter an amount");
  if (!categoryId) return toast("Pick a category");

  state.wishlist.push({
    id: uid(),
    name,
    amount,
    categoryId,
    addedAt: new Date().toISOString(),
    status: "waiting",
    decidedAt: null,
  });
  saveState();
  document.getElementById("wish-name").value = "";
  document.getElementById("wish-amount").value = "";
  toast("Parked. Check back in 24h.");
  renderWishlist();
}

/* ------------------------------------------------------------------
   INSIGHTS — hand-rolled charts, no chart library
------------------------------------------------------------------ */

function sparklineSVG(values, opts = {}) {
  const w = opts.width || 320;
  const h = opts.height || 90;
  const pad = 8;
  const max = Math.max(...values, 1);
  const stepX = values.length > 1 ? (w - 2 * pad) / (values.length - 1) : 0;
  const pts = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = pts.join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polygon points="${area}" fill="var(--accent-soft)"></polygon>
    <polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2.5"></polyline>
  </svg>`;
}

function barRows(items) {
  // items: [{label, value, display, max, color}]
  return items
    .map((it) => {
      const pct = it.max > 0 ? Math.min(100, Math.round((it.value / it.max) * 100)) : 0;
      return `
      <div class="pace-row">
        <div class="pace-top"><span>${escapeHtml(it.label)}</span><span>${escapeHtml(it.display)}</span></div>
        <div class="progress-track">
          <div class="progress-fill ${it.color || ""}" style="width:${pct}%"></div>
        </div>
      </div>`;
    })
    .join("");
}

function renderInsights() {
  // spending trend: last 30 days daily totals
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    const total = state.transactions.filter((t) => t.date.slice(0, 10) === key).reduce((s, t) => s + t.amount, 0);
    days.push(total);
  }
  document.getElementById("chart-trend").innerHTML = sparklineSVG(days);

  // category pace
  document.getElementById("chart-pace").innerHTML = barRows(
    state.categories.map((c) => {
      const pace = categoryPace(c.id);
      return {
        label: c.name,
        value: pace.spent,
        max: c.budget || 1,
        display: `${fmt(pace.spent)} / ${fmt(c.budget)}`,
        color: pace.hot ? "danger" : "",
      };
    })
  );

  // category breakdown (this month, share of total)
  const mSpent = totalSpent();
  document.getElementById("chart-breakdown").innerHTML =
    barRows(
      state.categories
        .map((c) => ({ label: c.name, value: categorySpent(c.id), max: mSpent || 1, display: fmt(categorySpent(c.id)) }))
        .sort((a, b) => b.value - a.value)
    ) || `<div class="empty-note">No spending yet this month.</div>`;

  // day of week pattern
  const dowLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dowTotals = [0, 0, 0, 0, 0, 0, 0];
  state.transactions.forEach((t) => {
    dowTotals[new Date(t.date).getDay()] += t.amount;
  });
  const dowMax = Math.max(...dowTotals, 1);
  document.getElementById("chart-dow").innerHTML = barRows(
    dowLabels.map((label, i) => ({ label, value: dowTotals[i], max: dowMax, display: fmt(dowTotals[i]) }))
  );

  // impulse vs skipped-to-goal, this month
  const impulseTotal = monthTransactions().filter((t) => t.tag === "impulse").reduce((s, t) => s + t.amount, 0);
  const skippedTotal = state.goal.contributions
    .filter((c) => c.source === "wishlist-skip" && isSameMonth(c.date, monthKey()))
    .reduce((s, c) => s + c.amount, 0);
  const impMax = Math.max(impulseTotal, skippedTotal, 1);
  document.getElementById("chart-impulse").innerHTML = barRows([
    { label: "Impulse-flagged spend", value: impulseTotal, max: impMax, display: fmt(impulseTotal), color: "danger" },
    { label: "Skipped → goal", value: skippedTotal, max: impMax, display: fmt(skippedTotal), color: "goal-fill" },
  ]);

  // mood patterns
  const moodTotals = {};
  MOODS.forEach((m) => (moodTotals[m.id] = 0));
  state.transactions.forEach((t) => {
    if (t.mood && moodTotals[t.mood] !== undefined) moodTotals[t.mood] += t.amount;
  });
  const moodMax = Math.max(...Object.values(moodTotals), 1);
  const moodRows = MOODS.filter((m) => moodTotals[m.id] > 0).map((m) => ({
    label: m.label,
    value: moodTotals[m.id],
    max: moodMax,
    display: fmt(moodTotals[m.id]),
  }));
  document.getElementById("chart-mood").innerHTML =
    moodRows.length ? barRows(moodRows) : `<div class="empty-note">No mood tags logged yet — they show up when you log a purchase from the pause screen.</div>`;

  // goal progress over time
  if (state.goal.enabled && state.goal.contributions.length) {
    const sorted = [...state.goal.contributions].sort((a, b) => new Date(a.date) - new Date(b.date));
    let running = 0;
    const cum = sorted.map((c) => (running += c.amount));
    document.getElementById("chart-goal").innerHTML = sparklineSVG(cum);
  } else {
    document.getElementById("chart-goal").innerHTML = `<div class="empty-note">Set a goal in Budget to start tracking progress.</div>`;
  }
}

/* ------------------------------------------------------------------
   SETTINGS
------------------------------------------------------------------ */

function renderSettings() {
  document.getElementById("setting-tradeoff").checked = state.settings.tradeoffPromptEnabled;
  document.getElementById("setting-streak").checked = state.settings.streakEnabled;
  document.getElementById("setting-theme").checked = state.settings.theme === "light";
  document.getElementById("setting-currency").value = state.settings.currency;
  document.getElementById("setting-small-threshold").value = state.settings.smallPurchaseThreshold;
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tally-backup-${monthKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const base = defaultState();
      state = {
        ...base,
        ...parsed,
        goal: { ...base.goal, ...(parsed.goal || {}) },
        settings: { ...base.settings, ...(parsed.settings || {}) },
        meta: { ...base.meta, ...(parsed.meta || {}) },
      };
      saveState();
      renderAll();
      toast("Backup imported");
    } catch (e) {
      toast("Couldn't read that file");
    }
  };
  reader.readAsText(file);
}

/* ------------------------------------------------------------------
   Category modal (Budget → + Category)
------------------------------------------------------------------ */

function openCategoryModal() {
  document.getElementById("new-cat-name").value = "";
  document.getElementById("new-cat-budget").value = "";
  document.getElementById("new-cat-essential").checked = false;
  document.getElementById("category-modal").classList.add("open");
}

function closeCategoryModal() {
  document.getElementById("category-modal").classList.remove("open");
}

function saveNewCategory() {
  const name = document.getElementById("new-cat-name").value.trim();
  const budget = Number(document.getElementById("new-cat-budget").value) || 0;
  const essential = document.getElementById("new-cat-essential").checked;
  if (!name) return toast("Give it a name");
  state.categories.push({ id: "cat-" + uid(), name, budget, essential });
  saveState();
  closeCategoryModal();
  renderBudget();
  toast("Category added");
}

/* ------------------------------------------------------------------
   Misc helpers
------------------------------------------------------------------ */

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

/* ------------------------------------------------------------------
   Wire up events
------------------------------------------------------------------ */

function wireEvents() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // Budget
  document.getElementById("budget-income").addEventListener("change", (e) => {
    state.income = Number(e.target.value) || 0;
    saveState();
    renderBudget();
  });
  document.getElementById("add-category-btn").addEventListener("click", openCategoryModal);
  document.getElementById("category-cancel-btn").addEventListener("click", closeCategoryModal);
  document.getElementById("category-save-btn").addEventListener("click", saveNewCategory);

  ["goal-name", "goal-target", "goal-date", "goal-monthly"].forEach((id) => {
    document.getElementById(id).addEventListener("change", (e) => {
      const key = id.replace("goal-", "");
      const map = { name: "name", target: "targetAmount", date: "targetDate", monthly: "monthlyContribution" };
      const field = map[key];
      let val = e.target.value;
      if (field === "targetAmount" || field === "monthlyContribution") val = Number(val) || 0;
      state.goal[field] = val;
      state.goal.enabled = !!(state.goal.name && state.goal.targetAmount > 0);
      saveState();
      renderBudget();
      renderHome();
    });
  });

  // Add
  document.getElementById("add-submit-btn").addEventListener("click", handleAddSubmit);

  // Tradeoff modal
  document.querySelectorAll("#mood-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const already = chip.classList.contains("selected");
      document.querySelectorAll("#mood-chips .chip").forEach((c) => c.classList.remove("selected"));
      if (!already) {
        chip.classList.add("selected");
        ui.selectedMood = chip.dataset.mood;
      } else {
        ui.selectedMood = null;
      }
    });
  });
  document.getElementById("tradeoff-cancel-btn").addEventListener("click", () => {
    closeTradeoffModal();
  });
  document.getElementById("tradeoff-confirm-btn").addEventListener("click", () => {
    const { amount, categoryId, note } = ui.pendingExpense;
    logExpense(amount, categoryId, note, true, ui.selectedMood);
    closeTradeoffModal();
    clearAddForm();
    toast("Added");
    switchView("home");
  });
  document.getElementById("tradeoff-wishlist-btn").addEventListener("click", () => {
    const { amount, categoryId, note } = ui.pendingExpense;
    state.wishlist.push({
      id: uid(),
      name: note || "Untitled",
      amount,
      categoryId,
      addedAt: new Date().toISOString(),
      status: "waiting",
      decidedAt: null,
    });
    saveState();
    closeTradeoffModal();
    clearAddForm();
    toast("Parked in wishlist for 24h");
    switchView("wishlist");
  });

  // Wishlist
  document.getElementById("wish-submit-btn").addEventListener("click", handleWishSubmit);

  // Settings
  document.getElementById("setting-tradeoff").addEventListener("change", (e) => {
    state.settings.tradeoffPromptEnabled = e.target.checked;
    saveState();
  });
  document.getElementById("setting-streak").addEventListener("change", (e) => {
    state.settings.streakEnabled = e.target.checked;
    saveState();
    renderAll();
  });
  document.getElementById("setting-theme").addEventListener("change", (e) => {
    state.settings.theme = e.target.checked ? "light" : "dark";
    saveState();
    applyTheme();
  });
  document.getElementById("setting-currency").addEventListener("change", (e) => {
    state.settings.currency = e.target.value.trim() || "$";
    saveState();
    renderAll();
  });
  document.getElementById("setting-small-threshold").addEventListener("change", (e) => {
    state.settings.smallPurchaseThreshold = Number(e.target.value) || 0;
    saveState();
  });
  document.getElementById("export-btn").addEventListener("click", exportBackup);
  document.getElementById("import-input").addEventListener("change", (e) => {
    if (e.target.files[0]) importBackup(e.target.files[0]);
  });
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("This clears all Tally data on this device. Continue?")) {
      localStorage.removeItem(STORAGE_KEY);
      loadState();
      renderAll();
      toast("Reset done");
    }
  });
}

/* ------------------------------------------------------------------
   Init
------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  wireEvents();
  renderAll();
});
