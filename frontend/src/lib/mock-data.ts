import type { Printer } from "./api";

const now = Date.now();
const minutesAgo = (m: number) => new Date(now - m * 60_000).toISOString();

export const mockPrinters: Printer[] = [
  { id: 1,  printer: "Enfermaria",        ip: "192.168.5.110", model: "HP Laser 408dn",      serial: "BRBSS270FM", status: "online",  toner_percent: 88, image_unit_percent: 72, pages: 2838,  last_update: minutesAgo(2) },
  { id: 2,  printer: "Recepção",          ip: "192.168.5.111", model: "HP LaserJet M428fdw", serial: "VNB3K12009", status: "online",  toner_percent: 64, image_unit_percent: 58, pages: 5421,  last_update: minutesAgo(1) },
  { id: 3,  printer: "Diretoria",         ip: "192.168.5.112", model: "HP Color M479fdw",    serial: "CNB9D55721", status: "online",  toner_percent: 31, image_unit_percent: 35, pages: 1289,  last_update: minutesAgo(4) },
  { id: 4,  printer: "Financeiro",        ip: "192.168.5.113", model: "HP LaserJet M507dn",  serial: "PHD8N00342", status: "online",  toner_percent: 12, image_unit_percent: 18, pages: 9874,  last_update: minutesAgo(3) },
  { id: 5,  printer: "RH",                ip: "192.168.5.114", model: "HP Laser 408dn",      serial: "BRBSS270GA", status: "offline", toner_percent: 47, image_unit_percent: 50, pages: 3120,  last_update: minutesAgo(42) },
  { id: 6,  printer: "TI - Sala Técnica", ip: "192.168.5.115", model: "HP LaserJet P3015",   serial: "CNF1K23890", status: "online",  toner_percent: 76, image_unit_percent: 80, pages: 18233, last_update: minutesAgo(1) },
  { id: 7,  printer: "Almoxarifado",      ip: "192.168.5.116", model: "HP Laser MFP 137fnw", serial: "VND2H99812", status: "online",  toner_percent: 8,  image_unit_percent: 11, pages: 642,   last_update: minutesAgo(6) },
  { id: 8,  printer: "Atendimento",       ip: "192.168.5.117", model: "HP Color M479fdw",    serial: "CNB9D55733", status: "online",  toner_percent: 55, image_unit_percent: 62, pages: 7321,  last_update: minutesAgo(2) },
  { id: 9,  printer: "Laboratório",       ip: "192.168.5.118", model: "HP LaserJet M507dn",  serial: "PHD8N00891", status: "offline", toner_percent: 19, image_unit_percent: 22, pages: 4456,  last_update: minutesAgo(120) },
  { id: 10, printer: "Sala de Reuniões",  ip: "192.168.5.119", model: "HP Color M255dw",     serial: "CND0L88123", status: "online",  toner_percent: 92, image_unit_percent: 95, pages: 410,   last_update: minutesAgo(5) },
];
