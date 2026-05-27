from pysnmp.hlapi import *
import asyncio
from fastapi import WebSocket 
from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed
)

import os
import platform
import time
from datetime import datetime, timedelta, timezone
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
from sqlalchemy import text

from app.database import engine
from app.database import SessionLocal
from app.database import Base


from app.models.printer import Printer
from app.models.printer_metric import PrinterMetric
from app.models.printer_event import PrinterEvent

from app.snmp.collector import (
    SNMP_COMMUNITY,
    get_snmp_data,
    get_multiple_snmp_data
)

from app.auth import (
    authenticate_user,
    create_access_token,
    get_current_user
)

 
# =========================
# WEBSOCKET MANAGER
# =========================

class ConnectionManager:

    def __init__(self):

        self.active_connections = []

    async def connect(

        self,

        websocket: WebSocket

    ):

        await websocket.accept()

        self.active_connections.append(
            websocket
        )

    def disconnect(

        self,

        websocket: WebSocket

    ):

        self.active_connections.remove(
            websocket
        )

    async def broadcast(

        self,

        message: dict

    ):

        disconnected = []

        for connection in self.active_connections:

            try:

                await connection.send_json(
                    message
                )

            except:

                disconnected.append(
                    connection
                )

        for conn in disconnected:

            self.disconnect(conn)

manager = ConnectionManager()
 

app = FastAPI()
APP_STARTED_AT = datetime.now(timezone.utc)

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        (
            "http://localhost:3000,http://127.0.0.1:3000,"
            "http://192.168.5.65:8080,"
            "http://192.168.5.65:3080,"
            "http://192.168.5.65:5173,"
            "http://localhost:4173,http://127.0.0.1:4173,"
            "http://localhost:5173,http://127.0.0.1:5173,"
            "http://localhost:8080,http://127.0.0.1:8080"
        )
    ).split(",")
    if origin.strip()
]

DISCOVERY_BASE_IP = os.getenv("DISCOVERY_BASE_IP", "192.168.5.")
COLLECT_INTERVAL_MINUTES = int(
    os.getenv("COLLECT_INTERVAL_MINUTES", "3")
)

 
# =========================
# WEBSOCKET
# =========================

@app.websocket("/ws")

async def websocket_endpoint(

    websocket: WebSocket

):

    await manager.connect(websocket)

    try:

        while True:

            await websocket.receive_text()

    except:

        manager.disconnect(websocket)
 

# =========================
# CORS
# =========================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
# CREATE PRINTER EVENT
# =========================


def create_printer_event(

    db,
    printer,
    event_type,
    severity,
    message

):

    event = PrinterEvent(

        printer_id=printer.id,

        event_type=event_type,

        severity=severity,

        message=message,

    )

    db.add(event)

    db.commit()



 
# =========================
# PRINTER EVENTS
# =========================

