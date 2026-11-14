import { priceOf } from "./cart";
import type { CartItem, ShippingMethod } from "./cart";

const API_URL = import.meta.env.VITE_API_URL;

export type CheckoutInfo = {
    email: string;
    first: string;
    last: string;
    phone: string;
    street: string;
    suburb: string;
    city: string;
    province: string;
    postal: string;
};

export type PlacedOrder = {
    id: string;
    number: string;
    created_at: string;
    subtotal_cents: number;
    shipping_cents: number;
    total_cents: number;
};

export const placeOrder = async (args: {
    items: CartItem[];
    info: CheckoutInfo;
    method: ShippingMethod;
    paymentRef: string;
}): Promise<PlacedOrder> => {
    const body = {
        email: args.info.email,
        shipping_method: args.method,
        ship_name: `${args.info.first} ${args.info.last}`.trim(),
        ship_phone: args.info.phone || null,
        ship_street: args.info.street,
        ship_suburb: args.info.suburb,
        ship_city: args.info.city,
        ship_province: args.info.province,
        ship_postal: args.info.postal,
        items: args.items.map(({ product, line }) => ({
            variant_id: null,
            product_id: product.id,
            product_name: product.name,
            size: line.size,
            color: line.color,
            unit_price_cents: Math.round(priceOf(product) * 100),
            qty: line.qty,
        })),
        payment_provider: "demo",
        payment_ref: args.paymentRef,
    };

    const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Could not place order");
    }
    return res.json();
};

export type AdminOrderItem = {
    id: number;
    product_name: string;
    size: string;
    color: string;
    unit_price_cents: number;
    qty: number;
    image: string | null;
};

export type AdminOrder = {
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
    order_items: AdminOrderItem[];
};

export const fetchOrders = async (): Promise<AdminOrder[]> => {
    const res = await fetch(`${API_URL}/api/orders`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Could not load orders");
    }
    return res.json();
};