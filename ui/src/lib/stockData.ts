import type { Product } from "./products";

export type VariantStock = { size: string; color: string; stock: number };
export type Level = "out" | "low" | "ok";

export type StockProduct = {
    id: number;
    name: string;
    image: string;
    tone: string;
    sku: string;
    category: string;
    variants: VariantStock[];
    sizes: string[];
    colors: { color: string; units: number }[];
    total: number;
};

export const LOW_PRODUCT = 15;
export const LOW_VARIANT = 1;

export const LEVEL_COLOR: Record<Level, string> = {
    out: "#dc2626",
    low: "#d97706",
    ok: "#059669",
};
export const LEVEL_LABEL: Record<Level, string> = {
    out: "Out of stock",
    low: "Low stock",
    ok: "In stock",
};

export const levelOf = (total: number): Level =>
    total <= 0 ? "out" : total <= LOW_PRODUCT ? "low" : "ok";

const NAMES: Record<string, string> = {
    "#d9cfc0": "Sand", "#2b2b2b": "Charcoal", "#d8b8b0": "Blush", "#efe9e0": "Ivory",
    "#7b8a99": "Slate", "#4f6f8f": "Denim", "#3d6d99": "Blue", "#1f1f1f": "Black",
    "#d8d6d0": "Stone", "#8a9a7b": "Sage", "#1f2430": "Navy", "#3d3f44": "Graphite", "#a8a8a6": "Grey",
};
export const colorName = (hex: string) => NAMES[hex.toLowerCase()] ?? hex.toUpperCase();

export function buildStock(products: Product[]): StockProduct[] {
    return products.map((p) => {
        const variants: VariantStock[] = p.variants.map((v) => ({
            size: v.size,
            color: v.color,
            stock: v.stock,
        }));

        const colorUnits = new Map<string, number>();
        for (const v of variants) {
            colorUnits.set(v.color, (colorUnits.get(v.color) ?? 0) + v.stock);
        }

        return {
            id: p.id,
            name: p.name,
            image: p.image,
            tone: p.tone,
            sku: p.sku,
            category: p.category,
            variants,
            sizes: p.sizes,
            colors: [...colorUnits.entries()].map(([color, units]) => ({ color, units })),
            total: variants.reduce((n, v) => n + v.stock, 0),
        };
    });
}