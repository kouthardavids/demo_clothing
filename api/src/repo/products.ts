import { supabase } from "../supabase.js";

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

/* ---------- read ---------- */

export const allProducts = async () => {
    const { data, error } = await supabase
        .from("products")
        .select(`
            id, name, price_cents, old_price_cents, badge, is_active,
            categories(name),
            product_images(url, position),
            product_variants(id, size, color, sku, stock)
        `)
        .eq("is_active", true)
        .order("id");

    if (error) throw new Error(error.message);
    return data;
};

/* ---------- write helpers ---------- */

const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const ensureCategory = async (name: string): Promise<number> => {
    const slug = slugify(name);
    const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await supabase
        .from("categories")
        .insert({ name, slug })
        .select("id")
        .single();
    if (error || !data) throw new Error(error?.message ?? "Could not create category");
    return data.id;
};

const splitStock = (total: number, count: number): number[] => {
    if (count === 0) return [];
    const base = Math.floor(total / count);
    const extra = total % count;
    return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
};

const buildVariants = (
    productId: number,
    baseSku: string,
    sizes: string[],
    colors: string[],
    totalStock: number
) => {
    const combos = sizes.flatMap((size) =>
        colors.map((color, ci) => ({ size, color, ci: ci + 1 }))
    );
    const stocks = splitStock(totalStock, combos.length);
    return combos.map((c, i) => ({
        product_id: productId,
        size: c.size,
        color: c.color,
        sku: `${baseSku}-${c.size}-${c.ci}`,
        stock: stocks[i],
    }));
};

export const createProduct = async (input: ProductInput) => {
    if (!input.sizes.length || !input.colors.length) {
        throw new Error("Add at least one size and one colour");
    }
    const category_id = await ensureCategory(input.category);
    const slug = `${slugify(input.sku)}-${Date.now().toString(36)}`;

    const { data: product, error } = await supabase
        .from("products")
        .insert({
            category_id,
            name: input.name,
            slug,
            description: input.description,
            price_cents: input.price_cents,
            old_price_cents: input.old_price_cents,
            badge: input.badge,
            is_active: input.active,
        })
        .select("id")
        .single();
    if (error || !product) throw new Error(error?.message ?? "Could not create product");

    if (input.image) {
        await supabase.from("product_images").insert({
            product_id: product.id,
            url: input.image,
            kind: "front",
            position: 0,
        });
    }

    const variants = buildVariants(product.id, input.sku, input.sizes, input.colors, input.stock);
    const { error: varErr } = await supabase.from("product_variants").insert(variants);
    if (varErr) {
        await supabase.from("products").delete().eq("id", product.id);
        throw new Error(varErr.message);
    }

    return { id: product.id };
};

export const updateProduct = async (id: number, input: ProductInput) => {
    if (!input.sizes.length || !input.colors.length) {
        throw new Error("Add at least one size and one colour");
    }
    const category_id = await ensureCategory(input.category);

    const { error: pErr } = await supabase
        .from("products")
        .update({
            category_id,
            name: input.name,
            description: input.description,
            price_cents: input.price_cents,
            old_price_cents: input.old_price_cents,
            badge: input.badge,
            is_active: input.active,
        })
        .eq("id", id);
    if (pErr) throw new Error(pErr.message);

    if (input.image) {
        await supabase.from("product_images").delete().eq("product_id", id);
        await supabase.from("product_images").insert({
            product_id: id,
            url: input.image,
            kind: "front",
            position: 0,
        });
    }

    // Rebuild variants to match the edited sizes/colors/stock
    await supabase.from("product_variants").delete().eq("product_id", id);
    const variants = buildVariants(id, input.sku, input.sizes, input.colors, input.stock);
    const { error: varErr } = await supabase.from("product_variants").insert(variants);
    if (varErr) throw new Error(varErr.message);

    return { id };
};

export const deleteProduct = async (id: number) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return { id };
};