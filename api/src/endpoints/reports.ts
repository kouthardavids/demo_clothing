import { Router } from "express";
import { buildReport } from "../repo/reports.js";
import type { RangeKey } from "../repo/reports.js";

export const reportsRouter = Router();

const RANGES = ["7d", "30d", "90d", "12m"] as const;

reportsRouter.get("/", async (req, res) => {
    const raw = String(req.query.range ?? "30d");
    const range = (RANGES.includes(raw as any) ? raw : "30d") as RangeKey;

    try {
        res.json(await buildReport(range));
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
});