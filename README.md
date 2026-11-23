# Ustaz

A learning assistant for university students built around three interacting agents: a Teacher, an Examiner and a Mentor. It teaches SQL using the course's own materials, checks answers by actually running the student's queries, and tracks which topics the student has mastered.

This is the team project for the course and the practical part of our diploma project "Intelligent learning assistant based on interacting agents (teacher, examiner, mentor)".

## Problem

Students preparing for exams mostly use general chatbots. These don't know the course materials, don't remember what the student already knows, often just give away the answer, and grade their own explanations.

## How it works

- **Teacher** explains topics based on the uploaded course materials and cites the source.
- **Examiner** gives tasks and grades them. SQL answers are checked by running the query on a test database, not by the model's opinion.
- **Mentor** keeps a model of the student's knowledge (Bayesian Knowledge Tracing), decides what to do next and plans reviews.

The interface is available in Kazakh, Russian and English.

## Team

| Name | Role |
|---|---|
| Dinmukhamet Arkhabekov | Team Lead, Backend, ML/AI |
| Zhaskanat | Frontend |
| Abylaikhan | DevOps/QA, Payments |

## Tech stack

| Part | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python 3.12, FastAPI, SQLAlchemy, LangGraph |
| Database | PostgreSQL + pgvector |
| ML | pyBKT, pandas, scikit-learn |
| Payments | Paddle (sandbox) |
| Infrastructure | Docker Compose, GitHub Actions |

## Repository structure

```
frontend/   web client
backend/    API, agents, orchestration
ml/         student model training
docs/       diagrams and presentations
```

## Getting started

### Whole project in Docker

Needs [Docker Desktop](https://www.docker.com/products/docker-desktop/) (on Windows with WSL 2).

1. Create the settings file and set `JWT_SECRET` in it: any random string of at least 32 characters. For a real LLM also set `GEMINI_API_KEY`, or use `LLM_PROVIDER=fake` to run without a key.

   ```bash
   cp .env.example .env    # Windows: copy .env.example .env
   ```

2. Build and start the database, backend and frontend:

   ```bash
   docker compose up --build
   ```

   - site: http://localhost:5173
   - API docs: http://localhost:8000/docs

   Database migrations run automatically when the backend starts.

3. Fill in the SQL course (topics and lecture notes):

   ```bash
   docker compose exec backend python -m app.scripts.seed
   ```

4. Create an administrator (the password is asked for):

   ```bash
   docker compose exec backend python -m app.scripts.create_admin --email admin@example.com --name Admin
   ```

5. Stop with `docker compose down`. The data stays; `docker compose down -v` also deletes the database and uploaded materials.

Payments use the test provider by default. To pay through the Paddle sandbox, see [docs/payments.md](docs/payments.md).

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # http://localhost:5173
```

Without a running backend, set `VITE_MOCK_API=all` in `frontend/.env`: the app then works on test data. Details are in [frontend/README.md](frontend/README.md).
