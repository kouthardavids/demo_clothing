// product page
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProducts, loadProducts } from "../lib/api/products";
import type { Product } from "../lib/api/products";
import { useTryOn } from "./Tryon";
import ClosetLink from "./links/Closetlink";
import { useCart } from "../lib/cart";
import BagLink from "./links/Baglink";

import { PAGE_CSS } from "../styles";

type Props = {
    id?: number | string;
};

const NAV_LINKS = ["Home", "Shop", "Collection", "Contact"] as const;
const TABS = ["description", "info", "reviews"] as const;
type Tab = (typeof TABS)[number];

function useInView<T extends Element>(threshold: number) {
    const ref = useRef<T>(null);
    const [seen, setSeen] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setSeen(true);
                    observer.disconnect();
                }
            },
            { threshold }
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, seen] as const;
}

const d = (s: number) => ({ ["--d" as string]: `${s}s` });

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const Svg = ({ children, size = 18, fill = "none" }: { children: ReactNode; size?: number; fill?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {children}
    </svg>
);

const UserIcon = () => (
    <Svg>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
);
const StarIcon = ({ filled }: { filled: boolean }) => (
    <Svg size={14} fill={filled ? "currentColor" : "none"}>
        <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" />
    </Svg>
);
const CheckIcon = () => (
    <Svg size={16}>
        <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
);
const MinusIcon = () => (
    <Svg size={16}>
        <path d="M5 12h14" />
    </Svg>
);
const PlusIcon = () => (
    <Svg size={16}>
        <path d="M12 5v14M5 12h14" />
    </Svg>
);
const HangerIcon = () => (
    <Svg size={18}>
        <path d="M12 8.5V7.8c0-.9 1.8-1.2 1.8-2.8a1.8 1.8 0 1 0-3.6 0" />
        <path d="M12 8.5 3.4 15.2a1.3 1.3 0 0 0 .8 2.3h15.6a1.3 1.3 0 0 0 .8-2.3L12 8.5Z" />
    </Svg>
);
const Chevron = ({ dir }: { dir: "left" | "right" }) => (
    <Svg size={16}>
        <path d={dir === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </Svg>
);

const Stars = ({ value }: { value: number }) => (
    <span className="flex text-amber-500" role="img" aria-label={`${value} out of 5`}>
        {[0, 1, 2, 3, 4].map((i) => (
            <StarIcon key={i} filled={i < Math.round(value)} />
        ))}
    </span>
);

function Header() {
    return (
        <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
                <Link to="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </Link>
                <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link}
                            href={`/#${link.toLowerCase()}`}
                            className="text-sm font-medium uppercase tracking-wide text-neutral-800 transition-colors hover:text-neutral-500"
                        >
                            {link}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-5">
                    <Link to={'/account'} aria-label="Account" className="transition-opacity hover:opacity-60">
                        <UserIcon />
                    </Link>
                    <ClosetLink />
                    <BagLink />
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
            <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_repeat(3,1fr)] md:px-12">
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
                <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-neutral-500 md:px-12">
                    &copy; {new Date().getFullYear()} Demo Clothing
                </p>
            </div>
        </footer>
    );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                             */
/* ------------------------------------------------------------------ */

function Gallery({ product }: { product: Product }) {
    const images = product.images ?? [product.image];
    const [index, setIndex] = useState(0);
    const [failed, setFailed] = useState<Record<string, boolean>>({});
    const imgRef = useRef<HTMLImageElement>(null);

    const current = images[index];

    const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const img = imgRef.current;
        if (!img) return;
        const r = e.currentTarget.getBoundingClientRect();
        img.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    };

    return (
        <div>
            <div
                onPointerMove={onMove}
                className="pp-wipe pp-zoom-container group relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-2xl"
                style={{ backgroundColor: product.tone }}
            >
                {!failed[current] ? (
                    <img
                        key={current}
                        ref={imgRef}
                        src={current}
                        alt={product.name}
                        draggable={false}
                        onError={() => setFailed((f) => ({ ...f, [current]: true }))}
                        className="pp-fade pp-zoom h-full w-full select-none object-contain object-center"
                    />
                ) : (
                    <span className="absolute bottom-3 left-3 text-[10px] text-neutral-900/40">public{current}</span>
                )}

                {product.badge && (
                    <span className="absolute left-4 top-4 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">
                        {product.badge}
                    </span>
                )}
            </div>

            {images.length > 1 && (
                <div className="pp-reveal mt-3 grid grid-cols-4 gap-3" style={d(0.5)}>
                    {images.map((src, i) => (
                        <button
                            key={src}
                            type="button"
                            aria-label={`Show photo ${i + 1}`}
                            aria-pressed={i === index}
                            onClick={() => setIndex(i)}
                            className={`aspect-[3/4] overflow-hidden rounded-lg border-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${i === index ? "border-neutral-900" : "border-transparent hover:border-neutral-300"
                                }`}
                            style={{ backgroundColor: product.tone }}
                        >
                            <img src={src} alt="" draggable={false} className="h-full w-full object-cover object-top" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Buy box                                                             */
/* ------------------------------------------------------------------ */

function BuyBox({ product, onJumpTo }: { product: Product; onJumpTo: (tab: Tab) => void }) {
    const [color, setColor] = useState<string | null>(product.colors[0] ?? null);
    const [size, setSize] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [sizeError, setSizeError] = useState(false);
    const [added, setAdded] = useState(false);
    const [copied, setCopied] = useState(false);
    const sizeRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { addToCloset, inCloset } = useTryOn();
    const { addItem } = useCart();
    const saved = inCloset(product.id);

    const maxQty = Math.max(1, Math.min(product.stock, 10));
    const soldOut = product.stock <= 0;

    useEffect(() => {
        if (!added) return;
        const t = window.setTimeout(() => setAdded(false), 1900);
        return () => window.clearTimeout(t);
    }, [added]);

    useEffect(() => {
        if (!copied) return;
        const t = window.setTimeout(() => setCopied(false), 1900);
        return () => window.clearTimeout(t);
    }, [copied]);

    const addToCart = () => {
        if (!size) {
            setSizeError(false);
            window.requestAnimationFrame(() => setSizeError(true));
            sizeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
            return;
        }
        addItem({ id: product.id, size, color: color ?? product.colors[0], qty });
        setAdded(true);
    };

    const stockText = soldOut ? "Out of stock" : product.stock <= 5 ? `Only ${product.stock} left` : `${product.stock} in stock`;

    return (
        <div>
            <nav aria-label="Breadcrumb" className="pp-reveal text-xs text-neutral-500" style={d(0.1)}>
                <Link to="/" className="hover:text-neutral-900">Home</Link>
                <span className="mx-1.5">/</span>
                <a href="/shop" className="hover:text-neutral-900">{product.category}</a>
                <span className="mx-1.5">/</span>
                <span className="text-neutral-900">{product.name}</span>
            </nav>

            <h1 className="pp-reveal mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={d(0.16)}>
                {product.name}
            </h1>

            <button
                type="button"
                onClick={() => onJumpTo("reviews")}
                className="pp-reveal mt-4 flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-900"
                style={d(0.28)}
            >
                <Stars value={product.rating} />
                {product.reviewCount} Reviews
            </button>

            <div className="pp-reveal mt-5 flex items-baseline gap-3" style={d(0.34)}>
                <span className="text-3xl font-semibold">{product.price}</span>
                {product.oldPrice && <span className="text-sm text-neutral-400 line-through">{product.oldPrice}</span>}
            </div>

            <div className="pp-reveal mt-6 border-t border-neutral-200 pt-6" style={d(0.4)}>
                {/* Colour */}
                <div>
                    <p className="text-xs text-neutral-500">Color</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Color">
                        {product.colors.map((c, i) => (
                            <button
                                key={c}
                                type="button"
                                role="radio"
                                aria-checked={color === c}
                                aria-label={`Colour ${i + 1}`}
                                onClick={() => setColor(c)}
                                className={`h-8 w-8 rounded-full border border-black/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${color === c ? "ring-2 ring-neutral-900 ring-offset-2" : "hover:scale-110"
                                    }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    {color && (
                        <button type="button" onClick={() => setColor(null)} className="mt-2 text-xs text-neutral-500 hover:text-neutral-900">
                            &times; Clear
                        </button>
                    )}
                </div>

                {/* Size */}
                <div className="mt-6">
                    <p className="text-xs text-neutral-500">Size</p>
                    <div
                        ref={sizeRef}
                        key={sizeError ? "err" : "ok"}
                        className={`mt-3 flex flex-wrap gap-2 ${sizeError ? "pp-shake" : ""}`}
                        role="radiogroup"
                        aria-label="Size"
                    >
                        {product.sizes.map((s) => (
                            <button
                                key={s}
                                type="button"
                                role="radio"
                                aria-checked={size === s}
                                onClick={() => {
                                    setSize(s);
                                    setSizeError(false);
                                }}
                                className={`h-9 min-w-[2.75rem] rounded border px-3 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${size === s
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : sizeError
                                        ? "border-red-400 text-neutral-700"
                                        : "border-neutral-300 text-neutral-700 hover:border-neutral-900"
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    {sizeError && !size && <p className="mt-2 text-xs text-red-600" role="alert">Please choose a size.</p>}
                    {size && (
                        <button type="button" onClick={() => setSize(null)} className="mt-2 text-xs text-neutral-500 hover:text-neutral-900">
                            &times; Clear
                        </button>
                    )}
                </div>

                <div className="mt-5 flex items-start justify-between gap-4 text-[11px] font-medium uppercase tracking-wide">
                    <details className="group w-full max-w-xs">
                        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-neutral-800 hover:text-neutral-500 [&::-webkit-details-marker]:hidden">
                            <Svg size={16}>
                                <rect x="3" y="8" width="18" height="8" rx="1.5" />
                                <path d="M7 8v3M11 8v4M15 8v3M19 8v4" />
                            </Svg>
                            Size guide
                        </summary>
                        <table className="mt-3 w-full text-left text-xs font-normal normal-case tracking-normal text-neutral-600">
                            <thead>
                                <tr className="border-b border-neutral-200 text-neutral-900">
                                    <th className="py-1.5 font-medium">Size</th>
                                    <th className="font-medium">Bust (cm)</th>
                                    <th className="font-medium">Waist (cm)</th>
                                    <th className="font-medium">Hips (cm)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ["S", "84", "66", "90"],
                                    ["M", "90", "72", "96"],
                                    ["L", "96", "78", "102"],
                                    ["XL", "102", "84", "108"],
                                ].map((row) => (
                                    <tr key={row[0]} className="border-b border-neutral-100">
                                        {row.map((cell, i) => (
                                            <td key={i} className="py-1.5">{cell}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </details>
                    <span className="flex shrink-0 items-center gap-1.5 text-neutral-800">
                        <CheckIcon />
                        {stockText}
                    </span>
                </div>

                <div className="mt-6 flex h-12 items-center justify-between rounded-md bg-neutral-100 px-4">
                    <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={qty <= 1}
                        onClick={() => setQty((q) => Math.max(1, q - 1))}
                        className="text-neutral-700 transition-colors hover:text-neutral-900 disabled:opacity-30"
                    >
                        <MinusIcon />
                    </button>
                    <span className="text-sm font-medium tabular-nums" aria-live="polite">{qty}</span>
                    <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={qty >= maxQty}
                        onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                        className="text-neutral-700 transition-colors hover:text-neutral-900 disabled:opacity-30"
                    >
                        <PlusIcon />
                    </button>
                </div>

                <button
                    type="button"
                    disabled={soldOut}
                    onClick={addToCart}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {added ? (
                        <span className="pp-fade flex items-center gap-2" aria-live="polite">
                            <CheckIcon /> Added to cart
                        </span>
                    ) : (
                        "Add to Cart"
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => {
                        addToCloset(product.id);
                        navigate("/try-on");
                    }}
                    className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-md border border-neutral-900 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                >
                    <HangerIcon />
                    {saved ? "Open in Try On" : "Try On"}
                </button>
                <p className="mt-2 text-xs text-neutral-500">
                    {saved ? "This piece is in your closet." : "Add it to your closet and see it with your other pieces."}
                </p>

                <dl className="mt-5 grid grid-cols-[5rem_1fr] gap-y-2 text-xs">
                    <dt className="text-neutral-400">SKU</dt>
                    <dd>{product.sku}</dd>
                    <dt className="text-neutral-400">Category</dt>
                    <dd>{product.category}</dd>
                </dl>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function Tabs({ product, tab, setTab }: { product: Product; tab: Tab; setTab: (t: Tab) => void }) {
    const [ref, inView] = useInView<HTMLDivElement>(0.2);

    const labels: Record<Tab, string> = {
        description: "Description",
        info: "Additional Info",
        reviews: `Reviews (${product.reviewCount})`,
    };

    return (
        <section id="product-tabs" ref={ref} className={`mt-20 scroll-mt-24 ${inView ? "pp-in" : ""}`}>
            <div className="pp-scroll-reveal grid gap-8 md:grid-cols-[13rem_1fr] md:gap-12">
                <div role="tablist" aria-label="Product information" className="pp-scroller flex gap-6 overflow-x-auto md:flex-col md:gap-5">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            id={`tab-${t}`}
                            type="button"
                            role="tab"
                            aria-selected={tab === t}
                            aria-controls={`panel-${t}`}
                            onClick={() => setTab(t)}
                            className={`w-fit shrink-0 border-b-2 pb-1.5 text-left text-base font-medium transition-colors ${tab === t
                                ? "border-neutral-900 text-neutral-900"
                                : "border-transparent text-neutral-500 hover:text-neutral-900"
                                }`}
                        >
                            {labels[t]}
                        </button>
                    ))}
                </div>

                <div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pp-fade min-h-[14rem] max-w-2xl text-sm leading-relaxed text-neutral-600">
                    {tab === "reviews" && (
                        <div className="flex items-center gap-4">
                            <span className="text-4xl font-semibold text-neutral-900">{product.rating.toFixed(1)}</span>
                            <div>
                                <Stars value={product.rating} />
                                <p className="mt-1 text-xs">Based on {product.reviewCount} reviews</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* You might also like                                                 */
/* ------------------------------------------------------------------ */

function RelatedCard({ product }: { product: Product }) {
    const [failed, setFailed] = useState(false);

    return (
        <Link
            to={`/product/${product.id}`}
            draggable={false}
            className="group block w-[44vw] shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900 md:w-[calc((100%-3rem)/4)]"
        >
            <div className="relative aspect-[4/5] overflow-hidden rounded-xl" style={{ backgroundColor: product.tone }}>
                {!failed && (
                    <img
                        src={product.image}
                        alt=""
                        draggable={false}
                        loading="lazy"
                        onError={() => setFailed(true)}
                        className="h-full w-full select-none object-contain object-center transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                    />
                )}
            </div>
            <p className="mt-3 text-sm font-medium">{product.name}</p>
            <p className="mt-1 text-sm">
                <span className="font-semibold">{product.price}</span>
                {product.oldPrice && <span className="ml-2 text-neutral-400 line-through">{product.oldPrice}</span>}
            </p>
        </Link>
    );
}

function Related({ items }: { current: Product; items: Product[] }) {
    const [ref, inView] = useInView<HTMLElement>(0.2);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(true);

    const update = () => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanPrev(el.scrollLeft > 2);
        setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    };

    useEffect(() => {
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    const page = (dir: 1 | -1) =>
        scrollerRef.current?.scrollBy({ left: dir * (scrollerRef.current.clientWidth + 16), behavior: "smooth" });

    const arrow =
        "flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 transition-colors hover:bg-neutral-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-900";

    return (
        <section ref={ref} className={`mt-24 ${inView ? "pp-in" : ""}`}>
            <div className="pp-scroll-reveal flex items-center justify-between">
                <h2 className="text-xl font-semibold tracking-tight">You might also like</h2>
                <div className="flex gap-3">
                    <button type="button" aria-label="Previous" disabled={!canPrev} onClick={() => page(-1)} className={arrow}>
                        <Chevron dir="left" />
                    </button>
                    <button type="button" aria-label="Next" disabled={!canNext} onClick={() => page(1)} className={arrow}>
                        <Chevron dir="right" />
                    </button>
                </div>
            </div>

            <div
                ref={scrollerRef}
                onScroll={update}
                className="pp-scroller pp-scroll-reveal mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto"
                style={d(0.15)}
            >
                {items.map((p) => (
                    <RelatedCard key={p.id} product={p} />
                ))}
            </div>
        </section>
    );
}

function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
    const [tab, setTab] = useState<Tab>("description");

    const jumpTo = (t: Tab) => {
        setTab(t);
        document.getElementById("product-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-12 md:py-14">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
                <Gallery product={product} />
                <BuyBox product={product} onJumpTo={jumpTo} />
            </div>
            <Tabs product={product} tab={tab} setTab={setTab} />
            <Related current={product} items={related} />
        </main>
    );
}

function NotFound() {
    return (
        <main className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-start justify-center px-6 md:px-12">
            <h1 className="text-3xl font-semibold tracking-tight">We could not find that product</h1>
            <p className="mt-3 text-sm text-neutral-500">It may have been removed, or the link is wrong.</p>
            <a
                href="/#collection"
                className="mt-6 rounded-sm bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-neutral-700"
            >
                Back to the store
            </a>
        </main>
    );
}

export default function ProductPage({ id }: Props) {
    const params = useParams();
    const productId = Number(id ?? params.id);

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

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [productId]);

    const product = products.find((p) => p.id === productId) ?? null;
    const related = products.filter((p) => p.id !== productId);

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900">
            <style>{PAGE_CSS}</style>
            <Header />
            {loading ? (
                <main className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-6 md:px-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                </main>
            ) : product ? (
                <ProductDetail key={product.id} product={product} related={related} />
            ) : (
                <NotFound />
            )}
            <Footer />
        </div>
    );
}