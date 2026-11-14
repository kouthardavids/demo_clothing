import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { getProducts, loadProducts } from "../lib/api/products";
import type { Product } from "../lib/api/products";
import { useTryOn } from "./Tryon";

import ClosetLink from "./links/Closetlink";
import { X } from "lucide-react";
import { UserIcon } from "../assets/icons/icons";
import { BagIcon } from "../assets/icons/icons";
import { HeartIcon } from "../assets/icons/icons";
import { PlusIcon } from "../assets/icons/icons";
import { CheckIcon } from "../assets/icons/icons";
import { CloseIcon } from "../assets/icons/icons";
import { ChevronDown } from "../assets/icons/icons";
import { ChevronRight } from "../assets/icons/icons";
import { FilterIcon } from "../assets/icons/icons";

import { SHOP_CSS } from "../styles/index";

const NAV_LINKS = ["Home", "Shop", "Collection", "Contact"] as const;
const PAGE_SIZE = 8;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const priceOf = (p: Product) => Number(p.price.replace(/[^\d.]/g, "")) || 0;
const money = (n: number) => `R${n.toLocaleString("en-ZA").replace(/\u00a0/g, " ")}`;
const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const sizeRank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i >= 0 ? i : 100 + (Number(s) || 0);
};

type Sort = "relevance" | "low" | "high" | "rating";
const SORTS: { value: Sort; label: string }[] = [
    { value: "relevance", label: "Relevance" },
    { value: "low", label: "Price: low to high" },
    { value: "high", label: "Price: high to low" },
    { value: "rating", label: "Top rated" },
];

function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
                <Link to="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </Link>
                <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) =>
                        link === "Shop" ? (
                            <Link
                                key={link}
                                to="/shop"
                                aria-current="page"
                                className="text-sm font-medium uppercase tracking-wide text-neutral-900"
                            >
                                {link}
                            </Link>
                        ) : (
                            <a
                                key={link}
                                href={`/#${link.toLowerCase()}`}
                                className="text-sm font-medium uppercase tracking-wide text-neutral-800 transition-colors hover:text-neutral-500"
                            >
                                {link}
                            </a>
                        )
                    )}
                </nav>
                <div className="flex items-center gap-5">
                    <Link to={'/account'} aria-label="Account" className="transition-opacity hover:opacity-60">
                        <UserIcon />
                    </Link>
                    <ClosetLink />
                    <button aria-label="Bag" className="transition-opacity hover:opacity-60">
                        <BagIcon />
                    </button>
                </div>
            </div>
        </header>
    );
}

const FOOTER_COLUMNS: { title: string; links: string[] }[] = [
    { title: "Shop", links: ["New arrivals", "Dresses", "Knitwear", "Trousers"] },
    { title: "Information", links: ["About", "Shipping", "Returns", "Privacy"] },
    { title: "Support", links: ["Contact", "Size guide", "FAQ", "Track order"] },
];

