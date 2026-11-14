//just demo data

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getProduct } from "./products";
import type { Product } from "./products";

export type CartLine = { id: number; size: string; color: string; qty: number };
export type CartItem = { line: CartLine; product: Product; key: string };

export const lineKey = (l: Pick<CartLine, "id" | "size" | "color">) => `${l.id}|${l.size}|${l.color}`;
export const priceOf = (p: Product) => Number(p.price.replace(/[^\d.]/g, "")) || 0;
export const money = (n: number) =>
    `R${n.toLocaleString("en-ZA", {
        minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
        maximumFractionDigits: 2,
    }).replace(/\u00a0/g, " ")}`;

// Placeholder shipping rules: change to your real ones
export const FREE_SHIPPING_AT = 1000;
export type ShippingMethod = "standard" | "express";
export const SHIPPING: Record<ShippingMethod, { label: string; eta: string; price: number }> = {
    standard: { label: "Standard delivery", eta: "3-5 working days", price: 60 },
    express: { label: "Express delivery", eta: "1-2 working days", price: 120 },
};
export const shippingFor = (m: ShippingMethod, subtotal: number) =>
    m === "standard" && subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING[m].price;

// Prices are treated as VAT-inclusive (15%)
export const vatIncluded = (total: number) => Math.round(((total * 15) / 115) * 100) / 100;

const KEY = "demo-clothing:cart:v1";
const MAX_QTY = 10;

function load(): CartLine[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter(
                (l: any) =>
                    l && typeof l.id === "number" && !!getProduct(l.id) && typeof l.size === "string" && typeof l.color === "string"
            )
            .map((l: any) => ({ id: l.id, size: l.size, color: l.color, qty: Math.max(1, Math.min(MAX_QTY, Number(l.qty) || 1)) }));
    } catch {
        return [];
    }
}

type CartValue = {
    items: CartItem[];
    count: number;
    subtotal: number;
    addItem: (line: CartLine) => void;
    setQty: (key: string, qty: number) => void;
    changeSize: (key: string, size: string) => void;
    removeLine: (key: string) => void;
    clear: () => void;
};

const Ctx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
    const [lines, setLines] = useState<CartLine[]>(load);

    useEffect(() => {
        try {
            window.localStorage.setItem(KEY, JSON.stringify(lines));
        } catch {
            /* storage blocked: the bag still works for this visit */
        }
    }, [lines]);

    const addItem = useCallback((line: CartLine) => {
        if (!getProduct(line.id)) return;
        setLines((prev) => {
            const k = lineKey(line);
            const hit = prev.find((l) => lineKey(l) === k);
            if (hit) return prev.map((l) => (l === hit ? { ...l, qty: Math.min(MAX_QTY, l.qty + line.qty) } : l));
            return [...prev, { ...line, qty: Math.min(MAX_QTY, line.qty) }];
        });
    }, []);

    const setQty = useCallback((key: string, qty: number) => {
        setLines((prev) => prev.map((l) => (lineKey(l) === key ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)));
    }, []);

    const changeSize = useCallback((key: string, size: string) => {
        setLines((prev) => {
            const line = prev.find((l) => lineKey(l) === key);
            if (!line || line.size === size) return prev;
            const next = { ...line, size };
            const rest = prev.filter((l) => l !== line);
            const clash = rest.find((l) => lineKey(l) === lineKey(next));
            if (clash) return rest.map((l) => (l === clash ? { ...l, qty: Math.min(MAX_QTY, l.qty + next.qty) } : l));
            return prev.map((l) => (l === line ? next : l));
        });
    }, []);

    const removeLine = useCallback((key: string) => setLines((prev) => prev.filter((l) => lineKey(l) !== key)), []);
    const clear = useCallback(() => setLines([]), []);

    const value = useMemo<CartValue>(() => {
        const items = lines
            .map((line) => ({ line, product: getProduct(line.id), key: lineKey(line) }))
            .filter((i): i is CartItem => !!i.product);
        return {
            items,
            count: items.reduce((n, i) => n + i.line.qty, 0),
            subtotal: items.reduce((s, i) => s + priceOf(i.product) * i.line.qty, 0),
            addItem,
            setQty,
            changeSize,
            removeLine,
            clear,
        };
    }, [lines, addItem, setQty, changeSize, removeLine, clear]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
    return ctx;
}