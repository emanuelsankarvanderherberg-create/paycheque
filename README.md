# Paycheque Planner

A small budgeting app for people paid by the hour. Log the hours you work and what you spend, and it tells you how much you can spend today for the rest of the month.

It's a single HTML page that installs to your phone's home screen and works offline. All your data stays on your device; nothing is sent to a server.

## Features

- **Today** – a daily spending amount, worked out from what you've earned minus subscriptions, savings and spending so far
- **Hours** – a Monday–Sunday timesheet with weekly and monthly totals, before and after deductions
- **Spending** – expenses by category, with a list of everything spent this month
- **Subscriptions** – weekly, bi-weekly, monthly and yearly bills converted to a monthly cost
- **Savings** – save a set amount or a percent of pay, and track progress toward a goal
- **Settings** – hourly rate, deduction percent (tax, CPP, EI), custom categories, and backup/restore to a JSON file

## Running it

There's no build step. Serve the folder with any static web server, for example:

```
python -m http.server 8000
```

Then open http://localhost:8000. The service worker (needed for offline use and installing) only runs over `http://localhost` or HTTPS, not when opening `index.html` directly from disk.

To put it online, enable GitHub Pages for this repo (Settings → Pages → deploy from the `main` branch).

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app: markup, styles and script |
| `sw.js` | Service worker that caches the app for offline use |
| `manifest.webmanifest` | Name, colours and icons for installing to a home screen |
| `icon-*.png` | App icons |

## Updating

When you change any file, bump `VERSION` in `sw.js` (for example `paycheque-v1` → `paycheque-v2`) so installed copies pick up the new version instead of the cached one.

## Your data

Everything is stored in your browser's `localStorage`. Clearing site data or uninstalling the app deletes it, so use **Settings → Save a backup file** now and then.