function Footer() {
    return (
        <footer className="mt-24 bg-[#f4f3f2]">
            <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-12">
                <div>
                    <p className="text-xl font-bold tracking-tight">Demo Clothing</p>
                    <p className="mt-3 max-w-xs text-sm leading-relaxed text-neutral-500">
                        Minimal style thoughtfully created for effortless, everyday elegance.
                    </p>
                </div>
                {FOOTER_COLUMNS.map((column) => (
                    <div key={column.title}>
                        <p className="text-sm font-semibold">{column.title}</p>
                        <ul className="mt-4 space-y-3 text-sm text-neutral-500">
                            {column.links.map((link) => (
                                <li key={link}>
                                    <a href="#" className="transition-colors hover:text-neutral-900">
                                        {link}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            <div className="border-t border-neutral-200">
                <p className="mx-auto max-w-7xl px-6 py-5 text-xs text-neutral-500 md:px-12">
                    &copy; {new Date().getFullYear()} Demo Clothing
                </p>
            </div>
        </footer>
    );
}

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
            <div className="sh-acc" data-open={open}>
                <div>
                    <div className="pb-5">{children}</div>
                </div>
            </div>
        </div>
    );
}

function PriceRange({ lo, hi, min, max, onChange }: {
    lo: number;
    hi: number;
    min: number;
    max: number;
    onChange: (lo: number, hi: number) => void
}) {
    const [minInput, setMinInput] = useState(String(lo));
    const [maxInput, setMaxInput] = useState(String(hi));

    useEffect(() => {
        setMinInput(String(lo));
        setMaxInput(String(hi));
    }, [lo, hi]);

    const span = max - min || 1;
    const left = ((lo - min) / span) * 100;
    const right = ((hi - min) / span) * 100;

    const loOnTop = lo > max - span * 0.1;

    const saveMin = () => {
        if (minInput.trim() === "") {
            setMinInput(String(lo));
            return;
        }
        const value = Math.max(min, Math.min(Number(minInput), hi));
        onChange(value, hi);
        setMinInput(String(value));
    };

    const saveMax = () => {
        if (maxInput.trim() === "") {
            setMaxInput(String(hi));
            return;
        }
        const value = Math.min(max, Math.max(Number(maxInput), lo));
        onChange(lo, value);
        setMaxInput(String(value));
    };

    return (
        <div>
            <div className="sh-range">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-neutral-200" />
                <div
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded bg-neutral-900"
                    style={{ left: `${left}%`, right: `${100 - right}%` }}
                />
                <input
                    type="range"
                    aria-label="Minimum price"
                    min={min}
                    max={max}
                    step={1}
                    value={lo}
                    style={{ zIndex: loOnTop ? 5 : 3 }}
                    onChange={(e) => onChange(Math.min(Number(e.target.value), hi), hi)}
                />
                <input
                    type="range"
                    aria-label="Maximum price"
                    min={min}
                    max={max}
                    step={1}
                    value={hi}
                    style={{ zIndex: 4 }}
                    onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo))}
                />
            </div>

            <div className="mt-3 flex justify-between text-xs text-neutral-500">
                <span>{money(lo)}</span>
                <span>{money(hi)}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">Minimum</label>
                    <input
                        type="number"
                        min={min}
                        max={hi}
                        value={minInput}
                        onChange={(e) => setMinInput(e.target.value)}
                        onBlur={saveMin}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                saveMin();
                                e.currentTarget.blur();
                            }
                        }}
                        className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors hover:border-neutral-900 focus:border-neutral-900"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-xs text-neutral-500">Maximum</label>
                    <input
                        type="number"
                        min={lo}
                        max={max}
                        value={maxInput}
                        onChange={(e) => setMaxInput(e.target.value)}
                        onBlur={saveMax}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                saveMax();
                                e.currentTarget.blur();
                            }
                        }}
                        className="h-9 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition-colors hover:border-neutral-900 focus:border-neutral-900"
                    />
                </div>
            </div>
        </div>
    );
}

