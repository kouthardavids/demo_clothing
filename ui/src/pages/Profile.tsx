import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getProduct } from "../lib/products";
import { money, useCart } from "../lib/cart";
import { useAccount } from "../lib/profile";
import type { Address, OrderRecord } from "../lib/profile";
import { useTryOn } from "./Tryon";
import ClosetLink from "./links/Closetlink";
import BagLink from "./links/Baglink";

import { UserIcon } from "../assets/icons/icons";
import { PlusIcon } from "../assets/icons/icons";
import { CloseIcon } from "../assets/icons/icons";
import { ChevronDown } from "../assets/icons/icons";

const NAV_LINKS = ["Home", "Shop", "Collection", "About", "Contact"] as const;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const PROVINCES = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const LABELS = ["Home", "Work", "Other"];

// same keys the fitting room uses
const PHOTOS_KEY = "demo-clothing:try-on:photos:v1";
const GENERATED_KEY = "demo-clothing:try-on:generated:v2";

type StoredPhoto = { id: string; kind: "body" | "face"; dataUrl: string };
type StoredLook = { id: string; resultDataUrl: string; itemIds: number[]; createdAt: number };

const readList = <T,>(key: string): T[] => {
    try {
        const raw = window.localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
const writeList = (key: string, list: unknown[]) => {
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
        /* ignore */
    }
};

const CSS = `
@keyframes pf-up   { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes pf-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes pf-toast { 0% { opacity: 0; transform: translate(-50%, 8px) } 10%, 85% { opacity: 1; transform: translate(-50%, 0) } 100% { opacity: 0; transform: translate(-50%, 4px) } }
.pf-reveal { opacity: 0; animation: pf-up 0.8s ${EASE} forwards; animation-delay: var(--d, 0s) }
.pf-fade   { animation: pf-fade 0.4s ease-out both }
.pf-toast  { animation: pf-toast 2.2s ease forwards }
.pf-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s ${EASE} }
.pf-acc[data-open="true"] { grid-template-rows: 1fr }
.pf-acc > div { overflow: hidden; min-height: 0 }
@media (prefers-reduced-motion: reduce) {
  .pf-reveal { animation: none; opacity: 1; transform: none }
  .pf-fade, .pf-toast { animation: none }
  .pf-acc { transition: none }
}
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
                    <Link to="/account" aria-label="Account" aria-current="page">
                        <UserIcon />
                    </Link>
                    <ClosetLink />
                    <BagLink />
                </div>
            </div>
        </header>
    );
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const fieldCls = (err?: string) =>
    `h-12 w-full rounded-md border bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 ${err ? "border-red-400" : "border-neutral-300 hover:border-neutral-400"
    }`;

function Field({ label, error, children, className = "" }: { label: string; error?: string; children: ReactNode; className?: string }) {
    return (
        <label className={`block ${className}`}>
            <span className="text-xs text-neutral-500">{label}</span>
            <div className="mt-1.5">{children}</div>
            {error && (
                <span className="mt-1 block text-xs text-red-600" role="alert">
                    {error}
                </span>
            )}
        </label>
    );
}

const Empty = ({ title, text, action }: { title: string; text: string; action?: ReactNode }) => (
    <div className="pf-fade rounded-2xl bg-[#f4f3f2] px-6 py-14 text-center">
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-neutral-500">{text}</p>
        {action && <div className="mt-6">{action}</div>}
    </div>
);

const darkBtn =
    "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50";
const lineBtn =
    "inline-flex h-12 items-center justify-center gap-2 rounded-md border border-neutral-900 px-6 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

function DetailsTab({ say }: { say: (t: string) => void }) {
    const { account, saveProfile } = useAccount();
    const [form, setForm] = useState(account.profile);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((s) => ({ ...s, [k]: e.target.value }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (!form.first.trim()) er.first = "Required.";
        if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Enter a valid email address.";
        setErrors(er);
        if (Object.keys(er).length) return;
        saveProfile(form);
        say("Details saved");
    };

    return (
        <form onSubmit={submit} noValidate className="pf-fade max-w-xl">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" error={errors.first}>
                    <input autoComplete="given-name" value={form.first} onChange={set("first")} className={fieldCls(errors.first)} />
                </Field>
                <Field label="Last name">
                    <input autoComplete="family-name" value={form.last} onChange={set("last")} className={fieldCls()} />
                </Field>
                <Field label="Email" error={errors.email} className="sm:col-span-2">
                    <input type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={fieldCls(errors.email)} />
                </Field>
                <Field label="Phone">
                    <input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} className={fieldCls()} />
                </Field>
                <Field label="Your usual size">
                    <select value={form.size} onChange={set("size")} className={`${fieldCls()} cursor-pointer`}>
                        <option value="">Not set</option>
                        {SIZES.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </Field>
            </div>

            <label className="mt-6 flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" className="peer sr-only" checked={form.marketing} onChange={(e) => setForm((s) => ({ ...s, marketing: e.target.checked }))} />
                <span className="relative h-6 w-11 shrink-0 rounded-full bg-neutral-300 transition-colors peer-checked:bg-neutral-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-neutral-900 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                Email me about new arrivals and offers
            </label>

            <button type="submit" className={`${darkBtn} mt-8 w-full sm:w-auto`}>
                Save changes
            </button>
        </form>
    );
}

const blankAddr = (): Address => ({ id: "", label: "Home", street: "", suburb: "", city: "", province: "", postal: "", isDefault: false });

function AddressesTab({ say }: { say: (t: string) => void }) {
    const { account, saveAddress, removeAddress, makeDefault } = useAccount();
    const [editing, setEditing] = useState<Address | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (k: keyof Address) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setEditing((s) => (s ? { ...s, [k]: e.target.value } : s));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!editing) return;
        const er: Record<string, string> = {};
        if (!editing.street.trim()) er.street = "Required.";
        if (!editing.suburb.trim()) er.suburb = "Required.";
        if (!editing.city.trim()) er.city = "Required.";
        if (!editing.province) er.province = "Choose a province.";
        if (!/^\d{4}$/.test(editing.postal)) er.postal = "4 digits.";
        setErrors(er);
        if (Object.keys(er).length) return;
        saveAddress({ ...editing, id: editing.id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}` });
        setEditing(null);
        say("Address saved");
    };

    const open = editing !== null;

    return (
        <div className="pf-fade max-w-2xl">
            {account.addresses.length === 0 && !open && (
                <Empty title="No saved addresses" text="Save one and checkout will fill it in for you." />
            )}

            <ul className="space-y-3">
                {account.addresses.map((a) => (
                    <li key={a.id} className="rounded-2xl border border-neutral-200 p-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="flex items-center gap-2 text-sm font-semibold">
                                    {a.label}
                                    {a.isDefault && <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">Default</span>}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                                    {a.street}, {a.suburb}
                                    <br />
                                    {a.city}, {a.province}, {a.postal}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-4 text-xs">
                                <button type="button" onClick={() => { setErrors({}); setEditing(a); }} className="text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline">
                                    Edit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        removeAddress(a.id);
                                        if (editing?.id === a.id) setEditing(null);
                                        say("Address removed");
                                    }}
                                    className="text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                        {!a.isDefault && (
                            <button type="button" onClick={() => makeDefault(a.id)} className="mt-3 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">
                                Make default
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            {!open && (
                <button type="button" onClick={() => { setErrors({}); setEditing(blankAddr()); }} className={`${lineBtn} mt-4`}>
                    <PlusIcon /> Add an address
                </button>
            )}

            <div className="pf-acc" data-open={open}>
                <div>
                    {editing && (
                        <form onSubmit={submit} noValidate className="mt-4 rounded-2xl bg-[#f4f3f2] p-5 md:p-6">
                            <h3 className="text-base font-semibold tracking-tight">{editing.id ? "Edit address" : "New address"}</h3>
                            <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                <Field label="Label">
                                    <select value={editing.label} onChange={set("label")} className={`${fieldCls()} cursor-pointer`}>
                                        {LABELS.map((l) => (
                                            <option key={l}>{l}</option>
                                        ))}
                                    </select>
                                </Field>
                                <span className="hidden sm:block" />
                                <Field label="Street address" error={errors.street} className="sm:col-span-2">
                                    <input autoComplete="address-line1" value={editing.street} onChange={set("street")} className={fieldCls(errors.street)} />
                                </Field>
                                <Field label="Suburb" error={errors.suburb}>
                                    <input value={editing.suburb} onChange={set("suburb")} className={fieldCls(errors.suburb)} />
                                </Field>
                                <Field label="City" error={errors.city}>
                                    <input value={editing.city} onChange={set("city")} className={fieldCls(errors.city)} />
                                </Field>
                                <Field label="Province" error={errors.province}>
                                    <select value={editing.province} onChange={set("province")} className={`${fieldCls(errors.province)} cursor-pointer`}>
                                        <option value="">Select</option>
                                        {PROVINCES.map((p) => (
                                            <option key={p}>{p}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Postal code" error={errors.postal}>
                                    <input inputMode="numeric" maxLength={4} value={editing.postal} onChange={set("postal")} className={fieldCls(errors.postal)} />
                                </Field>
                            </div>
                            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
                                <input type="checkbox" checked={editing.isDefault} onChange={(e) => setEditing((s) => (s ? { ...s, isDefault: e.target.checked } : s))} className="h-4 w-4 accent-neutral-900" />
                                Use as my default address
                            </label>
                            <div className="mt-6 flex gap-3">
                                <button type="submit" className={darkBtn}>Save address</button>
                                <button type="button" onClick={() => setEditing(null)} className={lineBtn}>Cancel</button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function OrdersTab({ say }: { say: (t: string) => void }) {
    const { account } = useAccount();
    const { addItem } = useCart();
    const navigate = useNavigate();
    const [openNo, setOpenNo] = useState<string | null>(null);

    const reorder = (o: OrderRecord) => {
        let added = 0;
        o.items.forEach((l) => {
            if (getProduct(l.id)) {
                addItem({ id: l.id, size: l.size, color: l.color, qty: l.qty });
                added += 1;
            }
        });
        if (added === 0) return say("Those items are no longer available");
        navigate("/cart");
    };

    if (account.orders.length === 0) {
        return (
            <Empty
                title="No orders yet"
                text="When you place an order it will show up here."
                action={<Link to="/shop" className={darkBtn}>Shop now</Link>}
            />
        );
    }

    return (
        <ul className="pf-fade max-w-3xl space-y-3">
            {account.orders.map((o) => {
                const open = openNo === o.number;
                const count = o.items.reduce((n, l) => n + l.qty, 0);
                return (
                    <li key={o.number} className="rounded-2xl border border-neutral-200">
                        <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenNo(open ? null : o.number)}
                            className="flex w-full items-center gap-4 p-4 text-left md:p-5"
                        >
                            <div className="flex -space-x-3">
                                {o.items.slice(0, 3).map((l, i) => (
                                    <span key={i} className="h-12 w-12 overflow-hidden rounded-lg border-2 border-white" style={{ backgroundColor: l.tone }}>
                                        <img src={l.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                                    </span>
                                ))}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{o.number}</p>
                                <p className="text-xs text-neutral-500">
                                    {new Date(o.placedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} &middot; {count}{" "}
                                    {count === 1 ? "item" : "items"}
                                </p>
                            </div>
                            <p className="text-sm font-semibold">{money(o.total)}</p>
                            <span className="text-neutral-500 transition-transform duration-500" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                                <ChevronDown />
                            </span>
                        </button>

                        <div className="pf-acc" data-open={open}>
                            <div>
                                <div className="border-t border-neutral-200 p-4 md:p-5">
                                    <ul className="space-y-4">
                                        {o.items.map((l, i) => (
                                            <li key={i} className="flex items-center gap-4">
                                                <span className="h-14 w-12 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: l.tone }}>
                                                    <img src={l.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium">{l.name}</p>
                                                    <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                                                        <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: l.color }} />
                                                        Size {l.size} &middot; Qty {l.qty}
                                                    </p>
                                                </div>
                                                <p className="text-sm">{money(l.price * l.qty)}</p>
                                            </li>
                                        ))}
                                    </ul>
                                    <dl className="mt-5 space-y-2 border-t border-neutral-200 pt-4 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="text-neutral-500">Subtotal</dt>
                                            <dd>{money(o.subtotal)}</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="text-neutral-500">Delivery ({o.method})</dt>
                                            <dd>{o.shipping === 0 ? "Free" : money(o.shipping)}</dd>
                                        </div>
                                        <div className="flex justify-between font-semibold">
                                            <dt>Total</dt>
                                            <dd>{money(o.total)}</dd>
                                        </div>
                                    </dl>
                                    <button type="button" onClick={() => reorder(o)} className={`${lineBtn} mt-5`}>
                                        Order again
                                    </button>
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

function DataTab({ say }: { say: (t: string) => void }) {
    const { reset } = useAccount();
    const [photos, setPhotos] = useState<StoredPhoto[]>(() => readList<StoredPhoto>(PHOTOS_KEY));
    const [looks, setLooks] = useState<StoredLook[]>(() => readList<StoredLook>(GENERATED_KEY));
    const [confirm, setConfirm] = useState<"media" | "account" | null>(null);

    const removePhoto = (id: string) => {
        const next = photos.filter((p) => p.id !== id);
        setPhotos(next);
        writeList(PHOTOS_KEY, next);
    };
    const removeLook = (id: string) => {
        const next = looks.filter((l) => l.id !== id);
        setLooks(next);
        writeList(GENERATED_KEY, next);
    };
    const deleteMedia = () => {
        setPhotos([]);
        setLooks([]);
        writeList(PHOTOS_KEY, []);
        writeList(GENERATED_KEY, []);
        setConfirm(null);
        say("Photos and looks deleted");
    };

    return (
        <div className="pf-fade max-w-3xl space-y-10">
            <section>
                <h3 className="text-base font-semibold tracking-tight">Your photos ({photos.length})</h3>
                <p className="mt-1 text-sm text-neutral-500">Used only by the fitting room.</p>
                {photos.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-3">
                        {photos.map((p) => (
                            <li key={p.id} className="relative">
                                <span className="block h-28 w-20 overflow-hidden rounded-lg bg-[#f4f3f2]">
                                    <img src={p.dataUrl} alt="" draggable={false} className="h-full w-full object-cover object-top" />
                                </span>
                                <span className="mt-1 block text-center text-[10px] text-neutral-500">{p.kind === "face" ? "Face" : "Body"}</span>
                                <button
                                    type="button"
                                    aria-label="Delete photo"
                                    onClick={() => removePhoto(p.id)}
                                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-100"
                                >
                                    <CloseIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-4 rounded-xl bg-[#f4f3f2] p-4 text-sm text-neutral-600">No photos saved.</p>
                )}
            </section>

            <section>
                <h3 className="text-base font-semibold tracking-tight">Generated looks ({looks.length})</h3>
                {looks.length > 0 ? (
                    <ul className="mt-4 flex flex-wrap gap-3">
                        {looks.map((l) => (
                            <li key={l.id} className="relative">
                                <span className="block h-28 w-20 overflow-hidden rounded-lg bg-[#f4f3f2]">
                                    <img src={l.resultDataUrl} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                                </span>
                                <button
                                    type="button"
                                    aria-label="Delete look"
                                    onClick={() => removeLook(l.id)}
                                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-100"
                                >
                                    <CloseIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="mt-4 rounded-xl bg-[#f4f3f2] p-4 text-sm text-neutral-600">No looks generated yet.</p>
                )}
            </section>

            <section className="rounded-2xl bg-[#f4f3f2] p-5 md:p-6">
                <h3 className="text-base font-semibold tracking-tight">Privacy</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                    Everything on this page is saved in this browser only. When you press Dress me, your body photo, face photo and the chosen pieces are sent to an AI image service to
                    create the look, and nothing is kept by us afterwards. You can delete your photos and looks at any time.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                    {confirm === "media" ? (
                        <>
                            <button type="button" onClick={deleteMedia} className="inline-flex h-12 items-center rounded-md bg-red-600 px-6 text-sm font-medium text-white transition-colors hover:bg-red-700">
                                Yes, delete photos and looks
                            </button>
                            <button type="button" onClick={() => setConfirm(null)} className={lineBtn}>Cancel</button>
                        </>
                    ) : confirm === "account" ? (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    reset();
                                    deleteMedia();
                                    setConfirm(null);
                                    say("Account data cleared");
                                    window.setTimeout(() => window.location.reload(), 700);
                                }}
                                className="inline-flex h-12 items-center rounded-md bg-red-600 px-6 text-sm font-medium text-white transition-colors hover:bg-red-700"
                            >
                                Yes, clear everything
                            </button>
                            <button type="button" onClick={() => setConfirm(null)} className={lineBtn}>Cancel</button>
                        </>
                    ) : (
                        <>
                            <button type="button" disabled={photos.length + looks.length === 0} onClick={() => setConfirm("media")} className={`${lineBtn} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900`}>
                                Delete photos and looks
                            </button>
                            <button type="button" onClick={() => setConfirm("account")} className={lineBtn}>
                                Clear all my account data
                            </button>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

type Tab = "details" | "addresses" | "orders" | "data";
const TAB_LABELS: Record<Tab, string> = { details: "Details", addresses: "Addresses", orders: "Orders", data: "Photos & data" };

export default function Profile() {
    const { account } = useAccount();
    const { closet, outfits } = useTryOn();
    const [tab, setTab] = useState<Tab>("details");
    const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

    const say = (text: string) => setToast({ id: Date.now(), text });

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);
    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [toast]);

    const { first, last, email } = account.profile;
    const fullName = `${first} ${last}`.trim();
    const initials = (first[0] ?? "") + (last[0] ?? "") || (email[0] ?? "");

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900">
            <style>{CSS}</style>
            <Header />

            <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-12 md:py-14">
                <nav aria-label="Breadcrumb" className="pf-reveal text-xs text-neutral-500" style={d(0.05)}>
                    <Link to="/" className="hover:text-neutral-900">Home</Link>
                    <span className="mx-1.5">/</span>
                    <span className="text-neutral-900">My account</span>
                </nav>

                {/* Intro */}
                <div className="pf-reveal mt-6 flex flex-wrap items-center gap-5" style={d(0.1)}>
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xl font-medium uppercase text-white md:h-20 md:w-20 md:text-2xl">
                        {initials || <UserIcon />}
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{fullName || "My account"}</h1>
                        <p className="mt-1 text-sm text-neutral-500">{email || "Add your details to get started"}</p>
                    </div>
                </div>

                {/* Stats */}
                <ul className="pf-reveal mt-8 grid max-w-xl grid-cols-3 gap-3" style={d(0.15)}>
                    {[
                        { n: account.orders.length, label: "Orders", go: "orders" as Tab },
                        { n: closet.length, label: "In closet", go: null },
                        { n: outfits.length, label: "Saved outfits", go: null },
                    ].map((s) => {
                        const body = (
                            <>
                                <span className="block text-2xl font-semibold">{s.n}</span>
                                <span className="block text-xs text-neutral-500">{s.label}</span>
                            </>
                        );
                        return (
                            <li key={s.label}>
                                {s.go ? (
                                    <button type="button" onClick={() => setTab(s.go!)} className="block w-full rounded-2xl bg-[#f4f3f2] p-4 text-left transition-colors hover:bg-neutral-200">
                                        {body}
                                    </button>
                                ) : (
                                    <Link to="/try-on" className="block rounded-2xl bg-[#f4f3f2] p-4 transition-colors hover:bg-neutral-200">
                                        {body}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ul>

                {/* Tabs */}
                <div role="tablist" aria-label="Account sections" className="pf-reveal mt-12 flex gap-8 overflow-x-auto border-b border-neutral-200" style={d(0.2)}>
                    {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
                        <button
                            key={t}
                            type="button"
                            role="tab"
                            aria-selected={tab === t}
                            onClick={() => setTab(t)}
                            className={`-mb-px shrink-0 border-b-2 pb-3 text-sm font-medium transition-colors ${tab === t ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-900"
                                }`}
                        >
                            {TAB_LABELS[t]}
                        </button>
                    ))}
                </div>

                <div key={tab} className="mt-8" role="tabpanel">
                    {tab === "details" && <DetailsTab say={say} />}
                    {tab === "addresses" && <AddressesTab say={say} />}
                    {tab === "orders" && <OrdersTab say={say} />}
                    {tab === "data" && <DataTab say={say} />}
                </div>
            </main>

            <footer className="mt-16 border-t border-neutral-200">
                <p className="mx-auto max-w-6xl px-6 py-5 text-xs text-neutral-500 md:px-12">&copy; {new Date().getFullYear()} Demo Clothing</p>
            </footer>

            {toast && (
                <p key={toast.id} role="status" className="pf-toast fixed bottom-6 left-1/2 z-[60] max-w-[90%] rounded-full bg-neutral-900 px-5 py-2.5 text-center text-xs font-medium text-white shadow-lg">
                    {toast.text}
                </p>
            )}
        </div>
    );
}