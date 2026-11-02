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
docs/       specification and project documents
```

## Getting started

Setup instructions will be added in Milestone 2.

## Documentation

- [Specification](docs/SPEC.md)
