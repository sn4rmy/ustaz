# Конспект: подзапросы

Примеры используют учебную базу из таблиц `departments (id, name)` и `employees (id, name, department_id, salary, hire_date)`. Диалект — SQLite.

## Что такое подзапрос

Подзапрос — это `SELECT` внутри другого запроса, в круглых скобках. Сначала (логически) считается подзапрос, а его результат используется во внешнем запросе. Подзапросы бывают трёх видов по тому, что возвращают: одно значение, список значений или целую таблицу.

## Подзапрос, возвращающий одно значение

Такой подзапрос можно поставить везде, где ожидается одно значение: в `WHERE`, в `SELECT`, в вычислениях.

```sql
-- сотрудники с зарплатой выше средней по компании
SELECT name, salary
FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

Здесь нельзя написать `WHERE salary > AVG(salary)`: агрегат в `WHERE` не допускается. Подзапрос решает эту задачу.

Если подзапрос вернул несколько строк, большинство СУБД выдадут ошибку. SQLite молча возьмёт первую строку. Если подзапрос не вернул ничего, получится `NULL`.

## IN и NOT IN

Подзапрос, возвращающий один столбец, можно использовать со списком в `IN`:

```sql
-- сотрудники отделов, название которых начинается на «П»
SELECT name
FROM employees
WHERE department_id IN (
    SELECT id FROM departments WHERE name LIKE 'П%'
);
```

С `NOT IN` есть ловушка. Если в списке есть хотя бы один `NULL`, условие `x NOT IN (...)` никогда не бывает истинным, и запрос вернёт пустой результат.

```sql
-- отделы без сотрудников: вернёт пусто, если у кого-то department_id IS NULL
SELECT name FROM departments
WHERE id NOT IN (SELECT department_id FROM employees);
```

Безопаснее отфильтровать `NULL` в подзапросе (`WHERE department_id IS NOT NULL`) или использовать `NOT EXISTS`.

## Коррелированный подзапрос

Коррелированный подзапрос ссылается на строку внешнего запроса и логически выполняется заново для каждой такой строки.

```sql
-- сотрудники, которые получают больше среднего по своему отделу
SELECT e.name, e.salary
FROM employees AS e
WHERE e.salary > (
    SELECT AVG(x.salary)
    FROM employees AS x
    WHERE x.department_id = e.department_id
);
```

Внутренний запрос использует `e.department_id` из внешнего, поэтому средняя считается для отдела текущего сотрудника.

## EXISTS и NOT EXISTS

`EXISTS (подзапрос)` истинно, если подзапрос вернул хотя бы одну строку. Что именно он выбирает, неважно, поэтому часто пишут `SELECT 1`.

```sql
-- отделы, в которых есть хотя бы один сотрудник
SELECT d.name
FROM departments AS d
WHERE EXISTS (
    SELECT 1 FROM employees AS e WHERE e.department_id = d.id
);

-- отделы без сотрудников; NULL здесь не мешает
SELECT d.name
FROM departments AS d
WHERE NOT EXISTS (
    SELECT 1 FROM employees AS e WHERE e.department_id = d.id
);
```

## Подзапрос в FROM

Подзапрос в `FROM` работает как временная таблица. У него обязательно должен быть псевдоним.

```sql
-- средняя зарплата по отделам, только где средняя выше 250000
SELECT t.department_id, t.avg_salary
FROM (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
) AS t
WHERE t.avg_salary > 250000;
```

Ту же задачу можно решить через `HAVING`. Подзапрос в `FROM` нужен, когда над результатом группировки делают ещё один шаг, например снова соединяют или группируют.

## WITH: именованный подзапрос

`WITH` (общее табличное выражение, CTE) даёт подзапросу имя до основного запроса. Так длинный запрос читается сверху вниз.

```sql
WITH dept_avg AS (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
)
SELECT e.name, e.salary, a.avg_salary
FROM employees AS e
JOIN dept_avg AS a ON a.department_id = e.department_id
WHERE e.salary > a.avg_salary;
```

Результат тот же, что у коррелированного подзапроса выше, но средняя по каждому отделу считается один раз.

## Подзапрос или JOIN

Многие задачи решаются и так, и так. `IN` и `EXISTS` хороши, когда нужно только проверить наличие связанных строк. `JOIN` нужен, когда в результат должны попасть столбцы обеих таблиц. Если `JOIN` может размножить строки (у отдела много сотрудников), а нужен каждый отдел один раз, удобнее `EXISTS`.

## Частые ошибки

- `NOT IN` по столбцу, в котором встречается `NULL`.
- Подзапрос в `FROM` без псевдонима.
- Подзапрос вернул несколько строк там, где ожидалось одно значение (SQLite не предупредит).
- Агрегат прямо в `WHERE` вместо подзапроса.
