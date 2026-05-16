from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import subprocess

from fastapi import (
    FastAPI,
    Depends,
    HTTPException
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import (
    OAuth2PasswordRequestForm
)

from pydantic import BaseModel

from apscheduler.schedulers.background import BackgroundScheduler

from app.database import engine
from app.database import SessionLocal
from app.database import Base

from app.models.printer import Printer
from app.models.printer_metric import PrinterMetric

from app.snmp.collector import (
    get_snmp_data,
    get_multiple_snmp_data
)

from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_user
)

app = FastAPI()

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATABASE
# =========================

Base.metadata.create_all(bind=engine)

# =========================
# SCHEDULER
# =========================

scheduler = BackgroundScheduler()

# =========================
# SCHEMAS
# =========================

class PrinterCreate(BaseModel):

    name: str
    ip: str


class PrinterUpdate(BaseModel):

    name: str


# =========================
# PING HOST
# =========================

def is_ip_alive(ip):

    try:

        result = subprocess.run(

            ["ping", "-n", "1", "-w", "200", ip],

            stdout=subprocess.DEVNULL,

            stderr=subprocess.DEVNULL

        )

        return result.returncode == 0

    except Exception:

        return False


# =========================
# STATUS PARSER
# =========================

def parse_printer_status(value):

    mapping = {

        1: "other",
        2: "unknown",
        3: "idle",
        4: "printing",
        5: "warmup"

    }

    return mapping.get(value, "unknown")


# =========================
# UPTIME PARSER
# =========================

def parse_uptime(ticks):

    try:

        ticks = int(ticks)

        seconds = ticks // 100

        days = seconds // 86400

        hours = (seconds % 86400) // 3600

        if days > 0:

            return f"{days} dias"

        return f"{hours} horas"

    except Exception:

        return "Desconhecido"


# =========================
# DISCOVER SINGLE PRINTER
# =========================

def discover_single_printer(ip):

    try:

        raw_model, serial = get_multiple_snmp_data(

            ip,

            [

                "1.3.6.1.2.1.1.1.0",
                "1.3.6.1.2.1.43.5.1.1.17.1"

            ],

            timeout=0.2,
            retries=0

        )

        model = (
            raw_model
            .split(";")[0]
            .replace("  ", " ")
            .strip()
        )

        if "HP" not in model:
            return None

        db = SessionLocal()

        existing = (
            db.query(Printer)
            .filter(Printer.ip == ip)
            .first()
        )

        result = {

            "ip": ip,

            "model": model,

            "serial": serial,

            "already_added": existing is not None

        }

        db.close()

        print(f"Encontrada: {ip}")

        return result

    except Exception:

        return None


# =========================
# AUTO COLLECT
# =========================

def run_collect():

    print("Executando coleta automática...")

    db = SessionLocal()

    printers = db.query(Printer).all()

    for printer in printers:

        try:

            toner_max = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.43.11.1.1.8.1.1"
            ))

            toner_current = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.43.11.1.1.9.1.1"
            ))

            toner_percent = round(
                (toner_current / toner_max) * 100
            )

            image_max = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.43.11.1.1.8.1.2"
            ))

            image_current = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.43.11.1.1.9.1.2"
            ))

            image_unit_percent = round(
                (image_current / image_max) * 100
            )

            pages = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.43.10.2.1.4.1.1"
            ))

            metric = PrinterMetric(

                printer_id=printer.id,

                toner_percent=toner_percent,

                image_unit_percent=image_unit_percent,

                pages=pages,

                status="online"

            )

            db.add(metric)

            db.commit()

            print(f"{printer.name} online")

        except Exception as e:

            last_metric = (
                db.query(PrinterMetric)
                .filter(
                    PrinterMetric.printer_id == printer.id
                )
                .order_by(
                    PrinterMetric.created_at.desc()
                )
                .first()
            )

            last_toner = 0
            last_pages = 0
            last_image = 0

            if last_metric:

                last_toner = last_metric.toner_percent
                last_pages = last_metric.pages
                last_image = last_metric.image_unit_percent

            metric = PrinterMetric(

                printer_id=printer.id,

                toner_percent=last_toner,

                image_unit_percent=last_image,

                pages=last_pages,

                status="offline"

            )

            db.add(metric)

            db.commit()

            print(f"{printer.name} offline - {e}")

    db.close()


# =========================
# START SCHEDULER
# =========================

scheduler.add_job(
    run_collect,
    'interval',
    minutes=5
)

scheduler.start()


# =========================
# ROOT
# =========================

@app.get("/")
def root():

    return {
        "message": "Print Monitor API Online"
    }


# =========================
# HEALTH
# =========================

@app.get("/health")
def health():

    return {
        "ok": True,
        "service": "print-monitor-api"
    }


# =========================
# LOGIN
# =========================

