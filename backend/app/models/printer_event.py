from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
)

from sqlalchemy.sql import func

from app.database import Base


class PrinterEvent(Base):

    __tablename__ = "printer_events"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    printer_id = Column(
        Integer,
        ForeignKey("printers.id"),
        nullable=False,
    )

    event_type = Column(
        String,
        nullable=False,
    )

    severity = Column(
        String,
        nullable=False,
        default="info",
    )

    message = Column(
        String,
        nullable=False,
    )

    acknowledged = Column(
        Boolean,
        default=False,
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
