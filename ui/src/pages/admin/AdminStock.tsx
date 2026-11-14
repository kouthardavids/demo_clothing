import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { getProducts, loadProducts } from "../../lib/products";
import type { Product } from "../../lib/products";
import {
    LEVEL_COLOR, LEVEL_LABEL, LOW_PRODUCT, LOW_VARIANT,
    buildStock, colorName, levelOf,
} from "../../lib/stockData";
import type { Level, StockProduct } from "../../lib/stockData";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const CSS = `
.st-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s ${EASE} }
.st-acc[data-open="true"] { grid-template-rows: 1fr }
.st-acc > div { overflow: hidden; min-height: 0 }
.st-bar { transition: width 0.9s ${EASE} }
@media (prefers-reduced-motion: reduce) { .st-acc, .st-bar { transition: none } }
`;

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const sizeRank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i >= 0 ? i : 100 + (Number(s) || 0);
};

type Level3 = "all" | Level;
const LEVELS: { value: Level3; label: string }[] = [
    { value: "all", label: "All" },
    { value: "ok", label: "In stock" },
    { value: "low", label: "Low" },
    { value: "out", label: "Out" },
];

type Sort = "low" | "high" | "name";
const SORTS: { value: Sort; label: string }[] = [
    { value: "low", label: "Lowest stock first" },
    { value: "high", label: "Highest stock first" },
    { value: "name", label: "Name A to Z" },
];

const toggle = <T,>(arr: T[], v: T) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

