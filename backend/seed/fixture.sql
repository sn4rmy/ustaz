-- Training database for all SQL tasks; the same tables as in the course notes.
-- Salaries are all different, so tasks with ORDER BY have one right order.

CREATE TABLE departments (
    id   INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    name          TEXT NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    salary        INTEGER,
    hire_date     TEXT
);

INSERT INTO departments (id, name) VALUES
    (1, 'Разработка'),
    (2, 'Продажи'),
    (3, 'Бухгалтерия'),
    (4, 'Маркетинг');

INSERT INTO employees (id, name, department_id, salary, hire_date) VALUES
    (1,  'Айгерим Садыкова',  1,    520000, '2019-03-15'),
    (2,  'Ержан Мукашев',     1,    610000, '2017-08-01'),
    (3,  'Дана Ахметова',     1,    450000, '2021-02-10'),
    (4,  'Тимур Ким',         1,    380000, '2023-06-19'),
    (5,  'Асель Нурланова',   2,    340000, '2020-11-02'),
    (6,  'Руслан Ибраев',     2,    410000, '2018-05-23'),
    (7,  'Мадина Жумабекова', 2,    295000, '2022-09-12'),
    (8,  'Олжас Серикбаев',   3,    330000, '2016-01-18'),
    (9,  'Гульнара Тлеуова',  3,    360000, '2019-10-07'),
    (10, 'Нурлан Абенов',     NULL, 270000, '2024-02-01'),
    (11, 'Камила Ортаева',    2,    NULL,   '2024-07-15'),
    (12, 'Артём Волков',      NULL, NULL,   '2024-09-30');