@app.get("/printers/{printer_id}/events")
def get_printer_events(

    printer_id: int,

    limit: int = 25,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        events = (

            db.query(PrinterEvent)

            .filter(
                PrinterEvent.printer_id == printer_id
            )

            .order_by(
                PrinterEvent.created_at.desc()
            )

            .limit(limit)

            .all()

        )

        return [

            {

                "id": event.id,

                "event_type": event.event_type,

                "severity": event.severity,

                "message": event.message,

                "acknowledged": event.acknowledged,

                "created_at": event.created_at,

            }

            for event in events

        ]

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

            if last_metric and last_metric.status == "offline":

                create_printer_event(

                    db=db,

                    printer=printer,

                    event_type="printer_recovered",

                    severity="info",

                    message=f"{printer.name} voltou a responder SNMP",

                )

                           
                asyncio.run(

                    manager.broadcast({

                        "type": "printer_recovered",

                        "printer": printer.name,

                        "severity": "info",

                        "message": f"{printer.name} voltou a responder SNMP",

                    })

                )
 

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

                        
            if last_metric and last_metric.status == "online":

                create_printer_event(

                    db=db,

                    printer=printer,

                    event_type="printer_offline",

                    severity="error",

                    message=f"{printer.name} ficou offline",

                )

 
                asyncio.run(

                    manager.broadcast({

                        "type": "printer_offline",

                        "printer": printer.name,

                        "severity": "error",

                        "message": f"{printer.name} ficou offline",

                    })

                )
            


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
    minutes=COLLECT_INTERVAL_MINUTES
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

    base_ip = DISCOVERY_BASE_IP

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

    db.query(PrinterEvent).filter(
        PrinterEvent.printer_id == printer.id
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

    metric_status = latest_metric.status if latest_metric else "unknown"

    if metric_status == "offline":

        status = "offline"

    else:

        try:

            raw_status = int(get_snmp_data(
                printer.ip,
                "1.3.6.1.2.1.25.3.5.1.1.1"
            ))

            status = parse_printer_status(
                raw_status
            )

        except Exception:

            status = metric_status

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

    if status not in ("offline", "printing", "warmup"):

        if interface_status == "down":

            status = "degraded"

        elif latest_metric and (
            latest_metric.toner_percent < 20
            or latest_metric.image_unit_percent < 20
        ):

            status = "warning"
    




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

            if latest_metric and latest_metric.status == "online":

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

            "cycle_sec": COLLECT_INTERVAL_MINUTES * 60,

            "last_run": last_run,

            "last_discovery_scan": last_run,

        }

    finally:

        db.close()


@app.get("/system/telemetry")
def system_telemetry(

    user=Depends(get_current_user)

):

    db = SessionLocal()

    now = datetime.now(timezone.utc)

    db_status = "ok"
    db_message = "reachable"

    try:

        db.execute(text("SELECT 1"))

        printers = db.query(Printer).all()

        total = len(printers)

        online = 0
        offline = 0

        latest_metric = (

            db.query(PrinterMetric)

            .order_by(
                PrinterMetric.created_at.desc()
            )

            .first()

        )

        for printer in printers:

            printer_metric = (

                db.query(PrinterMetric)

                .filter(
                    PrinterMetric.printer_id == printer.id
                )

                .order_by(
                    PrinterMetric.created_at.desc()
                )

                .first()

            )

            if printer_metric and printer_metric.status == "online":

                online += 1

            else:

                offline += 1

        success_rate = round(

            (online / total) * 100,

            1

        ) if total > 0 else 0

        event_window_start = now - timedelta(hours=24)

        events_24h = (

            db.query(PrinterEvent)

            .filter(
                PrinterEvent.created_at >= event_window_start
            )

            .count()

        )

        recoveries_24h = (

            db.query(PrinterEvent)

            .filter(
                PrinterEvent.event_type == "printer_recovered",
                PrinterEvent.created_at >= event_window_start
            )

            .count()

        )

        latest_events = {}

        events = (

            db.query(PrinterEvent)

            .order_by(
                PrinterEvent.created_at.desc()
            )

            .all()

        )

        for event in events:

            if event.printer_id not in latest_events:

                latest_events[event.printer_id] = event

        active = 0
        unacknowledged = 0
        critical = 0

        for event in latest_events.values():

            if event.event_type != "printer_offline":

                continue

            active += 1

            if not event.acknowledged:

                unacknowledged += 1

            if event.severity == "error":

                critical += 1

        snmp_status = "ok"

        if total > 0 and offline > 0:

            snmp_status = "warn"

        if total > 0 and online == 0:

            snmp_status = "error"

        last_run = latest_metric.created_at if latest_metric else None

        return {

            "server_time": now,

            "booted_at": APP_STARTED_AT,

            "realtime_connections": len(manager.active_connections),

            "services": [

                {
                    "id": "api",
                    "name": "API",
                    "status": "ok",
                    "primary": "200 OK",
                    "secondary": f"{len(manager.active_connections)} websocket clients",
                    "value": 1,
                },

                {
                    "id": "postgres",
                    "name": "PostgreSQL",
                    "status": db_status,
                    "primary": db_message,
                    "secondary": "SELECT 1 health probe",
                    "value": 1 if db_status == "ok" else 0,
                },

                {
                    "id": "snmp",
                    "name": "SNMP Polling Engine",
                    "status": snmp_status,
                    "primary": f"{success_rate:.1f}% success",
                    "secondary": f"{online}/{total} printers online",
                    "value": success_rate,
                },

            ],

            "fleet": {
                "online": online,
                "offline": offline,
                "degraded": 0,
                "total": total,
            },

            "polling": {
                "discovery_status": snmp_status,
                "last_run": last_run,
                "cycle_sec": COLLECT_INTERVAL_MINUTES * 60,
                "targets": total,
                "success_rate": success_rate,
                "last_discovery_scan": None,
            },

            "incidents": {
                "active": active,
                "unacknowledged": unacknowledged,
                "critical": critical,
                "recoveries_24h": recoveries_24h,
                "events_24h": events_24h,
            },

            "snmp_latency": {
                "available": False,
                "points": [],
                "reason": "SNMP request latency is not persisted yet.",
            },

        }

    except Exception as e:

        db_status = "error"
        db_message = str(e)

        return {

            "server_time": now,

            "booted_at": APP_STARTED_AT,

            "realtime_connections": len(manager.active_connections),

            "services": [

                {
                    "id": "api",
                    "name": "API",
                    "status": "warn",
                    "primary": "degraded",
                    "secondary": "database telemetry unavailable",
                    "value": 0,
                },

                {
                    "id": "postgres",
                    "name": "PostgreSQL",
                    "status": db_status,
                    "primary": "unreachable",
                    "secondary": db_message,
                    "value": 0,
                },

            ],

            "fleet": {
                "online": 0,
                "offline": 0,
                "degraded": 0,
                "total": 0,
            },

            "polling": {
                "discovery_status": "error",
                "last_run": None,
                "cycle_sec": COLLECT_INTERVAL_MINUTES * 60,
                "targets": 0,
                "success_rate": 0,
                "last_discovery_scan": None,
            },

            "incidents": {
                "active": 0,
                "unacknowledged": 0,
                "critical": 0,
                "recoveries_24h": 0,
                "events_24h": 0,
            },

            "snmp_latency": {
                "available": False,
                "points": [],
                "reason": "SNMP request latency is not persisted yet.",
            },

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

        CommunityData(SNMP_COMMUNITY),

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
# TIMELINE
# =========================

@app.get("/timeline")
def get_timeline(

    limit: int = 50,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        events = (

            db.query(PrinterEvent, Printer)

            .join(
                Printer,
                Printer.id == PrinterEvent.printer_id
            )

            .order_by(
                PrinterEvent.created_at.desc()
            )

            .limit(limit)

            .all()

        )

        result = []

        for event, printer in events:

            result.append({

                "id": event.id,

                "printer": printer.name,

                "event_type": event.event_type,

                "severity": event.severity,

                "message": event.message,

                "acknowledged": event.acknowledged,

                "created_at": event.created_at,

            })

        return result

    finally:

        db.close()
 

 
# =========================
# ACKNOWLEDGE EVENT
# =========================

@app.patch("/events/{event_id}/ack")
def acknowledge_event(

    event_id: int,

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        event = (

            db.query(PrinterEvent)

            .filter(
                PrinterEvent.id == event_id
            )

            .first()

        )

        if not event:

            raise HTTPException(

                status_code=404,

                detail="Evento não encontrado"

            )

        event.acknowledged = True

        db.commit()

        db.refresh(event)

        return {

            "success": True,

            "event_id": event.id,

            "acknowledged": event.acknowledged,

        }

    finally:

        db.close()
 
 
 
# =========================
# INCIDENT SUMMARY
# =========================

@app.get("/incidents/summary")
def get_incident_summary(

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        now = datetime.now(timezone.utc)

        event_window_start = now - timedelta(hours=24)

        latest_events = {}

        events = (

            db.query(PrinterEvent)

            .order_by(
                PrinterEvent.created_at.desc()
            )

            .all()

        )

        for event in events:

            if event.printer_id not in latest_events:

                latest_events[event.printer_id] = event

        active = 0

        unacknowledged = 0

        critical = 0

        recoveries_24h = (

            db.query(PrinterEvent)

            .filter(
                PrinterEvent.event_type == "printer_recovered",
                PrinterEvent.created_at >= event_window_start
            )

            .count()

        )

        for event in latest_events.values():

            if event.event_type == "printer_offline":

                active += 1

                if not event.acknowledged:

                    unacknowledged += 1

                if event.severity == "error":

                    critical += 1

        return {

            "active": active,

            "unacknowledged": unacknowledged,

            "critical": critical,

            "recoveries_24h": recoveries_24h,

        }

    finally:

        db.close()
 
 
# =========================
# ACTIVE INCIDENTS
# =========================

@app.get("/incidents/active")
def get_active_incidents(

    user=Depends(get_current_user)

):

    db = SessionLocal()

    try:

        latest_events = {}

        events = (

            db.query(PrinterEvent)

            .order_by(
                PrinterEvent.created_at.desc()
            )

            .all()

        )

        for event in events:

            if event.printer_id not in latest_events:

                latest_events[event.printer_id] = event

        active_incidents = []

        now = datetime.now(timezone.utc)

        for event in latest_events.values():

            if event.event_type != "printer_offline":

                continue

            duration = int(

                (
                    now - event.created_at
                ).total_seconds()

            )

            printer = (

                db.query(Printer)

                .filter(
                    Printer.id == event.printer_id
                )

                .first()

            )

            active_incidents.append({

                "printer_id": event.printer_id,

                "printer": printer.name if printer else "Unknown",

                "severity": event.severity,

                "acknowledged": event.acknowledged,

                "offline_since": event.created_at,

                "duration_sec": duration,

            })

        return active_incidents

    finally:

        db.close()
 


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
