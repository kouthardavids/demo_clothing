export type ProductVariant = {
    id: number;
    size: string;
    color: string;
    sku: string;
    stock: number;
};

export type Product = {
    id: number;
    name: string;
    label: string;
    price: string;
    oldPrice?: string;
    badge?: string;
    image: string;
    images?: string[];
    tone: string;
    colors: string[];
    sizes: string[];
    category: string;
    sku: string;
    tags: string[];
    stock: number;
    rating: number;
    reviewCount: number;
    variants: ProductVariant[];
    isActive: boolean;
    description: string;
};

const API_URL = import.meta.env.VITE_API_URL;

let PRODUCTS: Product[] = [];
let inflight: Promise<Product[]> | null = null;

const mapRow = (r: any): Product => {
    const variants = r.product_variants ?? [];
    const images = (r.product_images ?? [])
        .slice()
        .sort((a: any, b: any) => a.position - b.position);

    return {
        id: r.id,
        name: r.name,
        label: r.name.toLowerCase(),
        price: `R${(r.price_cents / 100).toLocaleString("en-ZA")}`,
        oldPrice: r.old_price_cents
            ? `R${(r.old_price_cents / 100).toLocaleString("en-ZA")}`
            : undefined,
        badge: r.badge ?? undefined,
        image: images[0]?.url ?? "",
        images: images.map((i: any) => i.url),
        tone: "#e4ddd3",
        colors: [...new Set(variants.map((v: any) => v.color))] as string[],
        sizes: [...new Set(variants.map((v: any) => v.size))] as string[],
        category: r.categories?.name ?? "",
        sku: (variants[0]?.sku ?? "").replace(/-[^-]+-\d+$/, ""),
        tags: [],
        stock: variants.reduce((n: number, v: any) => n + v.stock, 0),
        rating: 0,
        reviewCount: 0,
        variants: variants.map((v: any) => ({
            id: v.id,
            size: v.size,
            color: v.color,
            sku: v.sku,
            stock: v.stock,
        })),
        isActive: r.is_active ?? true,
        description: r.description ?? "",
    };
};

export const loadProducts = async (): Promise<Product[]> => {
    if (PRODUCTS.length > 0) return PRODUCTS;
    if (inflight) return inflight;

    inflight = fetch(`${API_URL}/api/products`)
        .then((res) => {
            if (!res.ok) throw new Error("Could not load products");
            return res.json();
        })
        .then((rows: any[]) => {
            PRODUCTS = rows.map(mapRow);
            return PRODUCTS;
        })
        .finally(() => { inflight = null; });

    return inflight;
};

export const getProducts = () => PRODUCTS;
export const getProduct = (id: number) => PRODUCTS.find((p) => p.id === id);


export type ProductInput = {
    name: string;
    sku: string;
    category: string;
    price_cents: number;
    old_price_cents: number | null;
    badge: string | null;
    description: string | null;
    image: string | null;
    tone: string | null;
    sizes: string[];
    colors: string[];
    stock: number;
    active: boolean;
};

const parseError = async (res: Response): Promise<string> => {
    const err = await res.json().catch(() => ({}));
    return err?.error ?? `Request failed (${res.status})`;
};

export const createProductApi = async (input: ProductInput): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
};

export const updateProductApi = async (id: number, input: ProductInput): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
};

export const deleteProductApi = async (id: number): Promise<{ id: number }> => {
    const res = await fetch(`${API_URL}/api/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await parseError(res));
    return res.json();
};

export const refreshProducts = async (): Promise<Product[]> => {
    PRODUCTS = [];
    return loadProducts();
};