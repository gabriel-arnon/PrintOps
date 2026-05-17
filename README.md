# PrintOps

Enterprise-grade printer monitoring platform designed for internal hospital environments.

PrintOps provides real-time monitoring, SNMP-based data collection, operational analytics, printer discovery, historical metrics and enterprise dashboarding for healthcare infrastructure.

---

# Features

## Monitoring

* Real-time printer monitoring
* SNMP polling engine
* Automatic printer discovery
* Online/offline detection
* Historical metrics collection
* Printer statistics and analytics
* Toner and image unit monitoring
* Page counter tracking
* Printer detail inspection

---

## Dashboard

* Enterprise dark theme UI
* Premium operational dashboard
* KPI cards
* Interactive charts
* Historical visualization
* Printer detail drawer
* Operational metrics overview
* Responsive layout

---

## Backend

* FastAPI
* SQLAlchemy ORM
* PostgreSQL
* APScheduler
* SNMP polling
* JWT Authentication
* Docker support

---

## Frontend

* React
* Vite
* TanStack Router
* Tailwind CSS
* shadcn/ui
* Recharts

---

# Architecture


Frontend (React + Vite)
        ↓
FastAPI Backend API
        ↓
SNMP Polling Engine
        ↓
PostgreSQL Database


# Screenshots

## Dashboard

<img width="1920" height="931" alt="Captura de tela 2026-05-17 160934" src="https://github.com/user-attachments/assets/5baa8d6b-d3fb-4839-953f-f6ec59238f98" />
<img width="1912" height="923" alt="Captura de tela 2026-05-17 160957" src="https://github.com/user-attachments/assets/1d5caf3a-b028-47f5-98f3-f22a5f01d2b2" />


## Printer Details Drawer

<img width="1920" height="928" alt="Captura de tela 2026-05-17 161050" src="https://github.com/user-attachments/assets/72e738d8-f515-4742-a000-6360f5c4a940" />
<img width="1920" height="930" alt="Captura de tela 2026-05-17 161736" src="https://github.com/user-attachments/assets/1952c7a7-3595-4359-bd49-ee845d73d90a" />

## Discovery System

<img width="1920" height="922" alt="Captura de tela 2026-05-17 161112" src="https://github.com/user-attachments/assets/49944e46-d62a-445f-bdbb-7f7cd4be0355" />
<img width="1920" height="920" alt="Captura de tela 2026-05-17 161124" src="https://github.com/user-attachments/assets/8ce23dc8-57e6-41d7-93bc-e3ec03eadf07" />
<img width="1920" height="918" alt="Captura de tela 2026-05-17 161216" src="https://github.com/user-attachments/assets/b91c764a-31b5-4dea-ac55-cad25818ac61" />

## Printers Add

<img width="1920" height="927" alt="Captura de tela 2026-05-17 161229" src="https://github.com/user-attachments/assets/f082e0e7-83df-40ca-9852-b1e718f91ade" />

# Project Structure


print-monitor/
│
├── backend/
│   ├── app/
│   ├── models/
│   ├── snmp/
│   ├── auth/
│   └── main.py
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── routes/
│   ├── services/
│   └── ui/
│
├── docker-compose.yml
└── README.md




# Installation

## Requirements

* Docker
* Docker Compose
* Node.js 20+
* Python 3.11+

---

# Backend Setup


cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000



# Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# Docker Setup

```bash
docker compose up --build
```

---

# API Documentation

FastAPI Swagger:

```text
http://localhost:8000/docs
```

---

# Authentication

The platform uses JWT authentication.

Protected routes require:

```text
Authorization: Bearer <token>
```

---

# Main Endpoints

## Authentication

```text
POST /login
```

---

## Printers

```text
GET /dashboard
POST /printers
PATCH /printers/{id}
DELETE /printers/{id}
```

---

## Discovery

```text
GET /discover
```

---

## Metrics

```text
GET /printers/{id}/details
GET /printers/{id}/history
GET /printers/{id}/stats
```

---

# Stability Improvements

Current operational improvements implemented:

* Controlled concurrency discovery
* Thread-safe SQLAlchemy handling
* SNMP timeout protection
* Linux and Windows compatible ping system
* Discovery timeout control
* Safer network scanning
* Improved operational resilience

---

# Roadmap

## V1.1

* Internal operational events
* Advanced status system
* Improved observability
* Polling health metrics
* Better error handling

---

## V1.2

* Alert engine
* Notification system
* Email alerts
* Telegram integration
* Teams/Webhook integration

---

## V2

* Dedicated collector service
* Advanced analytics
* Multi-network discovery
* Enhanced operational observability
* Enterprise monitoring improvements

---

# Development Workflow

## Branches

```text
main        -> stable production-ready branch
develop     -> active development branch
```

---

# Git Versioning

Example:

```text
v1.0.0
v1.0.1
v1.1.0
v2.0.0
```

---

# Design Philosophy

PrintOps focuses on:

* Operational stability
* Incremental evolution
* Enterprise UX
* Internal hospital reliability
* Low operational complexity
* Predictable maintenance
* Practical architecture

---

# Environment

Designed primarily for:

* Hospitals
* Internal IT departments
* Operational monitoring teams
* Enterprise printer infrastructure

---

# License

Internal/private project.

---

# Author

Gabriel Arnon
