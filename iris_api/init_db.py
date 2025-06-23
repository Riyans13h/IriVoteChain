# iris_api/init_db.py
from utils.sqlite_utils import init_db

if __name__ == "__main__":
    print("Initializing database...")
    init_db('voters.db')
    print("Database initialized successfully!")