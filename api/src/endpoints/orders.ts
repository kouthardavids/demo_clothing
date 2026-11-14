import { Router } from "express";
import { createOrder, findAllOrders } from "../repo/orders.js";
import type { OrderItemInput } from "../repo/orders.js";

export const ordersRouter = Router();

type Body = {
    user_id?: string | null;
    email?: string;
    shipping_method?: "standard" | "express";
    ship_name?: string;
    ship_phone?: string | null;
    ship_street?: string;
    ship_suburb?: string;
    ship_city?: string;
    ship_province?: string;
    ship_postal?: string;
    items?: OrderItemInput[];
    payment_provider?: string | null;
    payment_ref?: string | null;
};

const isNonEmpty = (s: unknown): s is string =>
    typeof s === "string" && s.trim().length > 0;

ordersRouter.post("/", async (req, res) => {
    const b = (req.body ?? {}) as Body;

    const REQUIRED_STRINGS = [
        "email",
        "ship_name",
        "ship_street",
        "ship_suburb",
        "ship_city",
        "ship_province",
        "ship_postal",
    ] as const;

    const missing: string[] = REQUIRED_STRINGS.filter((k) => !isNonEmpty(b[k]));

    if (b.shipping_method !== "standard" && b.shipping_method !== "express")
        missing.push("shipping_method");
    if (!Array.isArray(b.items) || b.items.length === 0)
        missing.push("items");

    if (missing.length) {
        return res.status(400).json({ error: `Missing or invalid: ${missing.join(", ")}` });
    }

    try {
        const order = await createOrder({
            user_id: b.user_id ?? null,
            email: b.email!,
            shipping_method: b.shipping_method as "standard" | "express",
            ship_name: b.ship_name!,
            ship_phone: b.ship_phone ?? null,
            ship_street: b.ship_street!,
            ship_suburb: b.ship_suburb!,
            ship_city: b.ship_city!,
            ship_province: b.ship_province!,
            ship_postal: b.ship_postal!,
            items: b.items!,
            payment_provider: b.payment_provider ?? "demo",
            payment_ref: b.payment_ref ?? null,
        });
        res.status(201).json(order);
    } catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : "Server error" });
    }
});

ordersRouter.get("/", async (_req, res) => {
    try {
        const rows = await findAllOrders();
        res.json(rows);
    } catch (err) {
        res
            .status(500)
            .json({ error: err instanceof Error ? err.message : "Server error" });
    }
});