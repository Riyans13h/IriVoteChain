import sqlite3
import numpy as np
import io
import logging

# Configure logging
logger = logging.getLogger(__name__)

def adapt_array(arr):
    """Convert numpy array to bytes for storage"""
    out = io.BytesIO()
    np.save(out, arr)
    out.seek(0)
    return sqlite3.Binary(out.read())

def convert_array(text):
    """Convert bytes back to numpy array"""
    out = io.BytesIO(text)
    return np.load(out)

# Register conversions
sqlite3.register_adapter(np.ndarray, adapt_array)
sqlite3.register_converter("ARRAY", convert_array)

def init_db(db_path):
    """Initialize database with voters table"""
    conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS voters
                 (wallet_address TEXT PRIMARY KEY, 
                  iris_hash ARRAY)''')
    conn.commit()
    conn.close()
    logger.info("Database initialized")

def register_voter(db_path, wallet_address, iris_hash):
    """Register new voter in database"""
    wallet_address = wallet_address.strip()  # Removed .lower()
    conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO voters VALUES (?, ?)", 
              (wallet_address, iris_hash))
    conn.commit()
    conn.close()
    logger.info(f"Voter {wallet_address} registered")

def get_iris_hash(db_path, wallet_address):
    """Retrieve iris hash for given wallet address"""
    wallet_address = wallet_address.strip()  # Removed .lower()
    conn = sqlite3.connect(db_path, detect_types=sqlite3.PARSE_DECLTYPES)
    c = conn.cursor()
    c.execute("SELECT iris_hash FROM voters WHERE wallet_address=?", (wallet_address,))
    result = c.fetchone()
    conn.close()
    return result[0] if result else None
