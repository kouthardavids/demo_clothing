import { useEffect, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { SHIPPING, money, priceOf, shippingFor, useCart, vatIncluded } from "../lib/cart";
import type { CartItem, ShippingMethod } from "../lib/cart";
import PaymentScreen from "./PaymentScreen";
import { placeOrder } from "../lib/orders";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const PROVINCES = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

const CSS = `
@keyframes ck-up   { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes ck-pop  { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
.ck-reveal { opacity: 0; animation: ck-up 0.8s ${EASE} forwards; animation-delay: var(--d, 0s) }
.ck-pop { animation: ck-pop 0.6s ${EASE} both }
.ck-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.5s ${EASE} }
.ck-acc[data-open="true"] { grid-template-rows: 1fr }
.ck-acc > div { overflow: hidden; min-height: 0 }
@media (prefers-reduced-motion: reduce) {
  .ck-reveal, .ck-pop { animation: none; opacity: 1; transform: none }
  .ck-acc { transition: none }
}
`;

const Svg = ({ children, size = 16 }: { children: ReactNode; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const LockIcon = () => (
    <Svg>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
);
const CheckIcon = ({ size = 14 }: { size?: number }) => (
    <Svg size={size}>
        <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
);
const ChevronLeft = () => (
    <Svg>
        <path d="m15 5-7 7 7 7" />
    </Svg>
);
const ChevronDown = () => (
    <Svg>
        <path d="m6 9 6 6 6-6" />
    </Svg>
);

const inputCls = (err?: string) =>
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

function StepCard({
    index, title, summary, active, complete, onEdit, children,
}: {
    index: number; title: string; summary?: ReactNode; active: boolean; complete: boolean; onEdit: () => void; children: ReactNode;
}) {
    return (
        <section
            aria-label={title}
            className={`rounded-2xl border p-5 transition-colors md:p-6 ${active ? "border-neutral-900" : "border-neutral-200"}`}
        >
            <div className="flex items-center gap-4">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors ${complete ? "bg-neutral-900 text-white" : active ? "border border-neutral-900" : "bg-[#f4f3f2] text-neutral-500"
                        }`}
                >
                    {complete ? <CheckIcon /> : index}
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className={`text-base font-semibold tracking-tight ${!active && !complete ? "text-neutral-400" : ""}`}>{title}</h2>
                    {complete && !active && <div className="mt-0.5 truncate text-xs text-neutral-500">{summary}</div>}
                </div>
                {complete && !active && (
                    <button type="button" onClick={onEdit} className="text-xs text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline">
                        Edit
                    </button>
                )}
            </div>
            <div className="ck-acc" data-open={active}>
                <div>
                    <div className="pt-6">{children}</div>
                </div>
            </div>
        </section>
    );
}

const PrimaryButton = ({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        {...rest}
        className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
        {children}
    </button>
);

function Summary({ items, subtotal, shipping, total }: { items: CartItem[]; subtotal: number; shipping: number | null; total: number }) {
    return (
        <div>
            <ul className="space-y-4">
                {items.map(({ product: p, line, key }) => (
                    <li key={key} className="flex items-center gap-4">
                        <span className="relative h-16 w-14 shrink-0 rounded-lg" style={{ backgroundColor: p.tone }}>
                            <img src={p.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />
                            <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-medium text-white">
                                {line.qty}
                            </span>
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{p.name}</p>
                            <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <span className="h-2.5 w-2.5 rounded-full border border-black/10" style={{ backgroundColor: line.color }} />
                                Size {line.size}
                            </p>
                        </div>
                        <p className="text-sm">{money(priceOf(p) * line.qty)}</p>
                    </li>
                ))}
            </ul>

            <dl className="mt-6 space-y-3 border-t border-neutral-300 pt-5 text-sm">
                <div className="flex justify-between">
                    <dt className="text-neutral-500">Subtotal</dt>
                    <dd>{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-neutral-500">Delivery</dt>
                    <dd>{shipping === null ? "Chosen next" : shipping === 0 ? "Free" : money(shipping)}</dd>
                </div>
                <div className="flex justify-between text-xs">
                    <dt className="text-neutral-400">Includes VAT (15%)</dt>
                    <dd className="text-neutral-400">{money(vatIncluded(total))}</dd>
                </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-neutral-300 pt-5">
                <span className="text-sm font-medium">Total</span>
                <span className="text-2xl font-semibold">{money(total)}</span>
            </div>
        </div>
    );
}

type Order = { number: string; items: CartItem[]; subtotal: number; shipping: number; total: number; email: string; method: ShippingMethod };

const digits = (s: string) => s.replace(/\D/g, "");
const fmtCard = (s: string) => digits(s).slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
const fmtExpiry = (s: string) => {
    const v = digits(s).slice(0, 4);
    return v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
};

export default function Checkout() {
    const { items, subtotal, clear } = useCart();

    const [step, setStep] = useState(0);
    const [info, setInfo] = useState({ email: "", first: "", last: "", phone: "", street: "", suburb: "", city: "", province: "", postal: "" });
    const [method, setMethod] = useState<ShippingMethod>("standard");
    const [card, setCard] = useState({ name: "", number: "", expiry: "", cvc: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [order, setOrder] = useState<Order | null>(null);
    const [summaryOpen, setSummaryOpen] = useState(false);

    // ← NEW: payment + placing state
    const [payment, setPayment] = useState<{ amount: number; brand: string; last4: string; declined: boolean } | null>(null);
    const [placing, setPlacing] = useState(false);
    const [payError, setPayError] = useState<string | null>(null);

    const shipping = shippingFor(method, subtotal);
    const total = subtotal + shipping;

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [step, order]);

    const setI = (k: keyof typeof info) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setInfo((s) => ({ ...s, [k]: e.target.value }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };
    const setC = (k: keyof typeof card, fmt?: (s: string) => string) => (e: ChangeEvent<HTMLInputElement>) => {
        const v = fmt ? fmt(e.target.value) : e.target.value;
        setCard((s) => ({ ...s, [k]: v }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    const continueInfo = () => {
        const er: Record<string, string> = {};
        if (!/^\S+@\S+\.\S+$/.test(info.email)) er.email = "Enter a valid email address.";
        if (!info.first.trim()) er.first = "Required.";
        if (!info.last.trim()) er.last = "Required.";
        if (digits(info.phone).length < 9) er.phone = "Enter a valid phone number.";
        if (!info.street.trim()) er.street = "Required.";
        if (!info.suburb.trim()) er.suburb = "Required.";
        if (!info.city.trim()) er.city = "Required.";
        if (!info.province) er.province = "Choose a province.";
        if (!/^\d{4}$/.test(info.postal)) er.postal = "4 digits.";
        setErrors(er);
        if (Object.keys(er).length === 0) setStep(1);
    };

    // ← NEW: validates card, then opens PaymentScreen (no order yet)
    const pay = () => {
        const er: Record<string, string> = {};
        const num = digits(card.number);
        if (!card.name.trim()) er.name = "Enter the name on the card.";
        if (num.length < 13) er.number = "Enter a valid card number.";
        const m = Number(card.expiry.slice(0, 2));
        const y = Number(card.expiry.slice(3, 5));
        const now = new Date();
        const yy = now.getFullYear() % 100;
        if (card.expiry.length !== 5 || m < 1 || m > 12 || y < yy || (y === yy && m < now.getMonth() + 1))
            er.expiry = "Check the expiry date.";
        if (!/^\d{3,4}$/.test(card.cvc)) er.cvc = "3 or 4 digits.";
        setErrors(er);
        if (Object.keys(er).length > 0) return;

        setPayError(null);
        const last4 = num.slice(-4);
        const brand = num.startsWith("4") ? "Visa" : num.startsWith("5") ? "Mastercard" : "Card";
        setPayment({ amount: total, brand, last4, declined: last4 === "0000" });
    };

    // ← NEW: fires when PaymentScreen reaches "success"
    const onPaymentSuccess = async (paymentRef: string) => {
        setPlacing(true);
        try {
            const placed = await placeOrder({ items, info, method, paymentRef });
            setOrder({
                number: placed.number,
                items,
                subtotal,
                shipping,
                total,
                email: info.email,
                method,
            });
            clear();
            setPayment(null);
        } catch (err) {
            setPayment(null);
            setPayError(err instanceof Error ? err.message : "Could not place order");
        } finally {
            setPlacing(false);
        }
    };

    const header = (
        <header className="border-b border-neutral-200">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
                <Link to="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </Link>
                <p className="flex items-center gap-2 text-xs text-neutral-500">
                    <LockIcon /> Secure checkout
                </p>
            </div>
        </header>
    );

    if (order) {
        return (
            <div className="min-h-screen bg-white font-sans text-neutral-900">
                <style>{CSS}</style>
                {header}
                <main className="mx-auto w-full max-w-2xl px-6 py-16 md:py-24">
                    <div className="text-center">
                        <span className="ck-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white">
                            <CheckIcon size={24} />
                        </span>
                        <h1 className="ck-reveal mt-6 text-3xl font-semibold tracking-tight md:text-4xl" style={d(0.15)}>
                            Thank you for your order
                        </h1>
                        <p className="ck-reveal mt-3 text-sm text-neutral-500" style={d(0.25)}>
                            Order <span className="font-medium text-neutral-900">{order.number}</span> is confirmed. A receipt is on its way to{" "}
                            <span className="text-neutral-900">{order.email}</span>.
                        </p>
                        <p className="ck-reveal mt-1 text-sm text-neutral-500" style={d(0.3)}>
                            {SHIPPING[order.method].label}: {SHIPPING[order.method].eta}.
                        </p>
                    </div>

                    <div className="ck-reveal mt-10 rounded-2xl bg-[#f4f3f2] p-6 md:p-8" style={d(0.4)}>
                        <Summary items={order.items} subtotal={order.subtotal} shipping={order.shipping} total={order.total} />
                    </div>

                    <div className="ck-reveal mt-8 flex flex-wrap justify-center gap-3" style={d(0.5)}>
                        <Link to="/shop" className="rounded-sm bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-neutral-700">
                            Continue shopping
                        </Link>
                        <Link to="/try-on" className="rounded-sm border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors hover:bg-neutral-900 hover:text-white">
                            Open fitting room
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-screen bg-white font-sans text-neutral-900">
                <style>{CSS}</style>
                {header}
                <main className="mx-auto flex min-h-[50vh] max-w-6xl flex-col items-start justify-center px-6 md:px-12">
                    <h1 className="text-3xl font-semibold tracking-tight">Your bag is empty</h1>
                    <p className="mt-3 text-sm text-neutral-500">Add something to your bag before checking out.</p>
                    <Link to="/shop" className="mt-6 rounded-sm bg-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-white hover:bg-neutral-700">
                        Shop now
                    </Link>
                </main>
            </div>
        );
    }

    const shippingOptions = (Object.keys(SHIPPING) as ShippingMethod[]).map((m) => ({
        ...SHIPPING[m],
        m,
        price: shippingFor(m, subtotal),
    }));

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900">
            <style>{CSS}</style>
            {header}

            <main className="mx-auto w-full max-w-6xl px-6 py-8 md:px-12 md:py-12">
                <Link to="/cart" className="ck-reveal inline-flex items-center gap-1 text-xs text-neutral-500 transition-colors hover:text-neutral-900" style={d(0.05)}>
                    <ChevronLeft /> Back to bag
                </Link>
                <h1 className="ck-reveal mt-3 text-3xl font-semibold tracking-tight md:text-4xl" style={d(0.1)}>
                    Checkout
                </h1>

                <div className="ck-reveal mt-6 lg:hidden" style={d(0.15)}>
                    <button
                        type="button"
                        aria-expanded={summaryOpen}
                        onClick={() => setSummaryOpen((o) => !o)}
                        className="flex w-full items-center justify-between rounded-2xl bg-[#f4f3f2] px-5 py-4 text-sm font-medium"
                    >
                        <span className="flex items-center gap-2">
                            Order summary
                            <span className="transition-transform duration-500" style={{ transform: summaryOpen ? "rotate(180deg)" : "none" }}>
                                <ChevronDown />
                            </span>
                        </span>
                        <span>{money(total)}</span>
                    </button>
                    <div className="ck-acc" data-open={summaryOpen}>
                        <div>
                            <div className="rounded-2xl bg-[#f4f3f2] p-5 mt-2">
                                <Summary items={items} subtotal={subtotal} shipping={step >= 1 ? shipping : null} total={total} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
                    <div className="space-y-4">
                        {/* 1. Information — unchanged */}
                        <div className="ck-reveal" style={d(0.2)}>
                            <StepCard
                                index={1}
                                title="Information"
                                active={step === 0}
                                complete={step > 0}
                                onEdit={() => setStep(0)}
                                summary={`${info.first} ${info.last} · ${info.street}, ${info.city}`}
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Email" error={errors.email} className="sm:col-span-2">
                                        <input type="email" autoComplete="email" value={info.email} onChange={setI("email")} placeholder="you@example.com" className={inputCls(errors.email)} />
                                    </Field>
                                    <Field label="First name" error={errors.first}>
                                        <input autoComplete="given-name" value={info.first} onChange={setI("first")} className={inputCls(errors.first)} />
                                    </Field>
                                    <Field label="Last name" error={errors.last}>
                                        <input autoComplete="family-name" value={info.last} onChange={setI("last")} className={inputCls(errors.last)} />
                                    </Field>
                                    <Field label="Phone" error={errors.phone} className="sm:col-span-2">
                                        <input type="tel" autoComplete="tel" value={info.phone} onChange={setI("phone")} placeholder="082 123 4567" className={inputCls(errors.phone)} />
                                    </Field>
                                    <Field label="Street address" error={errors.street} className="sm:col-span-2">
                                        <input autoComplete="address-line1" value={info.street} onChange={setI("street")} className={inputCls(errors.street)} />
                                    </Field>
                                    <Field label="Suburb" error={errors.suburb}>
                                        <input autoComplete="address-level3" value={info.suburb} onChange={setI("suburb")} className={inputCls(errors.suburb)} />
                                    </Field>
                                    <Field label="City" error={errors.city}>
                                        <input autoComplete="address-level2" value={info.city} onChange={setI("city")} className={inputCls(errors.city)} />
                                    </Field>
                                    <Field label="Province" error={errors.province}>
                                        <select value={info.province} onChange={setI("province")} className={inputCls(errors.province)}>
                                            <option value="">Select</option>
                                            {PROVINCES.map((p) => (
                                                <option key={p}>{p}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Postal code" error={errors.postal}>
                                        <input inputMode="numeric" autoComplete="postal-code" maxLength={4} value={info.postal} onChange={setI("postal")} className={inputCls(errors.postal)} />
                                    </Field>
                                </div>
                                <PrimaryButton type="button" onClick={continueInfo}>
                                    Continue to delivery
                                </PrimaryButton>
                            </StepCard>
                        </div>

                        {/* 2. Delivery — unchanged */}
                        <div className="ck-reveal" style={d(0.28)}>
                            <StepCard
                                index={2}
                                title="Delivery"
                                active={step === 1}
                                complete={step > 1}
                                onEdit={() => setStep(1)}
                                summary={`${SHIPPING[method].label} · ${shipping === 0 ? "Free" : money(shipping)}`}
                            >
                                <div role="radiogroup" aria-label="Delivery method" className="space-y-3">
                                    {shippingOptions.map(({ m, label, eta, price }) => (
                                        <button
                                            key={m}
                                            type="button"
                                            role="radio"
                                            aria-checked={method === m}
                                            onClick={() => setMethod(m)}
                                            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 ${method === m ? "border-neutral-900 bg-[#f4f3f2]" : "border-neutral-200 hover:border-neutral-400"
                                                }`}
                                        >
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${method === m ? "border-neutral-900" : "border-neutral-300"}`}>
                                                <span className={`h-2.5 w-2.5 rounded-full bg-neutral-900 transition-transform ${method === m ? "scale-100" : "scale-0"}`} />
                                            </span>
                                            <span className="flex-1">
                                                <span className="block text-sm font-medium">{label}</span>
                                                <span className="block text-xs text-neutral-500">{eta}</span>
                                            </span>
                                            <span className="text-sm font-medium">{price === 0 ? "Free" : money(price)}</span>
                                        </button>
                                    ))}
                                </div>
                                <PrimaryButton type="button" onClick={() => setStep(2)}>
                                    Continue to payment
                                </PrimaryButton>
                            </StepCard>
                        </div>

                        {/* 3. Payment — pay button opens PaymentScreen */}
                        <div className="ck-reveal" style={d(0.36)}>
                            <StepCard index={3} title="Payment" active={step === 2} complete={false} onEdit={() => setStep(2)}>
                                <p className="mb-5 rounded-lg bg-[#f4f3f2] px-4 py-3 text-xs leading-relaxed text-neutral-600">
                                    This is a demo checkout. Use any card. Ends in <span className="font-medium text-neutral-900">0000</span> to simulate a decline.
                                    OTP is <span className="font-medium text-neutral-900">123456</span>.
                                </p>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Card number" error={errors.number} className="sm:col-span-2">
                                        <input inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000 0000" value={card.number} onChange={setC("number", fmtCard)} className={inputCls(errors.number)} />
                                    </Field>
                                    <Field label="Name on card" error={errors.name} className="sm:col-span-2">
                                        <input autoComplete="off" value={card.name} onChange={setC("name")} className={inputCls(errors.name)} />
                                    </Field>
                                    <Field label="Expiry" error={errors.expiry}>
                                        <input inputMode="numeric" autoComplete="off" placeholder="MM/YY" value={card.expiry} onChange={setC("expiry", fmtExpiry)} className={inputCls(errors.expiry)} />
                                    </Field>
                                    <Field label="CVC" error={errors.cvc}>
                                        <input inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4} value={card.cvc} onChange={setC("cvc", (s) => digits(s).slice(0, 4))} className={inputCls(errors.cvc)} />
                                    </Field>
                                </div>

                                {payError && (
                                    <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs text-red-700" role="alert">
                                        {payError}
                                    </p>
                                )}

                                <PrimaryButton type="button" onClick={pay} disabled={!!payment || placing}>
                                    {placing ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Placing order…
                                        </>
                                    ) : (
                                        <>
                                            <LockIcon /> Pay {money(total)}
                                        </>
                                    )}
                                </PrimaryButton>
                            </StepCard>
                        </div>
                    </div>

                    <aside aria-label="Order summary" className="ck-reveal hidden lg:sticky lg:top-8 lg:block lg:self-start" style={d(0.3)}>
                        <div className="rounded-2xl bg-[#f4f3f2] p-8">
                            <h2 className="mb-6 text-lg font-semibold tracking-tight">Order summary</h2>
                            <Summary items={items} subtotal={subtotal} shipping={step >= 1 ? shipping : null} total={total} />
                        </div>
                    </aside>
                </div>
            </main>

            {/* PaymentScreen overlay — mounts only when `pay()` succeeds */}
            {payment && (
                <PaymentScreen
                    amount={payment.amount}
                    brand={payment.brand}
                    last4={payment.last4}
                    declined={payment.declined}
                    onSuccess={onPaymentSuccess}
                    onFail={(reason) => {
                        setPayment(null);
                        setPayError(reason);
                    }}
                    onCancel={() => setPayment(null)}
                />
            )}
        </div>
    );
}