const Svg = ({ children }: { children: ReactNode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

const ChevronDown = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const CheckSmall = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
);

function Stat({
    label,
    value,
    icon,
    delay,
    active = false,
    onClick,
}: {
    label: string;
    value: number;
    icon: ReactNode;
    delay: number;
    active?: boolean;
    onClick?: () => void;
}) {
    const interactive = !!onClick;
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!interactive}
            aria-pressed={active}
            className={`ad-reveal flex items-center justify-between rounded-2xl p-5 text-left transition ${interactive
                ? "cursor-pointer border bg-white hover:border-neutral-400"
                : "cursor-default border border-transparent bg-white"
                } ${active ? "border-neutral-900 ring-1 ring-neutral-900" : ""}`}
            style={d(delay)}
        >
            <div>
                <p className="text-2xl font-semibold tracking-tight">{value.toLocaleString("en-ZA")}</p>
                <p className="mt-1 text-xs text-neutral-500">{label}</p>
            </div>
            <span
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${active ? "bg-neutral-900 text-white" : "bg-[#f4f3f2]"
                    }`}
            >
                {icon}
            </span>
        </button>
    );
}

function Badge({ level }: { level: Level }) {
    const c = LEVEL_COLOR[level];
    return (
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ color: c, backgroundColor: `${c}14` }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
            {LEVEL_LABEL[level]}
        </span>
    );
}

const Swatch = ({ color, size = 16 }: { color: string; size?: number }) => (
    <span className="inline-block shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color, width: size, height: size }} />
);

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
    const [open, setOpen] = useState(true);
    return (
        <div className={title === "Category" ? "" : "border-t border-neutral-200"}>
            <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-semibold"
            >
                {title}
                <span className="transition-transform duration-500" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                    <ChevronDown />
                </span>
            </button>
            <div className="st-acc" data-open={open}>
                <div>
                    <div className="pb-5">{children}</div>
                </div>
            </div>
        </div>
    );
}

function ProductRow({ p, open, onToggle, max, index }: { p: StockProduct; open: boolean; onToggle: () => void; max: number; index: number }) {
    const level = levelOf(p.total);
    const color = LEVEL_COLOR[level];
    const outVariants = p.variants.filter((v) => v.stock === 0).length;

    return (
        <li className="ad-reveal rounded-2xl border border-neutral-200 bg-white" style={d(0.05 + Math.min(index, 6) * 0.05)}>
            <button type="button" aria-expanded={open} onClick={onToggle} className="flex w-full flex-wrap items-center gap-x-5 gap-y-3 p-4 text-left md:p-5">
                <span className="h-16 w-14 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: p.tone }}>
                    <img src={p.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                </span>

                <span className="min-w-[9rem] flex-1">
                    <span className="block text-sm font-semibold md:text-base">{p.name}</span>
                    <span className="block text-xs text-neutral-500">
                        {p.sku} &middot; {p.category}
                    </span>
                    <span className="mt-2 flex items-center gap-1.5" aria-label={`${p.colors.length} colours`}>
                        {p.colors.slice(0, 5).map((c) => (
                            <Swatch key={c.color} color={c.color} size={14} />
                        ))}
                        {p.colors.length > 5 && <span className="text-xs text-neutral-400">+{p.colors.length - 5}</span>}
                        <span className="ml-1 text-xs text-neutral-400">
                            {p.colors.length} {p.colors.length === 1 ? "colour" : "colours"}
                        </span>
                    </span>
                </span>

                <span className="hidden w-48 sm:block">
                    <span className="flex items-baseline justify-between text-xs text-neutral-500">
                        <span>Units left</span>
                        <span className="text-base font-semibold text-neutral-900">{p.total}</span>
                    </span>
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-neutral-200">
                        <span className="st-bar block h-full rounded-full" style={{ width: `${max ? (p.total / max) * 100 : 0}%`, backgroundColor: color }} />
                    </span>
                </span>

                <span className="ml-auto flex items-center gap-4">
                    <span className="text-right sm:hidden">
                        <span className="block text-base font-semibold leading-none">{p.total}</span>
                        <span className="text-[10px] text-neutral-500">units</span>
                    </span>
                    <Badge level={level} />
                    <span className="text-neutral-500 transition-transform duration-500" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                        <ChevronDown />
                    </span>
                </span>
            </button>

            <div className="st-acc" data-open={open}>
                <div>
                    <div className="border-t border-neutral-200 p-4 md:p-5">
                        <p className="text-xs font-medium text-neutral-500">Colours available</p>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {p.colors.map((c) => (
                                <li key={c.color} className="flex items-center gap-2 rounded-full bg-[#f4f3f2] py-1.5 pl-2 pr-3 text-xs">
                                    <Swatch color={c.color} />
                                    <span className="font-medium">{colorName(c.color)}</span>
                                    <span className={c.units === 0 ? "text-red-600" : "text-neutral-500"}>{c.units} left</span>
                                </li>
                            ))}
                        </ul>

                        <p className="mt-6 text-xs font-medium text-neutral-500">Units by size and colour</p>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[26rem] border-separate border-spacing-1 text-center text-sm">
                                <thead>
                                    <tr>
                                        <th className="w-14 text-left text-xs font-medium text-neutral-400">Size</th>
                                        {p.colors.map((c) => (
                                            <th key={c.color} className="px-1 pb-1 font-normal">
                                                <span className="flex flex-col items-center gap-1">
                                                    <Swatch color={c.color} size={18} />
                                                    <span className="text-[11px] text-neutral-500">{colorName(c.color)}</span>
                                                </span>
                                            </th>
                                        ))}
                                        <th className="px-1 pb-1 text-xs font-medium text-neutral-400">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {p.sizes.map((size) => {
                                        const row = p.variants.filter((v) => v.size === size);
                                        return (
                                            <tr key={size}>
                                                <th className="text-left text-xs font-medium text-neutral-700">{size}</th>
                                                {p.colors.map((c) => {
                                                    const v = row.find((x) => x.color === c.color);
                                                    const n = v?.stock ?? 0;
                                                    const tone = n === 0 ? LEVEL_COLOR.out : n <= LOW_VARIANT ? LEVEL_COLOR.low : null;
                                                    return (
                                                        <td key={c.color}>
                                                            <span
                                                                className="flex h-10 items-center justify-center rounded-lg text-sm font-medium"
                                                                style={tone ? { color: tone, backgroundColor: `${tone}14` } : { backgroundColor: "#f4f3f2" }}
                                                            >
                                                                {n}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                <td className="text-sm font-semibold">{row.reduce((s, v) => s + v.stock, 0)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
                            <span>{outVariants > 0 ? `${outVariants} size/colour ${outVariants === 1 ? "is" : "are"} sold out` : "Every size and colour is in stock"}</span>
                            <Link to={`/product/${p.id}`} className="underline-offset-4 hover:text-neutral-900 hover:underline">
                                View in shop
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function AdminStock() {
    const [q, setQ] = useState("");
    const [level, setLevel] = useState<Level3>("all");
    const [sort, setSort] = useState<Sort>("low");
    const [openId, setOpenId] = useState<number | null>(null);
    const [inStockOnly, setInStockOnly] = useState(false);

    const [cats, setCats] = useState<string[]>([]);
    const [colors, setColors] = useState<string[]>([]);
    const [sizes, setSizes] = useState<string[]>([]);

    const [products, setProducts] = useState<Product[]>(() => getProducts());
    const [loading, setLoading] = useState(products.length === 0);

    useEffect(() => {
        if (products.length > 0) return;
        let alive = true;
        loadProducts()
            .then((list) => { if (alive) setProducts(list); })
            .catch((err) => console.error("Failed to load products:", err))
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [products.length]);

    const all = useMemo(() => buildStock(products), [products]);
    const max = Math.max(1, ...all.map((p) => p.total));

    const { allCategories, allColors, allSizes } = useMemo(() => {
        const categorySet = new Set<string>();
        const colorSet = new Set<string>();
        const sizeSet = new Set<string>();
        for (const p of all) {
            categorySet.add(p.category);
            for (const c of p.colors) colorSet.add(c.color);
            for (const s of p.sizes) sizeSet.add(s);
        }
        return {
            allCategories: [...categorySet].sort(),
            allColors: [...colorSet].sort(),
            allSizes: [...sizeSet].sort((a, b) => sizeRank(a) - sizeRank(b)),
        };
    }, [all]);

    const totals = useMemo(
        () => ({
            units: all.reduce((n, p) => n + p.total, 0),
            products: all.length,
            low: all.filter((p) => levelOf(p.total) === "low").length,
            out: all.filter((p) => levelOf(p.total) === "out").length,
        }),
        [all]
    );

    const matchesFilters = (p: StockProduct) => {
        if (cats.length > 0 && !cats.includes(p.category)) return false;

        const hasVariantFilters = colors.length > 0 || sizes.length > 0;
        if (!hasVariantFilters) return true;

        return p.variants.some(
            (v) =>
                (colors.length === 0 || colors.includes(v.color)) &&
                (sizes.length === 0 || sizes.includes(v.size)) &&
                (!inStockOnly || v.stock > 0)
        );
    };

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const list = all.filter(
            (p) =>
                matchesFilters(p) &&
                (level === "all" || levelOf(p.total) === level) &&
                (!needle || [p.name, p.sku, p.category].some((v) => v.toLowerCase().includes(needle)))
        );
        if (sort === "low") list.sort((a, b) => a.total - b.total);
        if (sort === "high") list.sort((a, b) => b.total - a.total);
        if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
        return list;
    }, [all, q, level, sort, cats, colors, sizes, inStockOnly]);

    const activeFilterCount =
        cats.length +
        colors.length +
        sizes.length +
        (inStockOnly ? 1 : 0) +
        (level !== "all" ? 1 : 0);

    const clearAll = () => {
        setCats([]);
        setColors([]);
        setSizes([]);
        setInStockOnly(false);
        setLevel("all");
    };

    const toggleLevel = (next: Level3) => {
        setLevel((cur) => (cur === next ? "all" : next));
    };

    const filterPanel = (
        <div>
            {activeFilterCount > 0 && (
                <button
                    type="button"
                    onClick={clearAll}
                    className="mb-2 flex items-center gap-1 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
                >
                    Clear all ({activeFilterCount})
                </button>
            )}

            <FilterGroup title="Category">
                <ul className="space-y-3">
                    {allCategories.map((c) => {
                        const count = all.filter((p) => p.category === c).length;
                        return (
                            <li key={c}>
                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={cats.includes(c)}
                                        onChange={() => setCats((a) => toggle(a, c))}
                                    />
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-400 text-white transition peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-900 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                                        <CheckSmall />
                                    </span>
                                    <span className="flex-1">{c}</span>
                                    <span className="text-xs text-neutral-400">{count}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </FilterGroup>

            <FilterGroup title="Colour">
                <div className="flex flex-wrap gap-3">
                    {allColors.map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-pressed={colors.includes(c)}
                            aria-label={`Colour ${colorName(c)}`}
                            title={colorName(c)}
                            onClick={() => setColors((a) => toggle(a, c))}
                            className={`h-7 w-7 rounded-full border border-black/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${colors.includes(c) ? "ring-2 ring-neutral-900 ring-offset-2" : "hover:scale-110"
                                }`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup title="Size">
                <div className="flex flex-wrap gap-2">
                    {allSizes.map((s) => (
                        <button
                            key={s}
                            type="button"
                            aria-pressed={sizes.includes(s)}
                            onClick={() => setSizes((a) => toggle(a, s))}
                            className={`h-9 min-w-[2.75rem] rounded border px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${sizes.includes(s)
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
                                }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </FilterGroup>

            <FilterGroup title="Availability">
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={inStockOnly}
                        onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    <span className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-neutral-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-900 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                    <span className="flex-1">
                        In stock only
                        <span className="mt-0.5 block text-xs text-neutral-500">
                            Only products with a matching variant that isn't sold out.
                        </span>
                    </span>
                </label>
            </FilterGroup>
        </div>
    );

    return (
        <div>
            <style>{CSS}</style>

            <h1 className="ad-reveal text-2xl font-semibold tracking-tight md:text-3xl" style={d(0.05)}>Stock</h1>
            <p className="ad-reveal mt-1 text-sm text-neutral-500" style={d(0.08)}>
                {loading
                    ? "Loading…"
                    : `What's left of each product, by colour and size. A product is "Low" at ${LOW_PRODUCT} units or fewer.`}
            </p>

            {/* KPI cards — clickable */}
            <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
                <Stat
                    delay={0.1}
                    label="Units in stock"
                    value={totals.units}
                    active={level === "all"}
                    onClick={() => setLevel("all")}
                    icon={<Svg><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></Svg>}
                />
                <Stat
                    delay={0.14}
                    label="Products"
                    value={totals.products}
                    active={level === "all"}
                    onClick={() => setLevel("all")}
                    icon={<Svg><path d="M20 12 12 20 4 12V4h8l8 8Z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>}
                />
                <Stat
                    delay={0.18}
                    label="Low stock"
                    value={totals.low}
                    active={level === "low"}
                    onClick={() => toggleLevel("low")}
                    icon={<Svg><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17v.5" /></Svg>}
                />
                <Stat
                    delay={0.22}
                    label="Out of stock"
                    value={totals.out}
                    active={level === "out"}
                    onClick={() => toggleLevel("out")}
                    icon={<Svg><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></Svg>}
                />
            </div>

            <div className="mt-4 grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <aside
                    aria-label="Filters"
                    className="ad-reveal hidden lg:sticky lg:top-28 lg:block lg:self-start"
                    style={d(0.26)}
                >
                    {filterPanel}
                </aside>

                <section className="ad-reveal rounded-2xl bg-white p-5 md:p-6" style={d(0.26)}>
                    <div className="flex flex-wrap items-center gap-3">
                        <label className="relative min-w-[14rem] flex-1 md:max-w-xs">
                            <span className="sr-only">Search products</span>
                            <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                <circle cx="11" cy="11" r="7" />
                                <path d="m20 20-3.5-3.5" />
                            </svg>
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Search name, SKU or category"
                                className="h-10 w-full rounded-full bg-[#f4f3f2] pl-11 pr-4 text-xs outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900"
                            />
                        </label>

                        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by stock level">
                            {LEVELS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    aria-pressed={level === f.value}
                                    onClick={() => setLevel(f.value)}
                                    className={`h-10 rounded-full px-4 text-xs font-medium transition-colors ${level === f.value
                                        ? "bg-neutral-900 text-white"
                                        : "bg-[#f4f3f2] hover:bg-neutral-200"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        <label className="ml-auto">
                            <span className="sr-only">Sort products</span>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as Sort)}
                                className="h-10 cursor-pointer rounded-full bg-[#f4f3f2] px-4 text-xs font-medium outline-none hover:bg-neutral-200"
                            >
                                {SORTS.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {activeFilterCount > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#f4f3f2] px-4 py-3 text-xs">
                            <span className="text-neutral-500">
                                {activeFilterCount} {activeFilterCount === 1 ? "filter" : "filters"} active
                            </span>
                            <span className="text-neutral-300">·</span>
                            <span className="text-neutral-500">
                                {rows.length} {rows.length === 1 ? "product matches" : "products match"}
                            </span>
                            <button
                                type="button"
                                onClick={clearAll}
                                className="ml-auto text-neutral-900 underline-offset-4 hover:underline"
                            >
                                Clear filters
                            </button>
                        </div>
                    )}

                    {loading ? (
                        <div className="mt-6 space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#f4f3f2]" />
                            ))}
                        </div>
                    ) : rows.length > 0 ? (
                        <ul className="mt-6 space-y-3">
                            {rows.map((p, i) => (
                                <ProductRow
                                    key={p.id}
                                    p={p}
                                    index={i}
                                    max={max}
                                    open={openId === p.id}
                                    onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                                />
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-6 rounded-xl bg-[#f4f3f2] px-6 py-12 text-center text-sm text-neutral-500">
                            No products match these filters.
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
}