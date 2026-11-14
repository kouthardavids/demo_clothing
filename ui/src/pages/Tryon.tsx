// Try on actions
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getProduct } from "../lib/products";

export type Outfit = {
    id: string;
    name: string;
    items: number[];
    savedAt: number;
};

type Stored = {
    closet: number[];
    selected: number[];
    outfits: Outfit[];
};

type SaveResult = { outfit: Outfit; created: boolean };

type TryOnContextValue = Stored & {
    inCloset: (id: number) => boolean;
    isSelected: (id: number) => boolean;
    addToCloset: (id: number) => void;
    removeFromCloset: (id: number) => void;
    toggleSelected: (id: number) => void;
    clearSelected: () => void;
    saveOutfit: () => SaveResult | null;
    wearOutfit: (id: string) => void;
    deleteOutfit: (id: string) => void;
};

const KEY = "demo-clothing:try-on:v1";
const EMPTY: Stored = { closet: [], selected: [], outfits: [] };

const known = (ids: unknown): number[] =>
    Array.isArray(ids)
        ? Array.from(new Set(ids.filter((n): n is number => typeof n === "number" && !!getProduct(n))))
        : [];

const isOutfit = (o: unknown): o is Outfit => {
    const x = o as Outfit;
    return !!x && typeof x.id === "string" && typeof x.name === "string" && Array.isArray(x.items) && typeof x.savedAt === "number";
};

function load(): Stored {
    if (typeof window === "undefined") return EMPTY;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return EMPTY;
        const parsed = JSON.parse(raw) as Partial<Stored>;
        const closet = known(parsed.closet);
        return {
            closet,
            selected: known(parsed.selected).filter((id) => closet.includes(id)),
            outfits: Array.isArray(parsed.outfits)
                ? parsed.outfits.filter(isOutfit).map((o) => ({ ...o, items: known(o.items) })).filter((o) => o.items.length > 0)
                : [],
        };
    } catch {
        return EMPTY;
    }
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

const Ctx = createContext<TryOnContextValue | null>(null);

export function TryOnProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<Stored>(load);

    useEffect(() => {
        try {
            window.localStorage.setItem(KEY, JSON.stringify(state));
        } catch {
            /* storage full or blocked, the closet still works for this visit */
        }
    }, [state]);

    const addToCloset = useCallback((id: number) => {
        if (!getProduct(id)) return;
        setState((s) => ({
            ...s,
            closet: s.closet.includes(id) ? s.closet : [...s.closet, id],
            selected: s.selected.includes(id) ? s.selected : [...s.selected, id],
        }));
    }, []);

    const removeFromCloset = useCallback((id: number) => {
        setState((s) => ({
            ...s,
            closet: s.closet.filter((x) => x !== id),
            selected: s.selected.filter((x) => x !== id),
        }));
    }, []);

    const toggleSelected = useCallback((id: number) => {
        setState((s) => {
            if (!s.closet.includes(id)) return s;
            return {
                ...s,
                selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id],
            };
        });
    }, []);

    const clearSelected = useCallback(() => setState((s) => ({ ...s, selected: [] })), []);

    const saveOutfit = useCallback((): SaveResult | null => {
        if (state.selected.length === 0) return null;

        const existing = state.outfits.find((o) => sameSet(o.items, state.selected));
        if (existing) return { outfit: existing, created: false };

        const used = new Set(state.outfits.map((o) => o.name));
        let n = 1;
        while (used.has(`Outfit ${n}`)) n += 1;

        const outfit: Outfit = {
            id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name: `Outfit ${n}`,
            items: [...state.selected],
            savedAt: Date.now(),
        };
        setState((s) => ({ ...s, outfits: [outfit, ...s.outfits] }));
        return { outfit, created: true };
    }, [state.selected, state.outfits]);

    const wearOutfit = useCallback((id: string) => {
        setState((s) => {
            const outfit = s.outfits.find((o) => o.id === id);
            if (!outfit) return s;
            return {
                ...s,
                closet: Array.from(new Set([...s.closet, ...outfit.items])),
                selected: [...outfit.items],
            };
        });
    }, []);

    const deleteOutfit = useCallback((id: string) => {
        setState((s) => ({ ...s, outfits: s.outfits.filter((o) => o.id !== id) }));
    }, []);

    const value = useMemo<TryOnContextValue>(
        () => ({
            ...state,
            inCloset: (id) => state.closet.includes(id),
            isSelected: (id) => state.selected.includes(id),
            addToCloset,
            removeFromCloset,
            toggleSelected,
            clearSelected,
            saveOutfit,
            wearOutfit,
            deleteOutfit,
        }),
        [state, addToCloset, removeFromCloset, toggleSelected, clearSelected, saveOutfit, wearOutfit, deleteOutfit]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTryOn(): TryOnContextValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useTryOn must be used inside <TryOnProvider>");
    return ctx;
}