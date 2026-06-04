from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import String
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from sqlalchemy import Float

from datetime import datetime

from app.database import Base

class PrinterMetric(Base):

    __tablename__ = "printer_metrics"

    id = Column(Integer, primary_key=True, index=True)

    printer_id = Column(Integer, ForeignKey("printers.id"))

    toner_percent = Column(Integer)

    image_unit_percent = Column(Integer)

    pages = Column(Integer)

    status = Column(String)

    snmp_latency_ms = Column(Float, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )
