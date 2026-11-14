import os
import tempfile
import pytest

# Point pytest runs to an isolated temporary SQLite database before app imports
_TEST_DB_DIR = tempfile.mkdtemp(prefix="wanderlust_pytest_")
_TEST_DB_PATH = os.path.join(_TEST_DB_DIR, "test_wanderlust.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def isolated_test_database():
    from app.db.database import override_database_url

    override_database_url(f"sqlite:///{_TEST_DB_PATH}")
    yield
    try:
        if os.path.exists(_TEST_DB_PATH):
            os.remove(_TEST_DB_PATH)
        os.rmdir(_TEST_DB_DIR)
    except OSError:
        pass
