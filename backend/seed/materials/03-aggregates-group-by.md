# Конспект: агрегаты и GROUP BY

Примеры используют учебную базу из таблиц `departments (id, name)` и `employees (id, name, department_id, salary, hire_date)`. Диалект — SQLite.

## Агрегатные функции

Агрегатная функция берёт много строк и возвращает одно значение. Основные:

| Функция | Что считает |
|---|---|
| `COUNT(*)` | число строк |
| `COUNT(столбец)` | число строк, где столбец не NULL |
| `COUNT(DISTINCT столбец)` | число разных значений |
| `SUM(столбец)` | сумму |
| `AVG(столбец)` | среднее |
| `MIN(столбец)`, `MAX(столбец)` | наименьшее и наибольшее |

```sql
SELECT COUNT(*)    AS employees,
       AVG(salary) AS avg_salary,
       MAX(salary) AS max_salary
FROM employees;
```

Без `GROUP BY` вся таблица (после `WHERE`) считается одной группой, и результат — одна строка.

## Агрегаты и NULL

Агрегатные функции пропускают `NULL`. Если у сотрудника не указана зарплата, `AVG(salary)` считает среднее только по известным зарплатам. `COUNT(*)` и `COUNT(salary)` могут дать разные числа: первый считает все строки, второй — только строки с зарплатой.

Если строк нет совсем, `COUNT` возвращает `0`, а `SUM`, `AVG`, `MAX` и `MIN` возвращают `NULL`. Чтобы получить ноль вместо `NULL`, используйте `COALESCE(SUM(salary), 0)` или функцию SQLite `TOTAL(salary)`.

## Что делает GROUP BY

`GROUP BY` делит строки на группы с одинаковым значением указанных столбцов. Затем агрегатные функции считаются отдельно для каждой группы. Результат — одна строка на группу.

```sql
-- сколько сотрудников и какая средняя зарплата в каждом отделе
SELECT department_id,
       COUNT(*)    AS employees,
       AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id;
```

Сотрудники без отдела (`department_id IS NULL`) попадут в отдельную группу с ключом `NULL`.

Группировать можно по нескольким столбцам, тогда группа — это уникальная комбинация значений:

```sql
-- сколько человек принято в каждый отдел по годам
SELECT department_id,
       strftime('%Y', hire_date) AS year,
       COUNT(*) AS hired
FROM employees
GROUP BY department_id, year;
```

## Правило для SELECT

В `SELECT` запроса с `GROUP BY` должны стоять только столбцы группировки и агрегатные функции. Запрос ниже не имеет смысла: в группе много сотрудников, и непонятно, чьё имя показать.

```sql
SELECT department_id, name, COUNT(*)   -- name не в GROUP BY
FROM employees
GROUP BY department_id;
```

Большинство СУБД выдадут ошибку. SQLite выполнит запрос и подставит имя из какой-то строки группы. Ошибки нет, а результат случайный. Это частая ловушка при работе с SQLite.

## HAVING: фильтр групп

`WHERE` фильтрует строки до группировки, `HAVING` — группы после неё. Поэтому условие на агрегат (`COUNT(*) > 3`) пишется только в `HAVING`.

```sql
-- отделы, где больше трёх сотрудников со стажем с 2022 года
SELECT department_id, COUNT(*) AS employees
FROM employees
WHERE hire_date >= '2022-01-01'   -- сначала отбираем строки
GROUP BY department_id
HAVING COUNT(*) > 3;              -- потом отбираем группы
```

Условие, которое не использует агрегат, лучше писать в `WHERE`: тогда меньше строк попадает в группировку.

## GROUP_CONCAT

В SQLite есть `GROUP_CONCAT`: он склеивает значения группы в одну строку.

```sql
SELECT department_id, GROUP_CONCAT(name, ', ') AS names
FROM employees
GROUP BY department_id;
```

## Порядок выполнения

`FROM` → `WHERE` → `GROUP BY` → `HAVING` → `SELECT` → `ORDER BY` → `LIMIT`.

```sql
-- три отдела с самой высокой средней зарплатой
SELECT department_id, ROUND(AVG(salary)) AS avg_salary
FROM employees
WHERE department_id IS NOT NULL
GROUP BY department_id
ORDER BY avg_salary DESC
LIMIT 3;
```

## Частые ошибки

- Агрегат в `WHERE` (`WHERE COUNT(*) > 3`) — нужно `HAVING`.
- Столбец в `SELECT`, которого нет в `GROUP BY`: SQLite молча вернёт случайное значение.
- Ожидание, что `AVG` учитывает строки с `NULL`.
- `SUM` по пустому набору даёт `NULL`, а не `0`.
