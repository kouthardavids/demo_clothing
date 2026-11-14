import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { getProducts, loadProducts } from "../lib/products";
import type { Product } from "../lib/products";

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

type Category = {
    name: string;
    slug: string;
    image: string;
    tone: string;
};

const CATEGORIES: Category[] = [
    { name: "Knitwear", slug: "knitwear", image: "/categories/knitwear.png", tone: "#b9a99a" },
    { name: "Dresses", slug: "dresses", image: "/categories/dresseg.png", tone: "#cfd3d6" },
    { name: "Tops", slug: "tops", image: "/categories/exmaple 3.png", tone: "#8c8279" },
    { name: "Trousers", slug: "trousers", image: "/categories/trouser.png", tone: "#e3d5cf" },
];

const REVEAL_CSS = `
@keyframes xp-rise { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
.xp-reveal { opacity: 0 }
.xp-in .xp-reveal { animation: xp-rise 1s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s) }
.xp-scroller { scrollbar-width: none }
.xp-scroller::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) {
  .xp-reveal, .xp-in .xp-reveal { animation: none; opacity: 1; transform: none }
}
`;

function CategoryCard({ category, index }: { category: Category; index: number }) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <a
            href={`/shop/${category.slug}`}
            draggable={false}
            className="xp-reveal group block w-[80vw] shrink-0 snap-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900 sm:w-[52vw] md:w-[36vw] lg:w-[34vw]"
            style={{ ["--d" as string]: `${0.15 + index * 0.08}s` }}
        >
            <div
                className="relative aspect-[5/7] w-full overflow-hidden"
                style={{ backgroundColor: category.tone }}
            >
                {!imageFailed && (
                    <img
                        src={category.image}
                        alt={category.name}
                        draggable={false}
                        loading={index < 4 ? "eager" : "lazy"}
                        decoding="async"
                        onError={() => setImageFailed(true)}
                        className="h-full w-full select-none object-cover object-top transition-transform duration-[1800ms] ease-out will-change-transform group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                )}
                {imageFailed && (
                    <span className="absolute bottom-3 left-3 text-[10px] text-neutral-900/40">
                        public{category.image}
                    </span>
                )}
            </div>

            <p className="mt-4 flex items-center text-base leading-none tracking-tight text-neutral-900 md:text-lg">
                <span
                    aria-hidden="true"
                    className="inline-block h-1.5 w-0 rounded-full bg-neutral-900 transition-all duration-300 group-hover:mr-2 group-hover:w-1.5 group-focus-visible:mr-2 group-focus-visible:w-1.5"
                />
                {category.name}
            </p>
        </a>
    );
}

function CategoryRow() {
    const [blockRef, inView] = useInView<HTMLDivElement>(0.25);
    const scrollerRef = useRef<HTMLDivElement>(null);

    const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });
    const [dragging, setDragging] = useState(false);

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (e.pointerType !== "mouse" || !scrollerRef.current) return;
        drag.current = {
            active: true,
            startX: e.clientX,
            startScroll: scrollerRef.current.scrollLeft,
            moved: false,
        };
    };

    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d.active || !scrollerRef.current) return;
        const dx = e.clientX - d.startX;
        if (!d.moved && Math.abs(dx) > 5) {
            d.moved = true;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
        }
        if (d.moved) scrollerRef.current.scrollLeft = d.startScroll - dx;
    };

    const endDrag = () => {
        drag.current.active = false;
        setDragging(false);
    };

    return (
        <div ref={blockRef} className={inView ? "xp-in" : ""}>
            <h2 className="xp-reveal px-6 text-xl font-normal tracking-tight md:px-8 md:text-2xl">
                SHOP BY CATEGORY
            </h2>

            <div
                ref={scrollerRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClickCapture={(e) => {
                    if (drag.current.moved) {
                        e.preventDefault();
                        e.stopPropagation();
                        drag.current.moved = false;
                    }
                }}
                className={`xp-scroller mt-6 flex gap-[3px] overflow-x-auto px-6 pb-2 md:px-8 ${dragging ? "cursor-grabbing" : "cursor-grab snap-x snap-proximity"
                    }`}
                style={{ scrollPaddingLeft: "2rem" }}
            >
                {CATEGORIES.map((category, i) => (
                    <CategoryCard key={category.slug} category={category} index={i} />
                ))}
                <span aria-hidden="true" className="w-6 shrink-0 md:w-8" />
            </div>
        </div>
    );
}

const GAP_REM = 1;

const ARRIVALS_CSS = `
@keyframes na-up  { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
@keyframes na-pop { 0% { transform: scale(1) } 40% { transform: scale(1.3) } 100% { transform: scale(1) } }

.na-reveal { opacity: 0 }
.na-in .na-reveal { animation: na-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s) }
.na-pop { animation: na-pop 0.35s ease-out }

.na-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: calc((100% - ${GAP_REM}rem) / 1.6);
  gap: 0 ${GAP_REM}rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.na-grid > * {
  min-width: 0;
  scroll-snap-align: start;
}
.na-grid::-webkit-scrollbar { display: none }

@media (min-width: 768px)  { .na-grid { grid-auto-columns: calc((100% - ${GAP_REM * 2}rem) / 3) } }
@media (min-width: 1024px) { .na-grid { grid-auto-columns: calc((100% - ${GAP_REM * 3}rem) / 4) } }

@media (prefers-reduced-motion: reduce) {
  .na-reveal, .na-in .na-reveal { animation: none; opacity: 1; transform: none }
  .na-pop { animation: none }
}
`;

