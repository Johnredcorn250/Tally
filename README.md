# Tally

A calm, single-user budgeting companion. Three files. No backend. Your data stays on your device.

## How to open it

The simplest way: **double-click `index.html`** and it opens in your browser. That's it.

If something looks off (some browsers restrict `localStorage` on `file://` URLs), serve it locally for one second:

```
# from the folder containing the three files
python3 -m http.server 8000
```

Then visit `http://localhost:8000` in your browser. Bookmark it.

## What's inside

- `index.html` — structure
- `styles.css` — all the styling, dark mode default with a light option in settings
- `app.js` — every piece of logic, including localStorage persistence

That's the entire app. No build step, no dependencies, no accounts.

## What it does

- **Home.** A big "safe to spend today" number, your category progress, and recent activity.
- **Budget.** Set monthly income. Allocate to categories. See what's left unassigned.
- **Add (the + button).** Quick expense entry. For non-essential categories, a gentle pause-and-reflect prompt appears.
- **Wishlist.** Park anything you're tempted to buy. After 24 hours it's marked "ready to decide."
- **Insights.** Spending trend, category breakdown, day-of-week pattern, mood patterns.
- **Settings.** Toggle the reflection prompt, switch theme, change currency, export/import a JSON backup, reset.

## Where your data lives

Everything is in your browser's `localStorage` under the key `tally:state:v1`. Nothing leaves your device.

**To back up:** Settings → Export backup. Saves a `.json` file.
**To restore:** Settings → Import backup. Pick the file.
**To wipe:** Settings → Reset everything. Or clear your browser data.

## Notes on the streak

The streak counts days where your spending so far this month stays roughly on pace with how much of the month has elapsed (with a small grace margin). It's friction-light by design — you can turn it off in Settings.

## If you want to tweak it

Open `app.js` and look for:

- `DEFAULT_CATEGORIES` near the top — change the starter categories.
- `safeToSpendToday()` — the formula is just `(income − spent) ÷ days left`. Adjust if you want a more conservative or aggressive version.
- The reflection questions in `openReflection()` — edit to your own.
- CSS variables in `styles.css` `:root` — change the colors and fonts.