@app.post("/login")
def login(

    form_data: OAuth2PasswordRequestForm = Depends()

):

    user = authenticate_user(

        form_data.username,

        form_data.password

    )

    if not user:

        raise HTTPException(

            status_code=401,

            detail="Usuário ou senha inválidos"

        )

    access_token = create_access_token({

        "sub": user["username"]

    })

    return {

        "access_token": access_token,

        "token_type": "bearer"

    }


# =========================
# CREATE PRINTER
# =========================

@app.post("/printers")
def create_printer(

    printer: PrinterCreate,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    existing = (
        db.query(Printer)
        .filter(Printer.ip == printer.ip)
        .first()
    )

    if existing:

        db.close()

        return {
            "status": "error",
            "message": "Impressora já cadastrada"
        }

    new_printer = Printer(

        name=printer.name,

        ip=printer.ip

    )

    db.add(new_printer)

    db.commit()

    db.refresh(new_printer)

    try:

        raw_model = get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.1.1.0"
        )

        model = (
            raw_model
            .split(";")[0]
            .replace("  ", " ")
            .strip()
        )

        serial = get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.5.1.1.17.1"
        )

        new_printer.model = model
        new_printer.serial = serial

        db.commit()

    except Exception as e:

        print("Erro ao descobrir impressora:", e)

    try:

        toner_max = int(get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.11.1.1.8.1.1"
        ))

        toner_current = int(get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.11.1.1.9.1.1"
        ))

        toner_percent = round(
            (toner_current / toner_max) * 100
        )

        image_max = int(get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.11.1.1.8.1.2"
        ))

        image_current = int(get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.11.1.1.9.1.2"
        ))

        image_unit_percent = round(
            (image_current / image_max) * 100
        )

        pages = int(get_snmp_data(
            new_printer.ip,
            "1.3.6.1.2.1.43.10.2.1.4.1.1"
        ))

        metric = PrinterMetric(

            printer_id=new_printer.id,

            toner_percent=toner_percent,

            image_unit_percent=image_unit_percent,

            pages=pages,

            status="online"

        )

        db.add(metric)

        db.commit()

    except Exception as e:

        metric = PrinterMetric(

            printer_id=new_printer.id,

            toner_percent=0,

            image_unit_percent=0,

            pages=0,

            status="offline"

        )

        db.add(metric)

        db.commit()

        print("Erro coleta inicial:", e)

    db.close()

    return {

        "status": "success",

        "printer": {

            "id": new_printer.id,
            "name": new_printer.name,
            "ip": new_printer.ip

        }

    }


# =========================
# UPDATE PRINTER
# =========================

