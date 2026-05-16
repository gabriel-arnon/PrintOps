from sqlalchemy import Column, Integer, String

from app.database import Base

class Printer(Base):

    __tablename__ = "printers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String)
    ip = Column(String)
    model = Column(String)
    serial = Column(String)