const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.4 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5Z" />
    </svg>
);

const Chevron = ({ dir }: { dir: "left" | "right" }) => (
    <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d={dir === "left" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
    </svg>
);

function ProductCard({ product, index }: { product: Product; index: number }) {
    const [liked, setLiked] = useState(false);
    const [popKey, setPopKey] = useState(0);
    const [imageFailed, setImageFailed] = useState(false);

    const href = `/product/${product.id}`;

    const column = Math.floor(index / 2);
    const delay = 0.2 + Math.min(column, 6) * 0.07;

    return (
        <article className="na-reveal group snap-start" style={{ ["--d" as string]: `${delay}s` }}>
            <div
                className="group relative aspect-[7/8] w-full overflow-hidden rounded-2xl"
                style={{ backgroundColor: product.tone }}
            >
                <a
                    href={href}
                    aria-label={product.name}
                    draggable={false}
                    className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900"
                >
                    {!imageFailed ? (
                        <img
                            src={product.image}
                            alt=""
                            draggable={false}
                            loading={column < 6 ? "eager" : "lazy"}
                            decoding="async"
                            onError={() => setImageFailed(true)}
                            className="h-full w-full select-none object-contain object-center transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                        />
                    ) : (
                        <span className="absolute bottom-2 left-2 text-[9px] text-neutral-900/40">
                            public{product.image}
                        </span>
                    )}
                </a>

                <button
                    type="button"
                    aria-pressed={liked}
                    aria-label={liked ? `Remove ${product.name} from saved` : `Save ${product.name}`}
                    onClick={() => {
                        setLiked((v) => !v);
                        setPopKey((n) => n + 1);
                    }}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-neutral-900 transition-colors hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neutral-900"
                >
                    <span key={popKey} className={liked && popKey > 0 ? "na-pop flex" : "flex"}>
                        <HeartIcon filled={liked} />
                    </span>
                </button>
            </div>

            <a href={href} draggable={false} className="mt-3 block">
                <h3 className="text-sm leading-tight text-neutral-800 md:text-base">{product.name}</h3>
                <p className="mt-1 text-base font-semibold text-neutral-900 md:text-lg">{product.price}</p>
            </a>

            <ul className="mt-3 flex gap-2" aria-label={`${product.colors.length} colours`}>
                {product.colors.map((color) => (
                    <li
                        key={color}
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                    />
                ))}
            </ul>
        </article>
    );
}

function ProductRow({ products }: { products: Product[] }) {
    const [blockRef, inView] = useInView<HTMLDivElement>(0.2);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const [canPrev, setCanPrev] = useState(false);
    const [canNext, setCanNext] = useState(true);

    const updateArrows = useCallback(() => {
        const el = scrollerRef.current;
        if (!el) return;
        setCanPrev(el.scrollLeft > 2);
        setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    }, []);

    useEffect(() => {
        updateArrows();
        window.addEventListener("resize", updateArrows);
        return () => window.removeEventListener("resize", updateArrows);
    }, [updateArrows]);

    const page = (direction: 1 | -1) => {
        const el = scrollerRef.current;
        if (!el) return;
        el.scrollBy({
            left: direction * (el.clientWidth + GAP_REM * 16),
            behavior: "smooth",
        });
    };

    const arrowClass =
        "flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-900";

    return (
        <div id="new-arrivals" ref={blockRef} className={`px-6 md:px-8 ${inView ? "na-in" : ""}`}>
            <div
                className="na-reveal mb-8 flex items-start justify-between gap-6"
                style={{ ["--d" as string]: "0.05s" }}
            >
                <div>
                    <h2 className="text-base font-bold uppercase tracking-wide md:text-lg">New arrivals</h2>
                    <p className="mt-1 text-sm text-neutral-500">Fresh styles. Just in.</p>
                </div>

                <div className="flex items-center gap-3">
                    <a
                        href="/shop"
                        className="mr-1 text-sm text-neutral-900 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
                    >
                        View all
                    </a>
                    <button
                        type="button"
                        aria-label="Previous products"
                        disabled={!canPrev}
                        onClick={() => page(-1)}
                        className={arrowClass}
                    >
                        <Chevron dir="left" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next products"
                        disabled={!canNext}
                        onClick={() => page(1)}
                        className={arrowClass}
                    >
                        <Chevron dir="right" />
                    </button>
                </div>
            </div>

            <div ref={scrollerRef} onScroll={updateArrows} className="na-grid">
                {products.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                ))}
            </div>
        </div>
    );
}

export default function Explore() {
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

    return (
        <section
            id="collection"
            className="flex w-full flex-col gap-20 py-16 text-neutral-900 md:gap-28"
        >
            <style>{REVEAL_CSS + ARRIVALS_CSS}</style>
            <CategoryRow />
            {loading ? (
                <div className="px-6 md:px-8">
                    <div className="h-6 w-40 animate-pulse rounded bg-neutral-200" />
                    <div className="mt-8 flex gap-4 overflow-hidden">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="aspect-[7/8] w-[40%] shrink-0 animate-pulse rounded-2xl bg-neutral-100" />
                        ))}
                    </div>
                </div>
            ) : (
                <ProductRow products={products} />
            )}
        </section>
    );
}