@app.patch("/printers/{printer_id}")
def update_printer(

    printer_id: int,
    data: PrinterUpdate,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    printer = (
        db.query(Printer)
        .filter(Printer.id == printer_id)
        .first()
    )

    if not printer:

        db.close()

        return {

            "status": "error",

            "message": "Impressora não encontrada"

        }

    printer.name = data.name

    db.commit()

    db.refresh(printer)

    db.close()

    return {

        "status": "success",

        "printer": {

            "id": printer.id,

            "name": printer.name

        }

    }


# =========================
# MANUAL COLLECT
# =========================

@app.get("/collect")
def collect(

    user=Depends(get_current_user)

):

    run_collect()

    return {
        "status": "success",
        "message": "Coleta executada manualmente"
    }


# =========================
# AUTO DISCOVERY
# =========================

@app.get("/discover")
def discover_printers(

    user=Depends(get_current_user)

):

    base_ip = "192.168.5."

    print("Procurando hosts vivos...")

    ips = [

        f"{base_ip}{i}"
        for i in range(10, 255)

    ]

    def scan_alive_ip(ip):

        if is_ip_alive(ip):

            print(f"Host ativo: {ip}")

            return ip

        return None

    with ThreadPoolExecutor(max_workers=100) as executor:

        results = executor.map(
            scan_alive_ip,
            ips
        )

    alive_ips = [

        ip
        for ip in results
        if ip is not None

    ]

    print(f"Hosts encontrados: {len(alive_ips)}")

    with ThreadPoolExecutor(max_workers=20) as executor:

        results = executor.map(
            discover_single_printer,
            alive_ips
        )

    found = [

        result
        for result in results
        if result is not None

    ]

    return found


# =========================
# DELETE PRINTER
# =========================

@app.delete("/printers/{printer_id}")
def delete_printer(

    printer_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    printer = (
        db.query(Printer)
        .filter(Printer.id == printer_id)
        .first()
    )

    if not printer:

        db.close()

        return {
            "status": "error",
            "message": "Impressora não encontrada"
        }

    db.query(PrinterMetric).filter(
        PrinterMetric.printer_id == printer.id
    ).delete()

    db.delete(printer)

    db.commit()

    db.close()

    return {
        "status": "success",
        "message": "Impressora removida"
    }


# =========================
# DASHBOARD
# =========================

@app.get("/dashboard")
def dashboard(

    user=Depends(get_current_user)

):

    db = SessionLocal()

    printers = db.query(Printer).all()

    result = []

    for printer in printers:

        latest_metric = (
            db.query(PrinterMetric)
            .filter(
                PrinterMetric.printer_id == printer.id
            )
            .order_by(
                PrinterMetric.created_at.desc()
            )
            .first()
        )

        if latest_metric:

            result.append({

                "id": printer.id,

                "printer": printer.name,

                "ip": printer.ip,

                "model": printer.model,

                "serial": printer.serial,

                "status": latest_metric.status,

                "toner_percent": latest_metric.toner_percent,

                "image_unit_percent": latest_metric.image_unit_percent,

                "pages": latest_metric.pages,

                "last_update": latest_metric.created_at

            })

        else:

            result.append({

                "id": printer.id,

                "printer": printer.name,

                "ip": printer.ip,

                "status": "no_data"

            })

    db.close()

    return result


# =========================
# PRINTER DETAILS
# =========================

@app.get("/printers/{printer_id}/details")
def printer_details(

    printer_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    printer = (
        db.query(Printer)
        .filter(Printer.id == printer_id)
        .first()
    )

    if not printer:

        db.close()

        raise HTTPException(
            status_code=404,
            detail="Impressora não encontrada"
        )

    latest_metric = (
        db.query(PrinterMetric)
        .filter(
            PrinterMetric.printer_id == printer.id
        )
        .order_by(
            PrinterMetric.created_at.desc()
        )
        .first()
    )

    try:

        raw_status = int(get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.25.3.5.1.1.1"
        ))

        status = parse_printer_status(
            raw_status
        )

    except Exception:

        status = "unknown"

    try:

        uptime_raw = get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.1.3.0"
        )

        uptime = parse_uptime(
            uptime_raw
        )

    except Exception:

        uptime = "Desconhecido"

    try:

        hostname = get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.1.5.0"
        )

    except Exception:

        hostname = "N/A"

    try:

        mac = get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.2.2.1.6.2"
        )

    except Exception:

        mac = "N/A"

    result = {

        "id": printer.id,

        "name": printer.name,

        "model": printer.model,

        "ip": printer.ip,

        "serial": printer.serial,

        "status": status,

        "uptime": uptime,

        "hostname": hostname,

        "mac": mac,

        "firmware": printer.model,

        "toner_percent": latest_metric.toner_percent if latest_metric else 0,

        "image_unit_percent": latest_metric.image_unit_percent if latest_metric else 0,

        "pages": latest_metric.pages if latest_metric else 0

    }

    db.close()

    return result


# =========================
# PRINTER HISTORY
# =========================

@app.get("/printers/{printer_id}/history")
def printer_history(

    printer_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    metrics = (

        db.query(PrinterMetric)

        .filter(
            PrinterMetric.printer_id == printer_id
        )

        .order_by(
            PrinterMetric.created_at.asc()
        )

        .limit(200)

        .all()

    )

    result = []

    for metric in metrics:

        result.append({

            "created_at": metric.created_at,

            "toner_percent": metric.toner_percent,

            "image_unit_percent": metric.image_unit_percent,

            "pages": metric.pages,

            "status": metric.status

        })

    db.close()

    return result


# =========================
# PRINTER STATS
# =========================

@app.get("/printers/{printer_id}/stats")
def printer_stats(

    printer_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    now = datetime.utcnow()

    start_today = datetime(
        now.year,
        now.month,
        now.day
    )

    week_ago = now - timedelta(days=7)

    # =========================
    # TODAY
    # =========================

    today_metrics = (

        db.query(PrinterMetric)

        .filter(

            PrinterMetric.printer_id == printer_id,

            PrinterMetric.created_at >= start_today

        )

        .order_by(
            PrinterMetric.created_at.asc()
        )

        .all()

    )

    pages_today = 0

    if len(today_metrics) >= 2:

        pages_today = (

            today_metrics[-1].pages
            -
            today_metrics[0].pages

        )

    # =========================
    # WEEK
    # =========================

    week_metrics = (

        db.query(PrinterMetric)

        .filter(

            PrinterMetric.printer_id == printer_id,

            PrinterMetric.created_at >= week_ago

        )

        .order_by(
            PrinterMetric.created_at.asc()
        )

        .all()

    )

    pages_week = 0

    if len(week_metrics) >= 2:

        pages_week = (

            week_metrics[-1].pages
            -
            week_metrics[0].pages

        )

    daily_average = round(
        pages_week / 7
    )

    db.close()

    return {

        "pages_today": pages_today,

        "pages_week": pages_week,

        "daily_average": daily_average

    }