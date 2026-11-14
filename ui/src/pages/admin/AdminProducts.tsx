import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
    getProducts,
    loadProducts,
    createProductApi,
    updateProductApi,
    deleteProductApi,
    refreshProducts,
} from "../../lib/products";
import type { Product, ProductInput } from "../../lib/products";
import { money } from "../../lib/cart";
import { LEVEL_COLOR, LEVEL_LABEL, colorName, levelOf } from "../../lib/stockData";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const PAGE_SIZE = 8;
const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const CSS = `
@keyframes pr-toast { 0% { opacity: 0; transform: translate(-50%, 8px) } 10%, 85% { opacity: 1; transform: translate(-50%, 0) } 100% { opacity: 0; transform: translate(-50%, 4px) } }
.pr-toast { animation: pr-toast 2.2s ease forwards }
.pr-scroll { scrollbar-width: none }
.pr-scroll::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) { .pr-toast { animation: none } }
`;

type Row = {
    id: number | null;
    uid: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    oldPrice: number | null;
    badge: string;
    image: string;
    tone: string;
    colors: string[];
    sizes: string[];
    stock: number;
    active: boolean;
    description: string;
};

const num = (v: unknown) => Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;

const toRow = (p: Product): Row => ({
    id: p.id,
    uid: `p${p.id}`,
    name: p.name,
    sku: p.sku,
    category: p.category,
    price: num(p.price),
    oldPrice: p.oldPrice ? num(p.oldPrice) : null,
    badge: p.badge ?? "",
    image: p.image,
    tone: p.tone,
    colors: p.colors ?? [],
    sizes: p.sizes ?? [],
    stock: p.stock ?? 0,
    active: p.isActive,
    description: p.description ?? "",
});

type Form = {
    name: string;
    sku: string;
    category: string;
    price: string;
    oldPrice: string;
    badge: string;
    stock: string;
    description: string;
    active: boolean;
    image: string;
    tone: string;
    sizes: string[];
    colors: string[];
};

const blankForm = (): Form => ({
    name: "", sku: "", category: "", price: "", oldPrice: "", badge: "", stock: "0",
    description: "", active: true, image: "", tone: "#e4ddd3", sizes: [], colors: [],
});

const toForm = (r: Row): Form => ({
    name: r.name, sku: r.sku, category: r.category, price: String(r.price),
    oldPrice: r.oldPrice ? String(r.oldPrice) : "", badge: r.badge, stock: String(r.stock),
    description: r.description, active: r.active, image: r.image, tone: r.tone,
    sizes: r.sizes, colors: r.colors,
});

const formToInput = (f: Form): ProductInput => ({
    name: f.name.trim(),
    sku: f.sku.trim(),
    category: f.category.trim(),
    price_cents: Math.round(num(f.price) * 100),
    old_price_cents: f.oldPrice ? Math.round(num(f.oldPrice) * 100) : null,
    badge: f.badge.trim() || null,
    description: f.description.trim() || null,
    image: f.image || null,
    tone: f.tone || null,
    sizes: f.sizes,
    colors: f.colors,
    stock: Number(f.stock) || 0,
    active: f.active,
});

type Sort = "newest" | "name" | "price-low" | "price-high" | "stock-low" | "stock-high";
const SORTS: { value: Sort; label: string }[] = [
    { value: "newest", label: "Default order" },
    { value: "name", label: "Name A to Z" },
    { value: "price-low", label: "Price: low to high" },
    { value: "price-high", label: "Price: high to low" },
    { value: "stock-low", label: "Stock: lowest first" },
    { value: "stock-high", label: "Stock: highest first" },
];

type StatusFilter = "all" | "active" | "draft" | "out";
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "draft", label: "Draft" },
    { value: "out", label: "Out of stock" },
];

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

