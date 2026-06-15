import type { TemplateSeason, RegionTemplate } from "../types/template"

export const DEFAULT_SEASONS: TemplateSeason[] = [
  { id: "season-janeiro",       name: "Janeiro",           startMD: "01-01", endMD: "01-31", minNights: 2, multiplierPct: 150, isBase: false, color: "#7c3aed" },
  { id: "season-baixa1",        name: "Baixa Temporada 1", startMD: "02-01", endMD: "06-30", minNights: 2, multiplierPct: 100, isBase: true,  color: "#f97316" },
  { id: "season-carnaval",      name: "Carnaval",          startMD: "02-10", endMD: "02-14", minNights: 5, multiplierPct: 300, isBase: false, color: "#1e293b" },
  { id: "season-semanasanta",   name: "Semana Santa",      startMD: "03-28", endMD: "04-01", minNights: 3, multiplierPct: 150, isBase: false, color: "#16a34a" },
  { id: "season-tiradentes",    name: "Tiradentes",        startMD: "04-18", endMD: "04-21", minNights: 3, multiplierPct: 150, isBase: false, color: "#7c3aed" },
  { id: "season-trabalho",      name: "Dia do Trabalho",   startMD: "04-29", endMD: "05-02", minNights: 2, multiplierPct: 150, isBase: false, color: "#f97316" },
  { id: "season-maes",          name: "Dia das Mães",      startMD: "05-09", endMD: "05-11", minNights: 2, multiplierPct: 100, isBase: false, color: "#ec4899" },
  { id: "season-namorados",     name: "Dia dos Namorados", startMD: "06-11", endMD: "06-14", minNights: 2, multiplierPct: 150, isBase: false, color: "#f97316" },
  { id: "season-corpus",        name: "Corpus Christi",    startMD: "06-18", endMD: "06-22", minNights: 3, multiplierPct: 150, isBase: false, color: "#06b6d4" },
  { id: "season-saojoao",       name: "São João",          startMD: "06-22", endMD: "06-24", minNights: 2, multiplierPct: 130, isBase: false, color: "#1e293b" },
  { id: "season-alta1",         name: "Alta Temporada 1",  startMD: "07-01", endMD: "07-31", minNights: 2, multiplierPct: 125, isBase: false, color: "#f97316" },
  { id: "season-baixa2",        name: "Baixa Temporada 2", startMD: "08-01", endMD: "12-14", minNights: 2, multiplierPct: 115, isBase: false, color: "#1e293b" },
  { id: "season-pais",          name: "Dia dos Pais",      startMD: "08-08", endMD: "08-11", minNights: 2, multiplierPct: 115, isBase: false, color: "#06b6d4" },
  { id: "season-independencia", name: "Independência",     startMD: "09-05", endMD: "09-08", minNights: 3, multiplierPct: 150, isBase: false, color: "#16a34a" },
  { id: "season-aparecida",     name: "N.Sra. Aparecida",  startMD: "10-10", endMD: "10-13", minNights: 3, multiplierPct: 150, isBase: false, color: "#f97316" },
  { id: "season-finados",       name: "Finados",           startMD: "10-31", endMD: "11-03", minNights: 3, multiplierPct: 150, isBase: false, color: "#f97316" },
  { id: "season-proclamacao",   name: "Proclamação Rep.",  startMD: "11-14", endMD: "11-17", minNights: 3, multiplierPct: 150, isBase: false, color: "#7c3aed" },
  { id: "season-alta2",         name: "Alta Temporada 2",  startMD: "12-15", endMD: "01-31", minNights: 2, multiplierPct: 150, isBase: false, color: "#7c3aed" },
  { id: "season-natal",         name: "Natal",             startMD: "12-21", endMD: "12-26", minNights: 3, multiplierPct: 150, isBase: false, color: "#1e293b" },
  { id: "season-reveillon",     name: "Réveillon",         startMD: "12-28", endMD: "01-03", minNights: 5, multiplierPct: 250, isBase: false, color: "#1e293b" },
  { id: "season-carnatal",      name: "Carnatal",          startMD: "12-03", endMD: "12-06", minNights: 3, multiplierPct: 200, isBase: false, color: "#ec4899" },
]

export function getDefaultTemplate(regionId: string): RegionTemplate {
  return {
    regionId,
    seasons: DEFAULT_SEASONS.map((s) => ({ ...s })),
    savedAt: new Date().toISOString(),
  }
}
