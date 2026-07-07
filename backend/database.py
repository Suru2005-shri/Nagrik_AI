import datetime
import random
import string

from sqlalchemy import create_engine, Column, String, DateTime, Text
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./smart_bharat.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def generate_ticket_id() -> str:
    """Ledger-style reference number, e.g. SB-2026-K3F7Q1"""
    year = datetime.datetime.now().year
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"SB-{year}-{suffix}"


class Complaint(Base):
    __tablename__ = "complaints"

    ticket_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    status = Column(String, default="Submitted")
    department = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)


class ChatLog(Base):
    __tablename__ = "chat_logs"

    id = Column(String, primary_key=True, index=True)
    message = Column(Text)
    response = Column(Text)
    language = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
