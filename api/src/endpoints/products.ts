import { Router } from "express";
import { allProducts, createProduct, updateProduct, deleteProduct } from "../repo/products.js";
import type { ProductInput } from "../repo/products.js";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
    try {
        res.json(await allProducts());
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
});

type Body = Partial<ProductInput>;

const isNonEmpty = (s: unknown): s is string =>
    typeof s === "string" && s.trim().length > 0;

const validate = (b: Body): string[] => {
    const missing: string[] = [];
    if (!isNonEmpty(b.name)) missing.push("name");
    if (!isNonEmpty(b.sku)) missing.push("sku");
    if (!isNonEmpty(b.category)) missing.push("category");
    if (typeof b.price_cents !== "number" || b.price_cents <= 0) missing.push("price_cents");
    if (typeof b.stock !== "number" || b.stock < 0) missing.push("stock");
    if (!Array.isArray(b.sizes) || b.sizes.length === 0) missing.push("sizes");
    if (!Array.isArray(b.colors) || b.colors.length === 0) missing.push("colors");
    if (typeof b.active !== "boolean") missing.push("active");
    return missing;
};

const toInput = (b: Body): ProductInput => ({
    name: b.name!,
    sku: b.sku!,
    category: b.category!,
    price_cents: b.price_cents!,
    old_price_cents: b.old_price_cents ?? null,
    badge: b.badge ?? null,
    description: b.description ?? null,
    image: b.image ?? null,
    tone: b.tone ?? null,
    sizes: b.sizes!,
    colors: b.colors!,
    stock: b.stock!,
    active: b.active!,
});

productsRouter.post("/", async (req, res) => {
    const body = (req.body ?? {}) as Body;
    const missing = validate(body);
    if (missing.length) {
        return res.status(400).json({ error: `Missing or invalid: ${missing.join(", ")}` });
    }
    try {
        res.status(201).json(await createProduct(toInput(body)));
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
});

productsRouter.put("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

    const body = (req.body ?? {}) as Body;
    const missing = validate(body);
    if (missing.length) {
        return res.status(400).json({ error: `Missing or invalid: ${missing.join(", ")}` });
    }
    try {
        res.json(await updateProduct(id, toInput(body)));
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
});

productsRouter.delete("/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    try {
        res.json(await deleteProduct(id));
    } catch (err) {
        res.status(500).json({ error: err instanceof Error ? err.message : "Server error" });
    }
});