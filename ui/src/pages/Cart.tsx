import { Link } from "react-router-dom";
import { FREE_SHIPPING_AT, money, priceOf, useCart, vatIncluded } from "../lib/cart";
import type { CartItem } from "../lib/cart";
import ClosetLink from "./links/Closetlink";
import BagLink from "./links/Baglink";

import { UserIcon } from "../assets/icons/icons";
import { PlusIcon } from "../assets/icons/icons";
import { CloseIcon } from "../assets/icons/icons";
import { ArrowIcon } from "../assets/icons/icons";
import { MinusIcon } from "../assets/icons/icons";

const NAV_LINKS = ["Home", "Shop", "Collection", "Contact"] as const;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const CSS = `
@keyframes ct-up { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
.ct-reveal { opacity: 0; animation: ct-up 0.8s ${EASE} forwards; animation-delay: var(--d, 0s) }
@media (prefers-reduced-motion: reduce) { .ct-reveal { animation: none; opacity: 1; transform: none } }
`;

function Header() {
    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
                <Link to="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </Link>
                <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) =>
                        link === "Shop" ? (
                            <Link key={link} to="/shop" className="text-sm font-medium uppercase tracking-wide text-neutral-800 transition-colors hover:text-neutral-500">
                                {link}
                            </Link>
                        ) : (
                            <a key={link} href={`/#${link.toLowerCase()}`} className="text-sm font-medium uppercase tracking-wide text-neutral-800 transition-colors hover:text-neutral-500">
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
                    <BagLink />
                </div>
            </div>
        </header>
    );
}

function Row({ item, index }: { item: CartItem; index: number }) {
    const { setQty, changeSize, removeLine } = useCart();
    const { product: p, line } = item;
    const lineTotal = priceOf(p) * line.qty;

    return (
        <li className="ct-reveal flex gap-4 py-6 sm:gap-6" style={d(0.1 + Math.min(index, 6) * 0.06)}>
            <Link
                to={`/product/${p.id}`}
                className="h-32 w-24 shrink-0 overflow-hidden rounded-xl sm:h-40 sm:w-32"
                style={{ backgroundColor: p.tone }}
            >
                <img src={p.image} alt={p.name} draggable={false} className="h-full w-full object-contain object-center" />
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <Link to={`/product/${p.id}`} className="block truncate text-sm font-medium hover:text-neutral-500 md:text-base">
                            {p.name}
                        </Link>
                        <p className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                            <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: line.color }} />
                            {p.price}
                            {p.oldPrice && <span className="text-neutral-400 line-through">{p.oldPrice}</span>}
                        </p>
                    </div>
                    <p className="text-sm font-semibold md:text-base">{money(lineTotal)}</p>
                </div>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                    <label className="flex items-center gap-2 text-xs text-neutral-500">
                        Size
                        <select
                            value={line.size}
                            onChange={(e) => changeSize(item.key, e.target.value)}
                            className="h-9 cursor-pointer rounded-md border border-neutral-300 bg-white px-2 text-xs text-neutral-900 outline-none transition-colors hover:border-neutral-900 focus-visible:border-neutral-900"
                        >
                            {p.sizes.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </label>

                    <div className="flex h-9 items-center rounded-full bg-[#f4f3f2]">
                        <button type="button" aria-label="Decrease quantity" disabled={line.qty <= 1} onClick={() => setQty(item.key, line.qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-200 disabled:opacity-30">
                            <MinusIcon />
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                            {line.qty}
                        </span>
                        <button type="button" aria-label="Increase quantity" disabled={line.qty >= 10} onClick={() => setQty(item.key, line.qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-200 disabled:opacity-30">
                            <PlusIcon />
                        </button>
                    </div>

                    <button type="button" onClick={() => removeLine(item.key)} className="ml-auto flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900">
                        <CloseIcon /> Remove
                    </button>
                </div>
            </div>
        </li>
    );
}

export default function Cart() {
    const { items, subtotal } = useCart();

    const remaining = Math.max(0, FREE_SHIPPING_AT - subtotal);
    const unlocked = remaining === 0 && subtotal > 0;

    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-neutral-900">
            <style>{CSS}</style>
            <Header />

            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10 md:px-12 md:py-14">
                <h1 className="ct-reveal text-3xl font-semibold tracking-tight md:text-4xl" style={d(0.1)}>
                    Your Cart
                </h1>

                <Link to="/shop" className="ct-reveal mt-4 inline-block text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline" style={d(0.3)}>
                    &larr; Continue shopping
                </Link>

                {items.length === 0 ? (
                    <div className="ct-reveal mt-12 rounded-2xl bg-[#f4f3f2] px-6 py-20 text-center" style={d(0.2)}>
                        <p className="text-xl font-semibold">Your bag is empty</p>
                        <p className="mt-2 text-sm text-neutral-500">Find something you love, or try pieces on first.</p>
                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <Link to="/shop" className="rounded-sm bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700">
                                Shop now
                            </Link>
                            <Link to="/try-on" className="rounded-sm border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors hover:bg-neutral-900 hover:text-white">
                                Open fitting room
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-12 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-16">
                        <section aria-label="Items in your bag">
                            <ul className="mt-2 divide-y divide-neutral-200">
                                {items.map((item, i) => (
                                    <Row key={item.key} item={item} index={i} />
                                ))}
                            </ul>
                        </section>

                        <aside aria-label="Order summary" className="ct-reveal lg:sticky lg:top-28 lg:self-start" style={d(0.25)}>
                            <div className="rounded-2xl bg-[#f4f3f2] p-6 md:p-8">
                                <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
                                <dl className="mt-6 space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-neutral-500">Subtotal</dt>
                                        <dd>{money(subtotal)}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-neutral-500">Delivery</dt>
                                        <dd>{unlocked ? "Free" : "Calculated at checkout"}</dd>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <dt className="text-neutral-400">Includes VAT (15%)</dt>
                                        <dd className="text-neutral-400">{money(vatIncluded(subtotal))}</dd>
                                    </div>
                                </dl>
                                <div className="mt-5 flex items-baseline justify-between border-t border-neutral-300 pt-5">
                                    <span className="text-sm font-medium">Total</span>
                                    <span className="text-2xl font-semibold">{money(subtotal)}</span>
                                </div>

                                <Link
                                    to="/checkout"
                                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                                >
                                    Checkout <ArrowIcon />
                                </Link>
                                <p className="mt-4 text-center text-xs text-neutral-500">Taxes included. Delivery options are chosen at checkout.</p>
                            </div>
                        </aside>
                    </div>
                )}
            </main>

            <footer className="border-t border-neutral-200">
                <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-neutral-500 md:px-12">&copy; {new Date().getFullYear()} Demo Clothing</p>
            </footer>
        </div>
    );
}