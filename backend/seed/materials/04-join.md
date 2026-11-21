# Конспект: JOIN

Примеры используют учебную базу из таблиц `departments (id, name)` и `employees (id, name, department_id, salary, hire_date)`. Диалект — SQLite.

## Зачем соединять таблицы

В `employees` хранится только номер отдела (`department_id`), а его название лежит в `departments`. Данные разнесены по таблицам, чтобы название не повторялось в каждой строке. Чтобы показать сотрудника вместе с названием отдела, таблицы нужно соединить: это делает `JOIN`.

## INNER JOIN

`INNER JOIN` (или просто `JOIN`) берёт пары строк из двух таблиц, для которых выполняется условие в `ON`. Строки без пары в результат не попадают.

```sql
SELECT e.name, d.name AS department
FROM employees AS e
JOIN departments AS d ON e.department_id = d.id;
```

`e` и `d` — псевдонимы таблиц. Они сокращают запрос и нужны, когда в обеих таблицах есть столбец с одним именем (здесь это `name` и `id`). Без псевдонима или имени таблицы SQLite сообщит о неоднозначном столбце: `ambiguous column name`.

Сотрудники без отдела (`department_id IS NULL`) и отделы без сотрудников в результат INNER JOIN не попадут.

## LEFT JOIN

`LEFT JOIN` возвращает все строки левой таблицы. Если пары справа нет, столбцы правой таблицы заполняются `NULL`.

```sql
-- все сотрудники, даже без отдела
SELECT e.name, d.name AS department
FROM employees AS e
LEFT JOIN departments AS d ON e.department_id = d.id;
```

Через `LEFT JOIN` удобно искать строки без пары:

```sql
-- отделы, в которых нет ни одного сотрудника
SELECT d.name
FROM departments AS d
LEFT JOIN employees AS e ON e.department_id = d.id
WHERE e.id IS NULL;
```

## Условие в ON и в WHERE

Для `LEFT JOIN` важно, куда поставлено условие. Условие в `ON` влияет только на то, какие пары найдутся, а строки левой таблицы всё равно останутся. Условие в `WHERE` фильтрует уже готовый результат и может выбросить строки с `NULL`, превратив `LEFT JOIN` в обычный `INNER JOIN`.

```sql
-- все отделы и их сотрудники с зарплатой выше 300000;
-- отделы без таких сотрудников тоже останутся
SELECT d.name, e.name
FROM departments AS d
LEFT JOIN employees AS e
       ON e.department_id = d.id AND e.salary > 300000;
```

Если перенести `e.salary > 300000` в `WHERE`, отделы без таких сотрудников пропадут.

## RIGHT и FULL JOIN

`RIGHT JOIN` — это `LEFT JOIN`, у которого таблицы поменяли местами. `FULL OUTER JOIN` возвращает строки обеих таблиц, даже без пары. В SQLite оба появились только в версии 3.39 (2022 год). В старых версиях вместо `RIGHT JOIN` меняют таблицы местами и пишут `LEFT JOIN`.

## CROSS JOIN

`CROSS JOIN` соединяет каждую строку с каждой: 10 сотрудников и 4 отдела дают 40 строк. Если забыть `ON` или написать неверное условие, получится такой же «взрыв» числа строк.

## Соединение с самой собой

Таблицу можно соединить с ней же, задав два разных псевдонима. Пример: пары сотрудников из одного отдела.

```sql
SELECT a.name, b.name
FROM employees AS a
JOIN employees AS b
  ON a.department_id = b.department_id AND a.id < b.id;
```

Условие `a.id < b.id` убирает пары сотрудника с самим собой и повторы вида (А, Б) и (Б, А).

## JOIN и агрегаты

`JOIN` часто сочетают с `GROUP BY`:

```sql
-- число сотрудников в каждом отделе, включая пустые отделы
SELECT d.name, COUNT(e.id) AS employees
FROM departments AS d
LEFT JOIN employees AS e ON e.department_id = d.id
GROUP BY d.id, d.name;
```

Здесь важно писать `COUNT(e.id)`, а не `COUNT(*)`. У пустого отдела после `LEFT JOIN` остаётся одна строка с `NULL`. `COUNT(*)` посчитает её как единицу, а `COUNT(e.id)` правильно даст ноль.

## Частые ошибки

- Нет псевдонима при одинаковых именах столбцов (`ambiguous column name`).
- Условие на правую таблицу в `WHERE` после `LEFT JOIN`.
- `COUNT(*)` вместо `COUNT(столбец)` при подсчёте после `LEFT JOIN`.
- Забытое или неверное условие `ON`, из-за которого строки перемножаются.
