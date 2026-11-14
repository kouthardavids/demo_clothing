import { useCallback, useEffect, useState } from "react";
import type { CartItem } from "./cart";
import { priceOf } from "./cart";

export type Profile = { first: string; last: string; email: string; phone: string; size: string; marketing: boolean };
export type Address = {
    id: string;
    label: string;
    street: string;
    suburb: string;
    city: string;
    province: string;
    postal: string;
    isDefault: boolean;
};
export type OrderLine = { id: number; name: string; image: string; tone: string; size: string; color: string; qty: number; price: number };
export type OrderRecord = {
    number: string;
    placedAt: number;
    method: string;
    subtotal: number;
    shipping: number;
    total: number;
    items: OrderLine[];
};
export type Account = { profile: Profile; addresses: Address[]; orders: OrderRecord[] };

const KEY = "demo-clothing:account:v1";
const EMPTY: Account = {
    profile: { first: "", last: "", email: "", phone: "", size: "", marketing: false },
    addresses: [],
    orders: [],
};

export function loadAccount(): Account {
    if (typeof window === "undefined") return EMPTY;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return EMPTY;
        const p = JSON.parse(raw) as Partial<Account>;
        return {
            profile: { ...EMPTY.profile, ...(p.profile ?? {}) },
            addresses: Array.isArray(p.addresses) ? p.addresses : [],
            orders: Array.isArray(p.orders) ? p.orders : [],
        };
    } catch {
        return EMPTY;
    }
}

function writeAccount(a: Account) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(a));
    } catch {
        /* storage blocked: keeps working for this visit */
    }
}

/** Called by the checkout when an order is placed. Writes straight to storage. */
export function saveOrder(o: {
    number: string;
    method: string;
    subtotal: number;
    shipping: number;
    total: number;
    items: CartItem[];
}) {
    const acc = loadAccount();
    const record: OrderRecord = {
        number: o.number,
        placedAt: Date.now(),
        method: o.method,
        subtotal: o.subtotal,
        shipping: o.shipping,
        total: o.total,
        items: o.items.map(({ product: p, line }) => ({
            id: p.id,
            name: p.name,
            image: p.image,
            tone: p.tone,
            size: line.size,
            color: line.color,
            qty: line.qty,
            price: priceOf(p),
        })),
    };
    writeAccount({ ...acc, orders: [record, ...acc.orders] });
}

export function useAccount() {
    const [account, setAccount] = useState<Account>(loadAccount);

    useEffect(() => writeAccount(account), [account]);

    const saveProfile = useCallback((profile: Profile) => setAccount((a) => ({ ...a, profile })), []);

    const saveAddress = useCallback((addr: Address) => {
        setAccount((a) => {
            let list = a.addresses.some((x) => x.id === addr.id)
                ? a.addresses.map((x) => (x.id === addr.id ? addr : x))
                : [...a.addresses, addr];
            // first address is the default; only one default at a time
            if (list.length === 1) list = [{ ...list[0], isDefault: true }];
            if (addr.isDefault) list = list.map((x) => ({ ...x, isDefault: x.id === addr.id }));
            return { ...a, addresses: list };
        });
    }, []);

    const removeAddress = useCallback((id: string) => {
        setAccount((a) => {
            const list = a.addresses.filter((x) => x.id !== id);
            if (list.length > 0 && !list.some((x) => x.isDefault)) list[0] = { ...list[0], isDefault: true };
            return { ...a, addresses: list };
        });
    }, []);

    const makeDefault = useCallback(
        (id: string) => setAccount((a) => ({ ...a, addresses: a.addresses.map((x) => ({ ...x, isDefault: x.id === id })) })),
        []
    );

    const reset = useCallback(() => setAccount(EMPTY), []);

    return { account, saveProfile, saveAddress, removeAddress, makeDefault, reset };
}