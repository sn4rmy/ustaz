# Конспект: SELECT и WHERE

## Учебная база

Во всех примерах курса используется одна база SQLite из двух таблиц.

```sql
CREATE TABLE departments (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    salary        INTEGER,
    hire_date     TEXT          -- дата в формате 'YYYY-MM-DD'
);
```

В `departments` хранятся отделы: «Разработка», «Продажи», «Бухгалтерия», «Маркетинг». В `employees` хранятся сотрудники. У части сотрудников отдел не указан, тогда `department_id` равен NULL. У некоторых не указана и зарплата.

## Что делает SELECT

`SELECT` читает данные из таблицы и возвращает результат в виде новой таблицы. Сама база при этом не меняется. Простейший запрос выбирает все столбцы:

```sql
SELECT * FROM employees;
```

Звёздочка `*` означает «все столбцы». В учебных запросах удобно, но в реальных лучше перечислять нужные столбцы явно: так понятнее, что возвращается, и меньше данных передаётся.

```sql
SELECT name, salary FROM employees;
```

## Псевдонимы и вычисляемые столбцы

В `SELECT` можно писать выражения, а не только имена столбцов. Ключевое слово `AS` даёт столбцу результата понятное имя (псевдоним).

```sql
SELECT name, salary * 12 AS year_salary
FROM employees;
```

В SQLite строки склеиваются оператором `||`:

```sql
SELECT name || ' (' || hire_date || ')' AS employee
FROM employees;
```

Осторожно с делением: если оба числа целые, SQLite делит нацело. `7 / 2` даёт `3`, а `7 / 2.0` даёт `3.5`.

## DISTINCT: без повторов

`DISTINCT` убирает одинаковые строки из результата. Запрос возвращает список отделов, в которых есть сотрудники, и каждый отдел в нём встречается один раз:

```sql
SELECT DISTINCT department_id FROM employees;
```

## WHERE: фильтр строк

`WHERE` оставляет только те строки, для которых условие истинно. Условие проверяется для каждой строки отдельно.

```sql
SELECT name, salary
FROM employees
WHERE salary > 300000;
```

Операторы сравнения: `=`, `<>` (или `!=`), `<`, `>`, `<=`, `>=`. Условия объединяются через `AND`, `OR` и `NOT`. У `AND` приоритет выше, чем у `OR`, поэтому при смешивании ставьте скобки:

```sql
SELECT name
FROM employees
WHERE (department_id = 1 OR department_id = 2)
  AND salary >= 250000;
```

## BETWEEN, IN, LIKE

`BETWEEN a AND b` включает обе границы:

```sql
SELECT name, hire_date
FROM employees
WHERE hire_date BETWEEN '2023-01-01' AND '2023-12-31';
```

Даты в SQLite хранятся как текст. Сравнение работает правильно только потому, что формат `YYYY-MM-DD` упорядочен так же, как сами даты.

`IN` проверяет, входит ли значение в список:

```sql
SELECT name FROM employees WHERE department_id IN (1, 3);
```

`LIKE` ищет по шаблону: `%` означает любое количество символов, `_` означает ровно один символ.

```sql
SELECT name FROM employees WHERE name LIKE 'А%';    -- начинается на «А»
SELECT name FROM employees WHERE name LIKE '%ов%';  -- содержит «ов»
```

В SQLite `LIKE` не различает регистр только для латиницы. Для кириллицы `'а%'` и `'А%'` дают разный результат.

## NULL: значения нет

`NULL` означает «значение неизвестно». Это не ноль и не пустая строка. Любое сравнение с `NULL` через `=` даёт не «истину», а `NULL`, и строка в результат не попадает. Поэтому такой запрос ничего не вернёт:

```sql
SELECT name FROM employees WHERE department_id = NULL;   -- ошибка логики
```

Правильно писать `IS NULL` и `IS NOT NULL`:

```sql
SELECT name FROM employees WHERE department_id IS NULL;
```

Значение по умолчанию вместо `NULL` подставляет `COALESCE`:

```sql
SELECT name, COALESCE(salary, 0) AS salary FROM employees;
```

## Порядок выполнения

Запрос пишется в порядке `SELECT … FROM … WHERE`, а выполняется иначе: сначала `FROM` (откуда брать строки), потом `WHERE` (какие оставить), потом `SELECT` (какие столбцы вернуть). Поэтому по стандарту SQL в `WHERE` нельзя сослаться на псевдоним из `SELECT`: когда работает `WHERE`, этого псевдонима ещё нет. SQLite такое допускает, но в PostgreSQL и других СУБД это ошибка, так что лучше повторить выражение целиком.

## Частые ошибки

- `= NULL` вместо `IS NULL`.
- Строки в двойных кавычках. В SQL строковые значения пишутся в одинарных кавычках: `'Продажи'`.
- `OR` без скобок рядом с `AND`.
- Целочисленное деление, когда ждали дробь.
