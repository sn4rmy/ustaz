# Ustaz — frontend

React + TypeScript + Vite + Tailwind CSS. Interface languages: Kazakh, Russian, English.

## Run

```bash
cd frontend
cp .env.example .env     # Windows: copy .env.example .env
npm install
npm run dev              # http://localhost:5173
```

Other commands:

| Command | What it does |
|---|---|
| `npm run lint` | oxlint |
| `npm run build` | type check and production build into `dist/` |
| `npm run preview` | serve the built `dist/` |

## Settings (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend address |
| `VITE_MOCK_API` | `courses,chat,items,billing` | Which API parts use test data: `all`, `none` or a list of `auth`, `courses`, `chat`, `items`, `billing` |

With `VITE_MOCK_API=all` the app works without a backend at all. Test data lives in `src/mocks/` and follows the formats of [docs/api.md](../docs/api.md). Its state is kept in the browser's localStorage (`ustaz_mock_state`); clear it to start over.

## Structure

```
src/
  api/          request client, types and one function per endpoint of docs/api.md
  mocks/        test data and a fake backend for VITE_MOCK_API
  i18n/         i18next setup, locales/{kk,ru,en}.json, error code texts
  components/   layout, language switcher, base UI elements
  pages/        one file per screen
```

Rules:

- All UI text goes through `t()`; a new string is added to all three locale files.
- Request and response formats change only together with `docs/api.md`.