function ProductCard({
    product,
    index,
    liked,
    onLike,
    inCloset,
    onCloset,
}: {
    product: Product;
    index: number;
    liked: boolean;
    onLike: () => void;
    inCloset: boolean;
    onCloset: () => void;
}) {
    const [failed, setFailed] = useState(false);
    const [popKey, setPopKey] = useState(0);
    const href = `/product/${product.id}`;

    return (
        <article className="sh-reveal group" style={d(0.05 + Math.min(index, 8) * 0.06)}>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl" style={{ backgroundColor: product.tone }}>
                <Link
                    to={href}
                    aria-label={product.name}
                    draggable={false}
                    className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900"
                >
                    {!failed ? (
                        <img
                            src={product.image}
                            alt=""
                            draggable={false}
                            loading="lazy"
                            decoding="async"
                            onError={() => setFailed(true)}
                            className="h-full w-full select-none object-contain object-center transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-reduce:transition-none"
                        />
                    ) : (
                        <span className="absolute bottom-2 left-2 text-[9px] text-neutral-900/40">public{product.image}</span>
                    )}
                </Link>

                {product.badge && (
                    <span className="absolute left-3 top-3 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-medium text-white">
                        {product.badge}
                    </span>
                )}

                <button
                    type="button"
                    aria-pressed={inCloset}
                    aria-label={inCloset ? `Remove ${product.name} from closet` : `Add ${product.name} to closet`}
                    title={inCloset ? "In your closet" : "Add to try-on closet"}
                    onClick={onCloset}
                    className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900 ${inCloset ? "bg-neutral-900 text-white" : "bg-white/90 text-neutral-900 hover:bg-neutral-900 hover:text-white"
                        }`}
                >
                    {inCloset ? <CheckIcon /> : <PlusIcon />}
                </button>
            </div>

            <div className="mt-3 flex items-start justify-between gap-3">
                <Link to={href} draggable={false} className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-neutral-900 md:text-base">{product.name}</h3>
                </Link>
                <button
                    type="button"
                    aria-pressed={liked}
                    aria-label={liked ? `Remove ${product.name} from saved` : `Save ${product.name}`}
                    onClick={() => {
                        onLike();
                        setPopKey((n) => n + 1);
                    }}
                    className={`-mt-0.5 shrink-0 transition-colors ${liked ? "text-red-600" : "text-neutral-300 hover:text-neutral-500"}`}
                >
                    <span key={popKey} className={liked && popKey > 0 ? "sh-pop flex" : "flex"}>
                        <HeartIcon filled={liked} />
                    </span>
                </button>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3">
                <ul className="flex items-center gap-1.5" aria-label={`${product.colors.length} colours`}>
                    {product.colors.map((c) => (
                        <li key={c} className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                </ul>
                <p className="text-sm">
                    <span className="font-semibold">{product.price}</span>
                    {product.oldPrice && <span className="ml-2 text-neutral-400 line-through">{product.oldPrice}</span>}
                </p>
            </div>
        </article>
    );
}

function ShopPage({ slug }: { slug?: string }) {
    const { addToCloset, removeFromCloset, inCloset } = useTryOn();

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

    const { allCategories, allColors, allSizes, minPrice, maxPrice } = useMemo(() => {
        const prices = products.map(priceOf);
        return {
            allCategories: [...new Set(products.map((p) => p.category))],
            allColors: [...new Set(products.flatMap((p) => p.colors))],
            allSizes: [...new Set(products.flatMap((p) => p.sizes))].sort(
                (a, b) => sizeRank(a) - sizeRank(b)
            ),
            minPrice: prices.length ? Math.floor(Math.min(...prices)) : 0,
            maxPrice: prices.length ? Math.ceil(Math.max(...prices)) : 0,
        };
    }, [products]);

    const startCategory = allCategories.find((c) => c.toLowerCase() === slug?.toLowerCase());

    const [cats, setCats] = useState<string[]>(startCategory ? [startCategory] : []);
    const [colors, setColors] = useState<string[]>([]);
    const [sizes, setSizes] = useState<string[]>([]);
    const [lo, setLo] = useState(minPrice);
    const [hi, setHi] = useState(maxPrice);
    const [sort, setSort] = useState<Sort>("relevance");
    const [page, setPage] = useState(1);
    const [drawer, setDrawer] = useState(false);
    const [liked, setLiked] = useState<number[]>([]);
    const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

    useEffect(() => {
        setLo(minPrice);
        setHi(maxPrice);
    }, [minPrice, maxPrice]);

    const activeCount = cats.length + colors.length + sizes.length + (lo > minPrice || hi < maxPrice ? 1 : 0);

    const clearAll = () => {
        setCats([]);
        setColors([]);
        setSizes([]);
        setLo(minPrice);
        setHi(maxPrice);
    };

    const results = useMemo(() => {
        const list = products.map((p, i) => ({ p, i })).filter(({ p }) => {
            const price = priceOf(p);
            return (
                (cats.length === 0 || cats.includes(p.category)) &&
                (colors.length === 0 || p.colors.some((c) => colors.includes(c))) &&
                (sizes.length === 0 || p.sizes.some((s) => sizes.includes(s))) &&
                price >= lo &&
                price <= hi
            );
        });
        if (sort === "low") list.sort((a, b) => priceOf(a.p) - priceOf(b.p));
        if (sort === "high") list.sort((a, b) => priceOf(b.p) - priceOf(a.p));
        if (sort === "rating") list.sort((a, b) => b.p.rating - a.p.rating);
        return list;
    }, [products, cats, colors, sizes, lo, hi, sort]);

    const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const visible = results.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
    const gridKey = `${current}|${cats}|${colors}|${sizes}|${lo}|${hi}|${sort}`;

    useEffect(() => setPage(1), [cats, colors, sizes, lo, hi, sort]);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [slug]);

    useEffect(() => {
        if (!drawer) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [drawer]);

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [toast]);

    const onCloset = (p: Product) => {
        if (inCloset(p.id)) {
            removeFromCloset(p.id);
            setToast({ id: Date.now(), text: `${p.name} removed from closet` });
        } else {
            addToCloset(p.id);
            setToast({ id: Date.now(), text: `${p.name} added to closet` });
        }
    };

    const filterPanel = (
        <div>
            <div>
                {activeCount > 0 && (
                    <button
                        type="button"
                        onClick={clearAll}
                        className="flex items-center gap-1 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
                    >
                        <X size={12} />
                        Clear all
                    </button>
                )}
            </div>

            <FilterGroup title="Category">
                <ul className="space-y-3">
                    {allCategories.map((c) => {
                        const count = products.filter((p) => p.category === c).length;
                        return (
                            <li key={c}>
                                <label className="flex cursor-pointer items-center gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        className="peer sr-only"
                                        checked={cats.includes(c)}
                                        onChange={() => setCats((a) => toggle(a, c))}
                                    />
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-400 text-white transition peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-900 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                                        <CheckIcon size={12} />
                                    </span>
                                    <span className="flex-1">{c}</span>
                                    <span className="text-xs text-neutral-400">{count}</span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            </FilterGroup>

            <FilterGroup title="Color">
                <div className="flex flex-wrap gap-3">
                    {allColors.map((c, i) => (
                        <button
                            key={c}
                            type="button"
                            aria-pressed={colors.includes(c)}
                            aria-label={`Colour ${i + 1}`}
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

            <FilterGroup title="Price">
                <PriceRange
                    lo={lo}
                    hi={hi}
                    min={minPrice}
                    max={maxPrice}
                    onChange={(a, b) => {
                        setLo(a);
                        setHi(b);
                    }}
                />
            </FilterGroup>
            <div className="border-t border-neutral-200" />
        </div>
    );

    const title = startCategory ?? "All products";

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900">
            <style>{SHOP_CSS}</style>
            <Header />

            <main className="mx-auto w-full max-w-7xl px-6 py-10 md:px-12 md:py-14">
                <nav aria-label="Breadcrumb" className="sh-reveal text-xs text-neutral-500" style={d(0.05)}>
                    <Link to="/" className="hover:text-neutral-900">Home</Link>
                    <span className="mx-1.5">/</span>
                    {startCategory ? (
                        <>
                            <Link to="/shop" className="hover:text-neutral-900">Shop</Link>
                            <span className="mx-1.5">/</span>
                            <span className="text-neutral-900">{startCategory}</span>
                        </>
                    ) : (
                        <span className="text-neutral-900">Shop</span>
                    )}
                </nav>

                <div className="sh-reveal mt-3 flex flex-wrap items-end justify-between gap-4" style={d(0.1)}>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>

                    <div className="flex items-center gap-3">
                        <p className="hidden text-xs text-neutral-500 sm:block" aria-live="polite">
                            {loading ? "Loading…" : `${results.length} ${results.length === 1 ? "product" : "products"}`}
                        </p>

                        <button
                            type="button"
                            onClick={() => setDrawer(true)}
                            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#f4f3f2] px-4 text-xs font-medium transition-colors hover:bg-neutral-200 lg:hidden"
                        >
                            <FilterIcon />
                            Filters{activeCount > 0 && ` (${activeCount})`}
                        </button>

                        <label className="relative">
                            <span className="sr-only">Sort products</span>
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as Sort)}
                                className="h-10 cursor-pointer appearance-none rounded-full bg-[#f4f3f2] pl-4 pr-10 text-xs font-medium outline-none transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
                            >
                                {SORTS.map((s) => (
                                    <option key={s.value} value={s.value}>
                                        Sort: {s.label}
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600">
                                <ChevronDown />
                            </span>
                        </label>
                    </div>
                </div>

                <div className="mt-10 grid gap-12 lg:grid-cols-[14rem_minmax(0,1fr)]">
                    <aside aria-label="Filters" className="sh-reveal hidden lg:sticky lg:top-28 lg:block lg:self-start" style={d(0.15)}>
                        {filterPanel}
                    </aside>

                    <section aria-label="Products">
                        {loading ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
                                {Array.from({ length: 6 }).map((_, i) => (
                                    <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-[#f4f3f2]" />
                                ))}
                            </div>
                        ) : visible.length > 0 ? (
                            <div key={gridKey} className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
                                {visible.map(({ p, i }, idx) => (
                                    <ProductCard
                                        key={`${p.id}-${i}`}
                                        product={p}
                                        index={idx}
                                        liked={liked.includes(p.id)}
                                        onLike={() => setLiked((a) => toggle(a, p.id))}
                                        inCloset={inCloset(p.id)}
                                        onCloset={() => onCloset(p)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="sh-fade rounded-2xl bg-[#f4f3f2] px-6 py-16 text-center">
                                <p className="text-lg font-semibold">No products match</p>
                                <p className="mt-2 text-sm text-neutral-500">Try removing a filter or widening the price range.</p>
                                <button
                                    type="button"
                                    onClick={clearAll}
                                    className="mt-6 rounded-sm bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700"
                                >
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {!loading && pages > 1 && (
                            <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
                                {Array.from({ length: pages }, (_, n) => n + 1).map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        aria-current={n === current ? "page" : undefined}
                                        onClick={() => {
                                            setPage(n);
                                            window.scrollTo({ top: 0, behavior: "smooth" });
                                        }}
                                        className={`flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors ${n === current ? "bg-neutral-900 text-white" : "bg-[#f4f3f2] hover:bg-neutral-200"
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    aria-label="Next page"
                                    disabled={current >= pages}
                                    onClick={() => {
                                        setPage(current + 1);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-md bg-[#f4f3f2] transition-colors hover:bg-neutral-200 disabled:opacity-40"
                                >
                                    <ChevronRight />
                                </button>
                            </nav>
                        )}
                    </section>
                </div>
            </main>

            <Footer />

            <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? "" : "pointer-events-none"}`} aria-hidden={!drawer}>
                <div
                    onClick={() => setDrawer(false)}
                    className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${drawer ? "opacity-100" : "opacity-0"}`}
                />
                <aside
                    role="dialog"
                    aria-label="Filters"
                    className={`absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col bg-white shadow-xl transition-transform duration-500 ${drawer ? "translate-x-0" : "-translate-x-full"
                        }`}
                    style={{ transitionTimingFunction: EASE }}
                >
                    <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-5">
                        <p className="text-base font-semibold">Filters</p>
                        <button
                            type="button"
                            aria-label="Close filters"
                            onClick={() => setDrawer(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-100"
                        >
                            <CloseIcon />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">{filterPanel}</div>
                    <div className="border-t border-neutral-200 p-4">
                        <button
                            type="button"
                            onClick={() => setDrawer(false)}
                            className="h-12 w-full rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                        >
                            Show {results.length} {results.length === 1 ? "product" : "products"}
                        </button>
                    </div>
                </aside>
            </div>

            {toast && (
                <p
                    key={toast.id}
                    role="status"
                    className="sh-toast fixed bottom-6 left-1/2 z-[60] max-w-[90%] rounded-full bg-neutral-900 px-5 py-2.5 text-center text-xs font-medium text-white shadow-lg"
                >
                    {toast.text}
                </p>
            )}
        </div>
    );
}

export default function Shop() {
    const { slug } = useParams();
    return <ShopPage key={slug ?? "all"} slug={slug} />;
}