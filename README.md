# Tally

A calm, single-user budgeting companion built to help you catch bad spending patterns before they happen — not just track them after the fact. Three files. No backend. Your data stays on your device.

## How to open it

The simplest way: double-click `index.html` and it opens in your browser. That's it.

If something looks off (some browsers restrict `localStorage` on `file://` URLs), serve it locally for one second:

```
# from the folder containing the three files
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser. Bookmark it.

## What's inside

* `index.html` — structure
* `styles.css` — all the styling, dark mode default with a light option in settings
* `app.js` — every piece of logic, including localStorage persistence

That's the entire app. No build step, no dependencies, no accounts.

## What it does

**Home.** A big "safe to spend today" number, a savings-goal progress card, a this-week snapshot (spent / small purchases / amount skipped into your goal), category progress, and recent activity.

**Budget.** Set monthly income, allocate it to categories (essential vs. discretionary), and set up a savings goal — name, target amount, target date, and a monthly contribution. Tally shows a plain-language projection ("At $150/mo, you'll hit $2,000 around March 2027").

**Add (the + button).** Quick expense entry. If the category is discretionary, or is currently spending faster than the month is elapsing ("running hot"), you'll see a pause screen before it's logged — see "The tradeoff screen" below.

**Wishlist.** Park anything you're tempted to buy. After 24 hours it's marked "ready to decide." If you buy it, it's logged as a normal expense. If you skip it, the amount is automatically credited toward your savings goal, with an immediate confirmation of how much closer you just got.

**Insights.** Spending trend, category pace (which categories are running hot vs. on track), category breakdown, day-of-week pattern, impulse-flagged spend vs. amount skipped into your goal, mood patterns, and goal progress over time. All charts are hand-drawn (SVG/CSS bars) — no charting library.

**Settings.** Toggle the tradeoff prompt, toggle the streak, switch theme, change currency symbol, set the "small purchase" threshold, export/import a JSON backup, reset.

## The tradeoff screen

This is the core behavior-change feature. Instead of a vague "pause and reflect" prompt, when you're about to log an expense in a risky category, Tally shows you concrete numbers:

* How much of that category's budget this brings you to, and whether the category is already running hot
* Exactly how your daily "safe to spend" number moves — before and after
* How the amount compares to this month's goal contribution, if you have a goal set

You can then log it anyway (optionally tagging how you're feeling — stressed, bored, celebrating, needed it, social — which feeds the mood-pattern chart in Insights), park it in the wishlist for a 24-hour cooling-off period, or drop it.

A category is considered "risky" if it's marked discretionary, or if it's running hot (spending faster than the month is elapsing, by more than a small grace margin) — even if it's an essential category.

## Where your data lives

Everything is in your browser's `localStorage` under the key `tally:state:v1`. Nothing leaves your device.

To back up: Settings → Export backup. Saves a `.json` file.
To restore: Settings → Import backup. Pick the file.
To wipe: Settings → Reset everything. Or clear your browser data.

## Notes on the streak

The streak counts days where your spending so far this month stays roughly on pace with how much of the month has elapsed (with a small grace margin). It's friction-light by design — you can turn it off in Settings.

## Notes on the goal

Your monthly contribution is auto-deposited into the goal the first time you open the app in a new calendar month (it catches up if you skip a month or two). It's also treated as already "spent" when calculating safe-to-spend, so the money reserved for your goal never quietly gets spent on something else. Skipping a wishlist item adds its amount to the goal immediately, on top of the monthly deposit.

## If you want to tweak it

Open `app.js` and look for:

* `DEFAULT_CATEGORIES` near the top — change the starter categories.
* `safeToSpendToday()` — the formula is `(income − spent − goal reserve) ÷ days left`. Adjust if you want a more conservative or aggressive version.
* `categoryPace()` and `HOT_PACE_GRACE` — what counts as a category "running hot."
* `isRiskyCategory()` and `CAT_CREEP_TRIGGER` — what triggers the tradeoff screen.
* `computeTradeoff()` — what the pause screen actually shows.
* `MOODS` — the mood chips shown on the pause screen.
* `WISH_WAIT_MS` — the wishlist cooling-off period (default 24h).
* `STREAK_GRACE` — how much slack the streak allows before breaking.

CSS variables in `styles.css` `:root` (and the `[data-theme="light"]` block below it) control colors and fonts.
