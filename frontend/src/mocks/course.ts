import type { Cell, Course, Language, TableSchema, Topic } from '../api/types'

// Test course in the same shape the backend seed will have: one course, five topics.

export const COURSE: Course = { id: 1, title: 'Базы данных (SQL)', language: 'ru' }

export const TOPICS: Topic[] = [
  { id: 1, title: 'SELECT и WHERE', position: 1 },
  { id: 2, title: 'Сортировка и LIMIT', position: 2 },
  { id: 3, title: 'Агрегаты и GROUP BY', position: 3 },
  { id: 4, title: 'JOIN', position: 4 },
  { id: 5, title: 'Подзапросы', position: 5 },
]

export const MATERIALS: Record<number, { id: number; title: string; chunkId: number }> = {
  1: { id: 1, title: 'Конспект: SELECT и WHERE', chunkId: 11 },
  2: { id: 2, title: 'Конспект: сортировка и LIMIT', chunkId: 21 },
  3: { id: 3, title: 'Конспект: агрегаты и GROUP BY', chunkId: 31 },
  4: { id: 4, title: 'Конспект: JOIN', chunkId: 41 },
  5: { id: 5, title: 'Конспект: подзапросы', chunkId: 51 },
}

type Texts = Record<Language, string>

export const EXPLANATIONS: Record<number, Texts> = {
  1: {
    ru: 'SELECT выбирает столбцы, а WHERE оставляет только строки, для которых условие истинно.\n\n```sql\nSELECT name FROM students WHERE group_name = \'IT-2401\';\n```\n\nУсловия можно объединять через AND и OR.',
    kk: 'SELECT бағандарды таңдайды, ал WHERE шарты ақиқат болатын жолдарды ғана қалдырады.\n\n```sql\nSELECT name FROM students WHERE group_name = \'IT-2401\';\n```\n\nШарттарды AND және OR арқылы біріктіруге болады.',
    en: 'SELECT picks the columns, and WHERE keeps only the rows for which the condition is true.\n\n```sql\nSELECT name FROM students WHERE group_name = \'IT-2401\';\n```\n\nConditions can be combined with AND and OR.',
  },
  2: {
    ru: 'ORDER BY сортирует результат: ASC — по возрастанию (по умолчанию), DESC — по убыванию. LIMIT ограничивает число строк.\n\n```sql\nSELECT course, grade FROM grades ORDER BY grade DESC LIMIT 3;\n```',
    kk: 'ORDER BY нәтижені сұрыптайды: ASC — өсу ретімен (әдепкі), DESC — кему ретімен. LIMIT жолдар санын шектейді.\n\n```sql\nSELECT course, grade FROM grades ORDER BY grade DESC LIMIT 3;\n```',
    en: 'ORDER BY sorts the result: ASC is ascending (the default), DESC is descending. LIMIT caps the number of rows.\n\n```sql\nSELECT course, grade FROM grades ORDER BY grade DESC LIMIT 3;\n```',
  },
  3: {
    ru: 'GROUP BY объединяет строки с одинаковым значением в группы, а агрегатные функции (COUNT, SUM, AVG, MIN, MAX) считают значение для каждой группы.\n\n```sql\nSELECT group_name, COUNT(*) FROM students GROUP BY group_name;\n```\n\nУсловие на группы пишут в HAVING, а не в WHERE.',
    kk: 'GROUP BY мәні бірдей жолдарды топтарға біріктіреді, ал агрегаттық функциялар (COUNT, SUM, AVG, MIN, MAX) әр топ үшін мән есептейді.\n\n```sql\nSELECT group_name, COUNT(*) FROM students GROUP BY group_name;\n```\n\nТоптарға қойылатын шарт WHERE-де емес, HAVING-те жазылады.',
    en: 'GROUP BY puts rows with the same value into groups, and aggregate functions (COUNT, SUM, AVG, MIN, MAX) compute one value per group.\n\n```sql\nSELECT group_name, COUNT(*) FROM students GROUP BY group_name;\n```\n\nConditions on groups go into HAVING, not WHERE.',
  },
  4: {
    ru: 'JOIN соединяет строки двух таблиц по условию в ON. INNER JOIN оставляет только пары, где условие выполнено; LEFT JOIN сохраняет все строки левой таблицы.\n\n```sql\nSELECT s.name, g.grade\nFROM students s\nJOIN grades g ON g.student_id = s.id;\n```',
    kk: 'JOIN екі кестенің жолдарын ON шарты бойынша байланыстырады. INNER JOIN тек шарт орындалатын жұптарды қалдырады; LEFT JOIN сол жақ кестенің барлық жолдарын сақтайды.\n\n```sql\nSELECT s.name, g.grade\nFROM students s\nJOIN grades g ON g.student_id = s.id;\n```',
    en: 'JOIN combines rows of two tables by the condition in ON. INNER JOIN keeps only matching pairs; LEFT JOIN keeps every row of the left table.\n\n```sql\nSELECT s.name, g.grade\nFROM students s\nJOIN grades g ON g.student_id = s.id;\n```',
  },
  5: {
    ru: 'Подзапрос — это SELECT внутри другого запроса. Его результат можно использовать в WHERE вместе с IN, NOT IN или EXISTS.\n\n```sql\nSELECT name FROM students\nWHERE id NOT IN (SELECT student_id FROM grades);\n```',
    kk: 'Ішкі сұраныс — басқа сұраныстың ішіндегі SELECT. Оның нәтижесін WHERE ішінде IN, NOT IN немесе EXISTS арқылы қолдануға болады.\n\n```sql\nSELECT name FROM students\nWHERE id NOT IN (SELECT student_id FROM grades);\n```',
    en: 'A subquery is a SELECT inside another query. Its result can be used in WHERE with IN, NOT IN or EXISTS.\n\n```sql\nSELECT name FROM students\nWHERE id NOT IN (SELECT student_id FROM grades);\n```',
  },
}

