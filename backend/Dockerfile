FROM python:3.12-slim

# Logs appear right away, and no .pyc files are written into the image.
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

WORKDIR /app

# Dependencies before the code: this layer is reused while only the code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Not root: a bug in the app can't change the system inside the container.
# data/materials must belong to this user before the volume is mounted on it.
RUN useradd --create-home app && mkdir -p data/materials && chown -R app data
USER app

EXPOSE 8000

# Migrations run on every start; Alembic skips the ones already applied.
# exec makes uvicorn the main process, so `docker compose down` stops it cleanly.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