function Stat({ label, value, icon, delay }: { label: string; value: number; icon: ReactNode; delay: number }) {
    return (
        <div className="ad-reveal flex items-center justify-between rounded-2xl bg-white p-5" style={d(delay)}>
            <div>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-neutral-500">{label}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f3f2]">{icon}</span>
        </div>
    );
}

const Swatch = ({ color, size = 14 }: { color: string; size?: number }) => (
    <span className="inline-block shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color, width: size, height: size }} />
);

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={label}
            onClick={() => onChange(!on)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${on ? "bg-neutral-900" : "bg-neutral-300"}`}
        >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-300 ${on ? "translate-x-5" : ""}`} />
        </button>
    );
}

const fieldCls = (err?: string) =>
    `h-11 w-full rounded-md border bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 ${err ? "border-red-400" : "border-neutral-300 hover:border-neutral-400"
    }`;

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: ReactNode; className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="text-xs text-neutral-500">{label}</span>
            <div className="mt-1.5">{children}</div>
            {error && <span className="mt-1 block text-xs text-red-600" role="alert">{error}</span>}
        </label>
    );
}

function Drawer({
    title,
    initial,
    categories,
    onClose,
    onSave,
}: {
    title: string;
    initial: Form;
    categories: string[];
    onClose: () => void;
    onSave: (f: Form) => void;
}) {
    const [f, setF] = useState<Form>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [shown, setShown] = useState(false);
    const [sizeInput, setSizeInput] = useState("");
    const [colorInput, setColorInput] = useState("#1f1f1f");
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const id = window.requestAnimationFrame(() => setShown(true));
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.cancelAnimationFrame(id);
            document.body.style.overflow = prev;
        };
    }, []);

    const close = () => {
        setShown(false);
        window.setTimeout(onClose, 300);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setF((s) => ({ ...s, [k]: e.target.value }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    const allSizes = Array.from(new Set([...PRESET_SIZES, ...f.sizes]));
    const toggleSize = (s: string) => setF((x) => ({ ...x, sizes: x.sizes.includes(s) ? x.sizes.filter((v) => v !== s) : [...x.sizes, s] }));
    const addSize = () => {
        const v = sizeInput.trim().toUpperCase();
        if (v && !f.sizes.includes(v)) setF((x) => ({ ...x, sizes: [...x.sizes, v] }));
        setSizeInput("");
    };
    const addColor = () => setF((x) => (x.colors.includes(colorInput) ? x : { ...x, colors: [...x.colors, colorInput] }));

    const onFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file && file.type.startsWith("image/")) setF((x) => ({ ...x, image: URL.createObjectURL(file) }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (!f.name.trim()) er.name = "Give the product a name.";
        if (!f.sku.trim()) er.sku = "Add a SKU.";
        if (!f.category.trim()) er.category = "Choose or type a category.";
        if (!(num(f.price) > 0)) er.price = "Enter a price above 0.";
        if (f.oldPrice && num(f.oldPrice) <= num(f.price)) er.oldPrice = "Should be higher than the price.";
        if (!/^\d+$/.test(f.stock)) er.stock = "Whole number, 0 or more.";
        if (f.sizes.length === 0) er.sizes = "Add at least one size.";
        if (f.colors.length === 0) er.colors = "Add at least one colour.";
        setErrors(er);
        if (Object.keys(er).length) return;
        setShown(false);
        window.setTimeout(() => onSave(f), 250);
    };

    return (
        <div className="fixed inset-0 z-50">
            <div onClick={close} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-white shadow-xl transition-transform duration-500 ${shown ? "translate-x-0" : "translate-x-full"}`}
                style={{ transitionTimingFunction: EASE }}
            >
                <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
                    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                    <button type="button" aria-label="Close" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-100">
                        <Svg size={16}><path d="M6 6l12 12M18 6 6 18" /></Svg>
                    </button>
                </div>

                <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
                    <div className="pr-scroll flex-1 space-y-8 overflow-y-auto px-6 py-6">
                        <section>
                            <p className="text-xs font-medium text-neutral-500">Image</p>
                            <div className="mt-3 flex items-center gap-4">
                                <span className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl" style={{ backgroundColor: f.tone }}>
                                    {f.image ? (
                                        <img src={f.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                                    ) : (
                                        <span className="text-neutral-400"><Svg size={24}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m21 16-5-5-8 8" /></Svg></span>
                                    )}
                                </span>
                                <div>
                                    <button type="button" onClick={() => fileRef.current?.click()} className="h-10 rounded-full bg-[#f4f3f2] px-5 text-xs font-medium transition-colors hover:bg-neutral-200">
                                        {f.image ? "Replace image" : "Upload image"}
                                    </button>
                                    <p className="mt-2 text-xs text-neutral-400">PNG with a transparent background works best.</p>
                                </div>
                                <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="sr-only" tabIndex={-1} />
                            </div>
                        </section>

                        <section className="grid gap-4 sm:grid-cols-2">
                            <Field label="Name" error={errors.name} className="sm:col-span-2">
                                <input value={f.name} onChange={set("name")} className={fieldCls(errors.name)} />
                            </Field>
                            <Field label="SKU" error={errors.sku}>
                                <input value={f.sku} onChange={set("sku")} placeholder="DC-1006" className={fieldCls(errors.sku)} />
                            </Field>
                            <Field label="Category" error={errors.category}>
                                <input list="pr-cats" value={f.category} onChange={set("category")} className={fieldCls(errors.category)} />
                                <datalist id="pr-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                            </Field>
                            <Field label="Description" className="sm:col-span-2">
                                <textarea rows={3} value={f.description} onChange={set("description")} placeholder="A short description shown on the product page." className={`${fieldCls()} h-auto resize-none py-3 leading-relaxed`} />
                            </Field>
                        </section>

                        <section>
                            <p className="text-xs font-medium text-neutral-500">Pricing and stock</p>
                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                <Field label="Price (R)" error={errors.price}>
                                    <input inputMode="decimal" value={f.price} onChange={set("price")} className={fieldCls(errors.price)} />
                                </Field>
                                <Field label="Old price (R), optional" error={errors.oldPrice}>
                                    <input inputMode="decimal" value={f.oldPrice} onChange={set("oldPrice")} className={fieldCls(errors.oldPrice)} />
                                </Field>
                                <Field label="Total units in stock" error={errors.stock}>
                                    <input inputMode="numeric" value={f.stock} onChange={set("stock")} className={fieldCls(errors.stock)} />
                                </Field>
                                <Field label="Badge, optional">
                                    <input value={f.badge} onChange={set("badge")} placeholder="-20%, New" className={fieldCls()} />
                                </Field>
                            </div>
                        </section>

                        <section>
                            <p className="text-xs font-medium text-neutral-500">Sizes</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {allSizes.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        aria-pressed={f.sizes.includes(s)}
                                        onClick={() => toggleSize(s)}
                                        className={`h-9 min-w-[2.75rem] rounded border px-3 text-xs transition-colors ${f.sizes.includes(s) ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-300 text-neutral-700 hover:border-neutral-900"}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            {errors.sizes && <p className="mt-2 text-xs text-red-600">{errors.sizes}</p>}
                            <div className="mt-3 flex gap-2">
                                <input
                                    value={sizeInput}
                                    onChange={(e) => setSizeInput(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
                                    placeholder="Add another, e.g. 32"
                                    className={`${fieldCls()} max-w-[12rem]`}
                                />
                                <button type="button" onClick={addSize} className="h-11 rounded-md border border-neutral-900 px-4 text-xs font-medium transition-colors hover:bg-neutral-900 hover:text-white">Add</button>
                            </div>
                        </section>

                        <section>
                            <p className="text-xs font-medium text-neutral-500">Colours</p>
                            {f.colors.length > 0 && (
                                <ul className="mt-3 flex flex-wrap gap-2">
                                    {f.colors.map((c) => (
                                        <li key={c} className="flex items-center gap-2 rounded-full bg-[#f4f3f2] py-1.5 pl-2 pr-1.5 text-xs">
                                            <Swatch color={c} size={16} />
                                            {colorName(c)}
                                            <button type="button" aria-label={`Remove ${colorName(c)}`} onClick={() => setF((x) => ({ ...x, colors: x.colors.filter((v) => v !== c) }))} className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900">
                                                <Svg size={11}><path d="M6 6l12 12M18 6 6 18" /></Svg>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {errors.colors && <p className="mt-2 text-xs text-red-600">{errors.colors}</p>}
                            <div className="mt-3 flex items-center gap-2">
                                <input type="color" aria-label="Pick a colour" value={colorInput} onChange={(e) => setColorInput(e.target.value)} className="h-11 w-14 cursor-pointer rounded-md border border-neutral-300 bg-white p-1" />
                                <button type="button" onClick={addColor} className="h-11 rounded-md border border-neutral-900 px-4 text-xs font-medium transition-colors hover:bg-neutral-900 hover:text-white">Add colour</button>
                            </div>
                        </section>

                        <section className="flex items-center justify-between rounded-2xl bg-[#f4f3f2] p-4">
                            <div>
                                <p className="text-sm font-medium">Show in the shop</p>
                                <p className="text-xs text-neutral-500">Turn off to keep it as a draft.</p>
                            </div>
                            <Toggle on={f.active} onChange={(v) => setF((x) => ({ ...x, active: v }))} label="Show in the shop" />
                        </section>
                    </div>

                    <div className="flex gap-3 border-t border-neutral-200 px-6 py-4">
                        <button type="button" onClick={close} className="h-12 rounded-md border border-neutral-900 px-6 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white">Cancel</button>
                        <button type="submit" className="h-12 flex-1 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900">
                            Save product
                        </button>
                    </div>
                </form>
            </aside>
        </div>
    );
}

export default function AdminProducts() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [category, setCategory] = useState("All");
    const [status, setStatus] = useState<StatusFilter>("all");
    const [sort, setSort] = useState<Sort>("newest");
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<Row | "new" | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

    const say = (text: string) => setToast({ id: Date.now(), text });

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [toast]);

    // Initial load — uses cache if another page already fetched
    useEffect(() => {
        let alive = true;
        const cached = getProducts();
        if (cached.length > 0) {
            setRows(cached.map(toRow));
            setLoading(false);
            return;
        }
        loadProducts()
            .then((list) => { if (alive) setRows(list.map(toRow)); })
            .catch((err) => { if (alive) setError(err instanceof Error ? err.message : "Could not load products"); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    const reload = async () => {
        try {
            const list = await refreshProducts();
            setRows(list.map(toRow));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not refresh products");
        }
    };

    const categories = useMemo(
        () => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(),
        [rows]
    );

    const totals = useMemo(
        () => ({
            all: rows.length,
            active: rows.filter((r) => r.active).length,
            draft: rows.filter((r) => !r.active).length,
            out: rows.filter((r) => r.stock <= 0).length,
        }),
        [rows]
    );

    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const out = rows.filter(
            (r) =>
                (category === "All" || r.category === category) &&
                (status === "all" || (status === "active" && r.active) || (status === "draft" && !r.active) || (status === "out" && r.stock <= 0)) &&
                (!needle || [r.name, r.sku, r.category].some((v) => v.toLowerCase().includes(needle)))
        );
        if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
        if (sort === "price-low") out.sort((a, b) => a.price - b.price);
        if (sort === "price-high") out.sort((a, b) => b.price - a.price);
        if (sort === "stock-low") out.sort((a, b) => a.stock - b.stock);
        if (sort === "stock-high") out.sort((a, b) => b.stock - a.stock);
        return out;
    }, [rows, q, category, status, sort]);

    useEffect(() => setPage(1), [q, category, status, sort]);

    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const visible = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

    // Save — POST (new) or PUT (edit), then refresh from API
    const save = async (f: Form) => {
        setSaving(true);
        setError(null);
        try {
            const payload = formToInput(f);
            if (editing === "new") {
                await createProductApi(payload);
                say("Product added");
            } else if (editing) {
                const id = (editing as Row).id;
                if (id == null) throw new Error("Missing product id");
                await updateProductApi(id, payload);
                say("Changes saved");
            }
            await reload();
            setEditing(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save product");
        } finally {
            setSaving(false);
        }
    };

    // Delete — DELETE, then refresh from API
    const remove = async (row: Row) => {
        if (row.id == null) return;
        setConfirmId(null);
        setSaving(true);
        setError(null);
        try {
            await deleteProductApi(row.id);
            say("Product deleted");
            await reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete product");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <style>{CSS}</style>

            <div className="ad-reveal flex flex-wrap items-end justify-between gap-4" style={d(0.05)}>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Products</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        {loading ? "Loading…" : "Everything you sell. Changes are saved to the store."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditing("new")}
                    disabled={saving}
                    className="flex h-10 items-center gap-2 rounded-full bg-neutral-900 px-5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
                >
                    <Svg size={14}><path d="M12 5v14M5 12h14" /></Svg>
                    Add product
                </button>
            </div>

            {error && (
                <p className="ad-reveal mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {error}
                </p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat delay={0.1} label="Total products" value={totals.all} icon={<Svg><path d="M20 12 12 20 4 12V4h8l8 8Z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>} />
                <Stat delay={0.14} label="Live in shop" value={totals.active} icon={<Svg><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>} />
                <Stat delay={0.18} label="Drafts" value={totals.draft} icon={<Svg><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>} />
                <Stat delay={0.22} label="Out of stock" value={totals.out} icon={<Svg><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></Svg>} />
            </div>

            <section className="ad-reveal mt-4 rounded-2xl bg-white p-5 md:p-6" style={d(0.26)}>
                <div className="flex flex-wrap items-center gap-3">
                    <label className="relative min-w-[14rem] flex-1 md:max-w-xs">
                        <span className="sr-only">Search products</span>
                        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                        </svg>
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU or category" className="h-10 w-full rounded-full bg-[#f4f3f2] pl-11 pr-4 text-xs outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900" />
                    </label>

                    <label>
                        <span className="sr-only">Category</span>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 cursor-pointer rounded-full bg-[#f4f3f2] px-4 text-xs font-medium outline-none hover:bg-neutral-200">
                            <option value="All">All categories</option>
                            {categories.map((c) => <option key={c}>{c}</option>)}
                        </select>
                    </label>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                        {STATUS_FILTERS.map((s) => (
                            <button key={s.value} type="button" aria-pressed={status === s.value} onClick={() => setStatus(s.value)} className={`h-10 rounded-full px-4 text-xs font-medium transition-colors ${status === s.value ? "bg-neutral-900 text-white" : "bg-[#f4f3f2] hover:bg-neutral-200"}`}>
                                {s.label}
                            </button>
                        ))}
                    </div>

                    <label className="ml-auto">
                        <span className="sr-only">Sort</span>
                        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 cursor-pointer rounded-full bg-[#f4f3f2] px-4 text-xs font-medium outline-none hover:bg-neutral-200">
                            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </label>
                </div>

                <div className="mt-6 overflow-x-auto">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 animate-pulse rounded-xl bg-[#f4f3f2]" />
                            ))}
                        </div>
                    ) : (
                        <table className="w-full min-w-[52rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                    {["Product", "Category", "Price", "Stock", ""].map((h, i) => (
                                        <th key={i} className={`pb-3 font-medium ${i === 4 ? "text-right" : ""}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((r) => {
                                    const level = levelOf(r.stock);
                                    const lc = LEVEL_COLOR[level];
                                    return (
                                        <tr key={r.uid} className="border-b border-neutral-100 transition-colors last:border-0 hover:bg-[#faf9f8]">
                                            <td className="py-4 pr-4">
                                                <span className="flex items-center gap-4">
                                                    <span className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg" style={{ backgroundColor: r.tone }}>
                                                        {r.image && <img src={r.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />}
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate font-medium">{r.name}</span>
                                                        <span className="block text-xs text-neutral-400">{r.sku}</span>
                                                        <span className="mt-1.5 flex items-center gap-1">
                                                            {r.colors.slice(0, 5).map((c) => <Swatch key={c} color={c} size={12} />)}
                                                            {r.colors.length > 5 && <span className="text-[10px] text-neutral-400">+{r.colors.length - 5}</span>}
                                                        </span>
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 text-neutral-600">{r.category}</td>
                                            <td className="py-4 pr-4">
                                                <span className="block font-semibold">{money(r.price)}</span>
                                                {r.oldPrice && <span className="block text-xs text-neutral-400 line-through">{money(r.oldPrice)}</span>}
                                                {r.badge && <span className="mt-1 inline-block rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">{r.badge}</span>}
                                            </td>
                                            <td className="py-4 pr-4">
                                                <span className="block font-medium">{r.stock}</span>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: lc }}>
                                                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lc }} />
                                                    {LEVEL_LABEL[level]}
                                                </span>
                                            </td>
                                            <td className="py-4 text-right">
                                                {confirmId === r.uid ? (
                                                    <span className="inline-flex items-center gap-2 text-xs">
                                                        <span className="text-neutral-500">Delete?</span>
                                                        <button type="button" onClick={() => remove(r)} disabled={saving} className="rounded-full bg-red-600 px-3 py-1.5 font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">Yes</button>
                                                        <button type="button" onClick={() => setConfirmId(null)} className="rounded-full bg-[#f4f3f2] px-3 py-1.5 font-medium transition-colors hover:bg-neutral-200">No</button>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1">
                                                        <button type="button" aria-label={`Edit ${r.name}`} onClick={() => setEditing(r)} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50">
                                                            <Svg size={16}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>
                                                        </button>
                                                        <button type="button" aria-label={`Delete ${r.name}`} onClick={() => setConfirmId(r.uid)} disabled={saving} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-red-600 disabled:opacity-50">
                                                            <Svg size={16}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Svg>
                                                        </button>
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {!loading && visible.length === 0 && (
                        <p className="rounded-xl bg-[#f4f3f2] px-6 py-12 text-center text-sm text-neutral-500">
                            {rows.length === 0 ? "No products yet. Add your first one." : "No products match these filters."}
                        </p>
                    )}
                </div>

                {pages > 1 && (
                    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-xs text-neutral-500">
                        <span>Page {current} of {pages}</span>
                        <div className="flex gap-2">
                            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="h-9 rounded-full bg-[#f4f3f2] px-4 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-40">Previous</button>
                            <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="h-9 rounded-full bg-[#f4f3f2] px-4 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-40">Next</button>
                        </div>
                    </nav>
                )}
            </section>

            {editing && (
                <Drawer
                    key={editing === "new" ? "new" : (editing as Row).uid}
                    title={editing === "new" ? "Add product" : "Edit product"}
                    initial={editing === "new" ? blankForm() : toForm(editing as Row)}
                    categories={categories}
                    onClose={() => setEditing(null)}
                    onSave={save}
                />
            )}

            {toast && (
                <p key={toast.id} role="status" className="pr-toast fixed bottom-6 left-1/2 z-[60] max-w-[90%] rounded-full bg-neutral-900 px-5 py-2.5 text-center text-xs font-medium text-white shadow-lg">
                    {toast.text}
                </p>
            )}
        </div>
    );
}