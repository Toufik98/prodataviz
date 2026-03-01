<p align="center">
  <a href="https://github.com/toufik-ferhat/prodataviz">
    <img src="frontend/public/favicon.svg" width="80" height="80" alt="ProDataViz Logo" />
  </a>
</p>

<h1 align="center">ProDataViz</h1>

<p align="center">
  <strong>Interactive analytics platform &amp; SQL learning environment for French Master's graduate employment data (2010 – 2020).</strong>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-→-6366f1?style=for-the-badge" alt="Quick Start" /></a>&nbsp;
  <a href="README.fr.md"><img src="https://img.shields.io/badge/🇫🇷_Français-→-a855f7?style=for-the-badge" alt="French" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/SQLite-3NF-003B57?logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Chart.js-4-FF6384?logo=chartdotjs&logoColor=white" alt="Chart.js" />
  <img src="https://img.shields.io/badge/Monaco_Editor-VS_Code-007ACC?logo=visualstudiocode&logoColor=white" alt="Monaco" />
  <img src="https://img.shields.io/badge/i18n-FR_|_EN-f59e0b" alt="i18n" />
  <img src="https://img.shields.io/badge/license-MIT-10b981" alt="MIT License" />
</p>

---

## Why ProDataViz?

Most SQL learning tools use toy datasets. **ProDataViz** uses **real open-data** — 100 000+ records from [data.gouv.fr](https://data.gouv.fr) covering salaries, employment rates, and career outcomes of French university graduates — to create an immersive, production-grade analytics + education platform.

<table>
<tr>
<td width="50%">

### 📊 Analytics Suite
- **Dashboard** — KPI cards, salary evolution charts, discipline breakdowns
- **Data Explorer** — Paginated, multi-filter table over 100k+ records
- **Rankings** — Top universities by salary & employment rate
- **Compare** — Radar chart to benchmark up to 5 universities

</td>
<td width="50%">

### 🎓 SQL Learning
- **Learn SQL** — 10 interactive lessons from SELECT to Window Functions
- **SQL Lab** — Monaco editor, live schema browser, EXPLAIN plans, complexity scoring
- **20 Challenges** — Gamified progressive exercises with auto-grading & chart visualizations

</td>
</tr>
</table>

---

## 🖥️ Screenshots

> **Dark glassmorphic UI** — responsive, premium design with blur effects, gradient accents, and smooth animations.

| Dashboard | SQL Lab | Challenges |
|:---------:|:-------:|:----------:|
| ![Dashboard](images/MCD.png) | ![SQL Lab](images/MlD.png) | *Coming soon* |

---

## 🏗️ Architecture

```
prodataviz/
├── backend/                 # FastAPI REST API
│   ├── app/
│   │   ├── models.py        # 7 SQLAlchemy models (3NF)
│   │   ├── crud.py          # Query layer
│   │   ├── schemas.py       # Pydantic validation
│   │   └── routers/         # academies, analytics, sql_lab, statistiques
│   └── scripts/seed.py      # CSV → SQLite ETL pipeline
├── frontend/                # Next.js 16 (App Router)
│   ├── app/[locale]/        # i18n-aware pages (fr / en)
│   │   ├── page.js          # Dashboard
│   │   ├── explorer/        # Data Explorer
│   │   ├── classements/     # Rankings
│   │   ├── comparer/        # University Comparator
│   │   ├── apprendre-sql/   # 10-lesson SQL course
│   │   ├── sql-lab/         # Full SQL editor
│   │   └── defis/           # 20 gamified challenges
│   ├── components/          # Shared UI components
│   ├── lib/api.js           # Backend API client
│   └── messages/            # i18n translation files
├── data/                    # Raw CSV + JSON dataset
├── docs/                    # DB architecture & SQL guide
└── start.sh                 # One-command launcher
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16, React 19 | App Router, SSR, i18n routing |
| **Editor** | Monaco Editor | VS Code-grade SQL editing |
| **Charts** | Chart.js + react-chartjs-2 | Bar, Line, Radar, Doughnut visualizations |
| **i18n** | next-intl | Seamless French / English |
| **Backend** | FastAPI, SQLAlchemy 2.0 | Async REST API, ORM |
| **Database** | SQLite (3NF, 7 tables) | Normalized relational schema |
| **Styling** | Custom CSS (Glassmorphism) | Premium dark theme, fully responsive |
| **Tooling** | uv, npm | Fast dependency management |

### Database Schema (3NF)

```
academie ─┬─ etablissement ──┬── statistique ──┬── enquete
           │                  │                 │
           └──────────────────┘   discipline ───┘
                                       │
                                   domaine

           donnees_nationales (standalone aggregate table)
```

7 tables, fully normalized to Third Normal Form. See [docs/architecture.md](docs/architecture.md) for the complete ERD and indexing strategy.

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.12+ | [python.org](https://python.org) |
| uv | latest | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |

### Option A: One-Command Launch

```bash
# Clone the repo
git clone https://github.com/toufik-ferhat/prodataviz.git
cd prodataviz

# Install & seed everything, then launch both servers
chmod +x start.sh && ./start.sh
```

### Option B: Manual Setup

<details>
<summary><strong>Step-by-step instructions</strong></summary>

#### 1. Backend

```bash
cd backend

# Install dependencies
uv sync

# Seed the SQLite database from CSV (~2s)
uv run scripts/seed.py

# Start API server on port 8000
uv run app/main.py
```

#### 2. Frontend (new terminal)

```bash
cd frontend

# Install dependencies
npm install

# Start dev server on port 3000
npm run dev
```

</details>

Open **[http://localhost:3000](http://localhost:3000)** and start exploring!

---

## 🎯 Features in Detail

### Interactive SQL Learning (10 Lessons)

A structured course from zero to advanced SQL, using the real ProDataViz dataset:

| # | Topic | Key Concepts |
|---|-------|-------------|
| 1 | `SELECT` | Choosing columns, `FROM`, `*` |
| 2 | `WHERE` | Filtering, comparison operators, `LIKE`, `AND`/`OR` |
| 3 | `ORDER BY` & `LIMIT` | Sorting, pagination, `ASC`/`DESC` |
| 4 | Aggregates | `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` |
| 5 | `GROUP BY` | Grouping, aggregation per category |
| 6 | `HAVING` | Filtering groups post-aggregation |
| 7 | `JOIN` | `INNER JOIN`, relating tables |
| 8 | Multi-table JOINs | 3+ tables, complex relationships |
| 9 | Subqueries | Nested `SELECT`, `IN`, correlated |
| 10 | Window Functions | `ROW_NUMBER`, `RANK`, `LAG`, `OVER` |

Each lesson includes **theory**, **syntax reference**, **live interactive example**, and a **practice exercise** with hint system and auto-verification.

### SQL Challenges (20 Exercises)

Three difficulty tiers with automatic grading:

- ⭐ **Beginner (1–5)** — `SELECT`, `WHERE`, `ORDER BY`, `COUNT`, `MAX`
- ⭐⭐ **Intermediate (6–10)** — `JOIN`, `GROUP BY`, `HAVING`, `CASE WHEN`, subqueries
- ⭐⭐⭐ **Advanced (11–15)** — `RANK()`, `LAG()`, `ROW_NUMBER()`, CTE, complex queries
- 📊 **Visualization (16–20)** — Data viz challenges that render results as **Bar, Line, Doughnut, and Multi-line charts**

### SQL Lab

A full-featured SQL workbench:

- **Monaco Editor** with SQL syntax highlighting
- **Schema Browser** — click to explore all 7 tables and columns
- **EXPLAIN Query Plan** — see SQLite execution plans
- **Complexity Score** — real-time analysis of query efficiency
- **Result Table** — paginated results with execution time

---

## 🌐 Internationalization

Full French and English support powered by `next-intl`:

- URL-based locale routing (`/fr/...`, `/en/...`)
- All UI text externalized in JSON translation files
- Language switcher in the sidebar
- SQL lesson content available in both languages

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [Database Architecture](docs/architecture.md) | ERD, 3NF justification, indexing strategy |
| [SQL Guide & Challenges](docs/sql_guide.md) | All 20 challenges with solutions |

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

<table>
<tr>
<td align="center"><strong>Toufik FERHAT</strong></td>
<td align="center"><strong>Asma DAGMOUNE</strong></td>
</tr>
</table>

> University project — Information Systems

---

<p align="center">
  <strong>Data source:</strong> <a href="https://data.gouv.fr">data.gouv.fr</a> — French government open data portal
</p>

<p align="center">
  <sub>Built with ❤️ using Next.js, FastAPI, Chart.js &amp; Monaco Editor</sub>
</p>
