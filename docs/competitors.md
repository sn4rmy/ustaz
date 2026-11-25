# Анализ конкурентов

Сравниваем Ustaz с тем, чем студенты уже пользуются при подготовке к экзаменам: учебными режимами ИИ-ассистентов (ChatGPT, Gemini, Claude) и приложениями для карточек (Anki, Quizlet).

Данные — на ноябрь 2026 года, по официальным страницам и обзорам из раздела «Источники». Цены в долларах США, для США; в других странах могут отличаться.

## Сравнение

✅ — есть, 🟡 — частично, ❌ — нет.

| | Учит по материалам курса | Помнит прогресс между сессиями | Проверяет отдельно от объяснений | Проверяет SQL исполнением | Казахский язык | Цена |
|---|---|---|---|---|---|---|
| **ChatGPT Study Mode** | 🟡 можно загрузить конспекты в чат, но это не постоянная база курса; в Projects режим недоступен | 🟡 общая «память» о пользователе, без модели знаний по темам | ❌ вопросы задаёт и оценивает та же модель, что объясняет | ❌ ответ оценивает модель «на глаз» | 🟡 отвечает на казахском, качество ниже, чем на русском и английском | бесплатно; Plus — $20/мес |
| **Gemini Guided Learning** | 🟡 можно приложить файлы к разговору | 🟡 общая персонализация, без модели знаний по темам | 🟡 есть квизы и карточки, но их тоже генерирует и проверяет модель | ❌ | 🟡 отвечает на казахском | бесплатно; Google AI Pro — $19.99/мес |
| **Claude Learning Mode** | 🟡 материалы можно положить в Project | 🟡 Projects хранят историю и файлы, без модели знаний по темам | ❌ сократический диалог, отдельной проверки нет | ❌ | 🟡 отвечает на казахском | в Claude for Education (через вуз); Pro — $20/мес |
| **Anki** | 🟡 карточки по курсу студент делает сам | ✅ интервальные повторения | ✅ проверка отделена от теории, но студент оценивает себя сам | ❌ | ✅ карточки на любом языке | бесплатно; AnkiMobile (iOS) — около $25 один раз |
| **Quizlet** | 🟡 наборы карточек — свои или чужие | ✅ статистика и режим заучивания | ✅ тесты отдельно от карточек, но только по готовым ответам | ❌ | 🟡 карточки на казахском, интерфейс без казахского | бесплатно с ограничениями; Plus — $7.99/мес или $35.99/год |
| **Ustaz** | ✅ отвечает только по загруженным материалам курса и ссылается на источник | ✅ модель знаний студента по каждой теме (Bayesian Knowledge Tracing) | ✅ объясняет Teacher, проверяет отдельный агент Examiner | ✅ запрос студента выполняется в учебной базе, результат сравнивается с эталоном | ✅ интерфейс и ответы на казахском, русском и английском | Free — 20 сообщений в день; Premium — около $4.99/мес (цена предварительная) |

## Чем мы отличаемся

Учебные режимы ChatGPT, Gemini и Claude хорошо объясняют, но не знают программу курса, не ведут модель знаний по темам и проверяют ответы той же моделью, что их объясняет, — то есть оценивают сами себя. Anki и Quizlet помнят прогресс, но ничего не объясняют, и материал студент готовит сам. Ustaz объединяет оба подхода для SQL: Teacher объясняет строго по материалам курса со ссылкой на источник, Examiner проверяет запрос настоящим выполнением в базе, а Mentor по модели знаний решает, что повторить, — на казахском, русском и английском и дешевле подписок ИИ-ассистентов.

## Источники

- ChatGPT Study Mode: [справка OpenAI](https://help.openai.com/en/articles/11780217-chatgpt-study-mode-faq), [Tom's Guide](https://www.tomsguide.com/ai/chatgpt-just-added-a-powerful-new-study-mode-heres-how-it-can-help-you-learn-faster)
- Gemini Guided Learning: [блог Google](https://blog.google/products/gemini/guided-learning-google-gemini/), [9to5Google](https://9to5google.com/2025/08/06/gemini-guided-learning/), [Engadget](https://www.engadget.com/ai/geminis-new-guided-learning-mode-can-quiz-students-and-create-interactive-study-aids-181743349.html)
- Claude Learning Mode: [Anthropic — Claude for Education](https://www.anthropic.com/news/introducing-claude-for-education), [Engadget](https://engadget.com/ai/claudes-new-learning-mode-will-prompt-students-to-answer-questions-on-their-own-172057828.html)
- Цены ChatGPT Plus, Claude Pro, Google AI Pro: [eWeek](https://www.eweek.com/news/ai-pricing-cheat-sheet-2026/), [Notebookcheck](https://www.notebookcheck.net/What-AI-subscriptions-cost-in-2026-and-which-one-is-worth-it.1341432.0.html)
- Anki: [FAQ AnkiWeb о цене AnkiMobile](https://docs.ankiweb.net/faqs/why-does-ankimobile-cost-more-than-a-typical-mobile-app), [Mindomax](https://www.mindomax.com/is-anki-free)
- Quizlet: [Mindomax — цены Quizlet Plus](https://www.mindomax.com/quizlet-plus-cost), [Brighterly](https://brighterly.com/blog/quizlet-cost)
- Ustaz: [README](../README.md), [план и тарифы](api.md)
