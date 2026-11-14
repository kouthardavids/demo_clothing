import { supabase } from "../supabase.js";

export type OrderItemInput = {
    variant_id: number | null;
    product_id: number;
    product_name: string;
    size: string;
    color: string;
    unit_price_cents: number;
    qty: number;
};

export type CreateOrderInput = {
    user_id?: string | null;
    email: string;
    shipping_method: "standard" | "express";
    ship_name: string;
    ship_phone?: string | null;
    ship_street: string;
    ship_suburb: string;
    ship_city: string;
    ship_province: string;
    ship_postal: string;
    items: OrderItemInput[];
    payment_provider?: string | null;
    payment_ref?: string | null;
};

const SHIPPING_CENTS: Record<CreateOrderInput["shipping_method"], number> = {
    standard: 6000,
    express: 12000,
};
const FREE_SHIPPING_AT_CENTS = 100000;

const shippingForCents = (
    method: CreateOrderInput["shipping_method"],
    subtotal: number
): number => {
    if (method === "standard" && subtotal >= FREE_SHIPPING_AT_CENTS) return 0;
    return SHIPPING_CENTS[method];
};

const newOrderNumber = (): string => {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const n = BigInt(
        "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    );
    const code = (n % 2821109907456n).toString(36).toUpperCase().padStart(8, "0");
    return `OrderNumber-${code}`;
};

const addVariantId = async (
    productId: number,
    size: string,
    color: string
): Promise<number | null> => {
    const { data, error } = await supabase
        .from("product_variants")
        .select("id")
        .eq("product_id", productId)
        .eq("size", size)
        .eq("color", color)
        .maybeSingle();

    if (error) return null;
    return data?.id ?? null;
};

const getStock = async (variantId: number): Promise<number | null> => {
    const { data, error } = await supabase
        .from("product_variants")
        .select("stock")
        .eq("id", variantId)
        .maybeSingle();

    if (error || !data) return null;
    return data.stock;
};

export const createOrder = async (input: CreateOrderInput) => {
    if (!input.items.length) throw new Error("Order has no items");

    const subtotal_cents = input.items.reduce(
        (n, it) => n + it.unit_price_cents * it.qty,
        0
    );
    const shipping_cents = shippingForCents(input.shipping_method, subtotal_cents);
    const total_cents = subtotal_cents + shipping_cents;

    const resolvedItems = await Promise.all(
        input.items.map(async (it) => ({
            ...it,
            variant_id:
                it.variant_id ??
                (await addVariantId(it.product_id, it.size, it.color)),
        }))
    );

    for (const it of resolvedItems) {
        if (it.variant_id == null) continue;

        const stock = await getStock(it.variant_id);
        if (stock == null) {
            throw new Error(
                `Variant ${it.variant_id} no longer exists (${it.product_name}, size ${it.size})`
            );
        }
        if (stock < it.qty) {
            throw new Error(
                `Not enough stock for ${it.product_name} (size ${it.size}): only ${stock} left, you need ${it.qty}`
            );
        }
    }

    const number = newOrderNumber();

    const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
            number,
            user_id: input.user_id ?? null,
            email: input.email,
            status: "paid",
            shipping_method: input.shipping_method,
            subtotal_cents,
            shipping_cents,
            total_cents,
            ship_name: input.ship_name,
            ship_phone: input.ship_phone ?? null,
            ship_street: input.ship_street,
            ship_suburb: input.ship_suburb,
            ship_city: input.ship_city,
            ship_province: input.ship_province,
            ship_postal: input.ship_postal,
            payment_provider: input.payment_provider ?? "demo",
            payment_ref: input.payment_ref ?? null,
        })
        .select("id, number, created_at")
        .single();

    if (orderErr || !order) {
        throw new Error(orderErr?.message ?? "Could not create order");
    }

    const lines = resolvedItems.map((it) => ({
        order_id: order.id,
        variant_id: it.variant_id,
        product_name: it.product_name,
        size: it.size,
        color: it.color,
        unit_price_cents: it.unit_price_cents,
        qty: it.qty,
    }));

    const { error: itemsErr } = await supabase.from("order_items").insert(lines);
    if (itemsErr) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(itemsErr.message);
    }

    for (const it of resolvedItems) {
        if (it.variant_id == null) continue;

        const { error: stockErr } = await supabase.rpc("decrement_stock", {
            p_variant_id: it.variant_id,
            p_qty: it.qty,
        });

        if (stockErr) {
            console.error(
                `[orders] stock decrement failed for variant ${it.variant_id} (qty ${it.qty}):`,
                stockErr.message
            );
        }
    }

    return {
        id: order.id,
        number: order.number,
        created_at: order.created_at,
        subtotal_cents,
        shipping_cents,
        total_cents,
    };
};

// FIND ALL ORDERS
export type AdminOrderRow = {
    id: string;
    number: string;
    email: string;
    status: string;
    shipping_method: string;
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
    ship_name: string;
    ship_phone: string | null;
    ship_street: string;
    ship_suburb: string;
    ship_city: string;
    ship_province: string;
    ship_postal: string;
    payment_provider: string | null;
    payment_ref: string | null;
    created_at: string;
    order_items: {
        id: number;
        product_name: string;
        size: string;
        color: string;
        unit_price_cents: number;
        qty: number;
        image: string | null;
    }[];
};

export const findAllOrders = async (): Promise<AdminOrderRow[]> => {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            id, number, email, status, shipping_method,
            subtotal_cents, shipping_cents, total_cents,
            ship_name, ship_phone, ship_street, ship_suburb, ship_city,
            ship_province, ship_postal,
            payment_provider, payment_ref, created_at,
            order_items ( id, product_name, size, color, unit_price_cents, qty, variant_id )
        `)
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = data ?? [];

    // Fetch one image per variant referenced in the orders
    const variantIds = rows
        .flatMap((o: any) => (o.order_items ?? []).map((it: any) => it.variant_id))
        .filter((id: number | null): id is number => typeof id === "number");

    const imageByVariant = new Map<number, string>();
    if (variantIds.length) {
        const { data: variants, error: vErr } = await supabase
            .from("product_variants")
            .select("id, products(product_images(url, position))")
            .in("id", variantIds);
        if (vErr) throw new Error(vErr.message);

        for (const v of variants ?? []) {
            const images = ((v as any).products?.product_images ?? [])
                .slice()
                .sort((a: any, b: any) => a.position - b.position);
            if (images[0]?.url) imageByVariant.set((v as any).id, images[0].url);
        }
    }

    return rows.map((o: any) => ({
        ...o,
        order_items: (o.order_items ?? []).map((it: any) => ({
            id: it.id,
            product_name: it.product_name,
            size: it.size,
            color: it.color,
            unit_price_cents: it.unit_price_cents,
            qty: it.qty,
            image: it.variant_id ? (imageByVariant.get(it.variant_id) ?? null) : null,
        })),
    }));
};