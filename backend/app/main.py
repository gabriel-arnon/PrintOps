from pysnmp.hlapi import *

from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

import platform
import time
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

        system = platform.system().lower()

        if system == "windows":

            command = [
                "ping",
                "-n",
                "1",
                "-w",
                "300",
                ip
            ]

        else:

            command = [
                "ping",
                "-c",
                "1",
                "-W",
                "1",
                ip
            ]

        result = subprocess.run(

            command,

            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,

            timeout=2

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

    db = SessionLocal()

    try:

        print(f"[DISCOVERY] Iniciando SNMP: {ip}")

        raw_model, serial = get_multiple_snmp_data(

            ip,

            [

                "1.3.6.1.2.1.1.1.0",
                "1.3.6.1.2.1.43.5.1.1.17.1"

            ],

            timeout=0.5,
            retries=1

        )

        model = (
            raw_model
            .split(";")[0]
            .replace("  ", " ")
            .strip()
        )

        if "HP" not in model:

            print(f"[DISCOVERY] Ignorado (não HP): {ip}")

            return None

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

        print(f"[DISCOVERY] Encontrada: {ip}")

        return result

    except Exception as e:

        print(f"[DISCOVERY] Erro em {ip}: {e}")

        return None

    finally:

        db.close()


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
    minutes=3
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

        id="z1w6yu"

    printer_data = {

        "id": new_printer.id,
        "name": new_printer.name,
        "ip": new_printer.ip

    }

    db.close()

    return {

        "status": "success",

        "printer": printer_data

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

    print("[DISCOVERY] Iniciando descoberta...")

    ips = [

        f"{base_ip}{i}"
        for i in range(10, 255)

    ]

    def scan_alive_ip(ip):

        print(f"[PING] {ip}")

        if is_ip_alive(ip):

            print(f"[PING] Host ativo: {ip}")

            return ip

        return None

    alive_ips = []

    start_time = time.time()

    # =========================
    # PING SCAN
    # =========================

    with ThreadPoolExecutor(max_workers=50) as executor:

        futures = {

            executor.submit(scan_alive_ip, ip): ip
            for ip in ips

        }

        for future in as_completed(futures, timeout=60):

            try:

                result = future.result(timeout=1)

                if result:

                    alive_ips.append(result)

            except Exception as e:

                print(f"[PING] Erro: {e}")

    print(f"[DISCOVERY] Hosts vivos: {len(alive_ips)}")

    # =========================
    # SNMP DISCOVERY
    # =========================

    found = []

    with ThreadPoolExecutor(max_workers=20) as executor:

        futures = {

            executor.submit(
                discover_single_printer,
                ip
            ): ip

            for ip in alive_ips

        }

        for future in as_completed(futures, timeout=120):

            try:

                result = future.result(timeout=2)

                if result:

                    found.append(result)

            except Exception as e:

                print(f"[SNMP] Erro: {e}")

    duration = round(
        time.time() - start_time,
        2
    )

    print(f"[DISCOVERY] Finalizado em {duration}s")

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
            "1.3.6.1.2.1.25.1.1.0"
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

        system_info = get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.1.1.0"
        )

        firmware = "N/A"

        parts = system_info.split(";")

        for part in parts:

            part = part.strip()

            if part.startswith("V"):

                firmware = part
                break

    except Exception:

        firmware = "N/A"
        
    try:

        raw_mac = get_snmp_data(
            printer.ip,
            "1.3.6.1.2.1.2.2.1.6.1"
        )

        mac = ":".join(

            f"{ord(char):02X}"

            for char in raw_mac

        )

    except Exception:

        mac = "N/A"

         
    try:

        interface_status_raw = int(

            get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.2.2.1.8.1"
            )

        )

        interface_status = (
            "up"
            if interface_status_raw == 1
            else "down"
        )

    except Exception:

        interface_status = "unknown"
    




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

        "firmware": firmware,

        "toner_percent": latest_metric.toner_percent if latest_metric else 0,

        "image_unit_percent": latest_metric.image_unit_percent if latest_metric else 0,

        "pages": latest_metric.pages if latest_metric else 0,

        "last_update": latest_metric.created_at if latest_metric else None,

        "interface_status": interface_status,
        

    
    }

    db.close()

    return result


# =========================
# SYSTEM HEALTH
# =========================

@app.get("/system/health")
def system_health(

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        printers = db.query(Printer).all()

        total = len(printers)

              
        online = 0
        offline = 0

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

                online += 1

            else:

                offline += 1
       


        success_rate = round(

            (online / total) * 100,

            1

        ) if total > 0 else 0

        latest_metric = (

            db.query(PrinterMetric)

            .order_by(
                PrinterMetric.created_at.desc()
            )

            .first()

        )

        last_run = (

            latest_metric.created_at

            if latest_metric

            else None

        )

        return {

            "discovery_status": "ok",

            "targets": total,

            "online": online,

            "offline": offline,

            "success_rate": success_rate,

            "cycle_sec": 60,

            "last_run": last_run,

            "last_discovery_scan": last_run,

        }

    finally:

        db.close()

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

@app.get("/test-snmp/{printer_id}")
def test_snmp(

    printer_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    printer = (
        db.query(Printer)
        .filter(Printer.id == printer_id)
        .first()
    )

    results = {}

    oids = [

        "1.3.6.1.2.1.1.1.0",
        "1.3.6.1.2.1.1.5.0",
        "1.3.6.1.2.1.43.5.1.1.16.1",
        "1.3.6.1.2.1.2.2.1.6.1",
        "1.3.6.1.2.1.2.2.1.6.2",
        "1.3.6.1.2.1.2.2.1.6.3"

    ]

    for oid in oids:

        try:

            results[oid] = get_snmp_data(
                printer.ip,
                oid
            )

        except Exception as e:

            results[oid] = str(e)

    db.close()

    return results

# =========================
# SNMP WALK
# =========================
@app.get("/snmp-walk/{printer_id}")
def snmp_walk(

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

    

    results = []

    iterator = nextCmd(

        SnmpEngine(),

        CommunityData("public"),

        UdpTransportTarget((printer.ip, 161)),

        ContextData(),

        ObjectType(
            ObjectIdentity("1.3.6.1.2.1")
        ),

        lexicographicMode=False

    )

    for errorIndication, errorStatus, errorIndex, varBinds in iterator:

        if errorIndication:

            break

        elif errorStatus:

            break

        else:

            for varBind in varBinds:

                oid, value = varBind

                results.append({

                    "oid": str(oid),

                    "value": str(value)

                })

    db.close()

    return results

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