export const HINT: Texts = {
  ru: 'Подсказка: сначала определи, из какой таблицы нужны данные. Затем подумай, нужно ли отфильтровать строки (WHERE), сгруппировать их (GROUP BY) или соединить таблицы (JOIN). Какой столбец связывает таблицы?',
  kk: 'Кеңес: алдымен деректер қай кестеден керек екенін анықта. Содан кейін жолдарды сүзу (WHERE), топтау (GROUP BY) немесе кестелерді біріктіру (JOIN) керек пе, ойлан. Кестелерді қай баған байланыстырады?',
  en: 'Hint: first decide which table the data comes from. Then think whether you need to filter rows (WHERE), group them (GROUP BY) or join tables (JOIN). Which column links the tables?',
}

export const NO_TOPIC: Texts = {
  ru: 'Выбери тему вверху — тогда я объясню её по конспектам курса и сошлюсь на источник.',
  kk: 'Жоғарыдан тақырыпты таңда — сонда мен оны курс конспектілері бойынша түсіндіріп, дереккөзін көрсетемін.',
  en: 'Pick a topic above, and I will explain it from the course notes and cite the source.',
}

export const SCHEMA: TableSchema[] = [
  { table: 'students', columns: ['id INTEGER', 'name TEXT', 'group_name TEXT'] },
  { table: 'grades', columns: ['student_id INTEGER', 'course TEXT', 'grade INTEGER'] },
]

export interface MockItem {
  id: number
  topicId: number
  prompt: string
  difficulty: number
  // Accepted answers after normalize() in mocks/items.ts.
  answers: string[]
  columns: string[]
  rows: Cell[][]
}

export const ITEMS: MockItem[] = [
  {
    id: 11,
    topicId: 1,
    prompt: 'Выведите имена студентов группы IT-2401.',
    difficulty: 1,
    answers: ["select name from students where group_name='it-2401'"],
    columns: ['name'],
    rows: [['Aliya'], ['Arman'], ['Dana']],
  },
  {
    id: 12,
    topicId: 1,
    prompt: 'Выведите student_id, course и grade для всех оценок выше 85.',
    difficulty: 1,
    answers: [
      'select student_id,course,grade from grades where grade>85',
      'select * from grades where grade>85',
    ],
    columns: ['student_id', 'course', 'grade'],
    rows: [
      [1, 'SQL', 92],
      [3, 'SQL', 88],
      [4, 'Math', 95],
    ],
  },
  {
    id: 21,
    topicId: 2,
    prompt: 'Выведите три самые высокие оценки: course и grade, по убыванию оценки.',
    difficulty: 1,
    answers: ['select course,grade from grades order by grade desc limit 3'],
    columns: ['course', 'grade'],
    rows: [
      ['Math', 95],
      ['SQL', 92],
      ['SQL', 88],
    ],
  },
  {
    id: 31,
    topicId: 3,
    prompt: 'Выведите количество студентов в каждой группе.',
    difficulty: 1,
    answers: [
      'select group_name,count(*) from students group by group_name',
      'select group_name,count(id) from students group by group_name',
    ],
    columns: ['group_name', 'COUNT(*)'],
    rows: [
      ['IT-2401', 3],
      ['IT-2402', 3],
    ],
  },
  {
    id: 32,
    topicId: 3,
    prompt: 'Выведите средний балл по каждому предмету (course).',
    difficulty: 2,
    answers: ['select course,avg(grade) from grades group by course'],
    columns: ['course', 'AVG(grade)'],
    rows: [
      ['Math', 86.5],
      ['SQL', 83.75],
    ],
  },
  {
    id: 41,
    topicId: 4,
    prompt: 'Выведите имя студента и каждую его оценку.',
    difficulty: 2,
    answers: [
      'select s.name,g.grade from students s join grades g on g.student_id=s.id',
      'select s.name,g.grade from students s join grades g on s.id=g.student_id',
      'select name,grade from students join grades on students.id=grades.student_id',
      'select name,grade from students join grades on grades.student_id=students.id',
    ],
    columns: ['name', 'grade'],
    rows: [
      ['Aliya', 92],
      ['Aliya', 78],
      ['Arman', 85],
      ['Dana', 88],
      ['Erlan', 95],
      ['Madina', 70],
    ],
  },
  {
    id: 51,
    topicId: 5,
    prompt: 'Выведите имена студентов, у которых нет ни одной оценки.',
    difficulty: 3,
    answers: ['select name from students where id not in(select student_id from grades)'],
    columns: ['name'],
    rows: [['Timur']],
  },
]
