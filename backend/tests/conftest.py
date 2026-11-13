import os

# Settings are read when app.main is imported, so test values must be set first.
# Fake providers keep tests offline.
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ["JWT_SECRET"] = "test-secret"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["LLM_PROVIDER"] = "fake"
os.environ["PAYMENT_PROVIDER"] = "mock"
