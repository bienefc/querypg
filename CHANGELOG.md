# Changelog

All notable changes to QueryPG will be documented here.

## [0.1.0] - 2026-04-19

### Added

#### Playground
- Monaco code editor with syntax highlighting for SQL, PostgreSQL, Prisma ORM, and MongoDB
- In-browser query execution — no server or real database required
  - SQL / PostgreSQL via sql.js (SQLite WASM)
  - MongoDB via mingo query evaluator
  - Prisma ORM via custom recursive-descent parser and in-memory executor
- Built-in datasets: **E-Commerce Store** (users, products, orders) and **HR / Employees** (employees, departments, salaries)
- Schema sidebar showing tables, columns, and types for the active dataset
- Run queries with the ▶ Run button or `Ctrl+Enter`
- Query type and last query persisted across page refreshes

#### Load Custom Data
- Upload `.json` or `.csv` files to query against your own data
- Paste JSON arrays or CSV text directly in the modal
- Instant preview — data parses automatically on input, no manual "Preview" step
- Loaded tables persist in `localStorage` and survive page refreshes
- Manage loaded tables: add multiple tables or remove individual ones

#### Quiz
- 16 guided quiz questions across all four query types
  - SQL: 5 questions (SELECT, WHERE, JOIN, GROUP BY, LEFT JOIN)
  - PostgreSQL: 3 questions (ILIKE, CAST, comparison)
  - Prisma ORM: 4 questions (findMany, where, select, count)
  - MongoDB: 4 questions (find, filter, projection, aggregation)
- Difficulty levels: easy, medium, hard
- Submit free-form queries — evaluated by comparing result sets, not string matching
- Smart evaluation handles column order, type coercion, float tolerance, and date normalization
- Side-by-side diff view highlighting mismatched cells on failure
- Progressive hints (revealed one at a time)
- Explanation shown after a correct answer
- Quiz progress (completed questions) persisted in `localStorage`
