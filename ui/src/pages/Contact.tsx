import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { PinIcon } from "../assets/icons/icons";
import { PhoneIcon } from "../assets/icons/icons";
import { MailIcon } from "../assets/icons/icons";
import { ArrowIcon } from "../assets/icons/icons";
import { CheckIcon } from "../assets/icons/icons";
import { CONTACT_CSS } from "../styles";

const STORE = {
    name: "Demo Clothing",
    address: ["123 Example Street", "Suburb, City, 0000"],
    phone: "+27 11 000 0000",
    email: "hello@democlothing.com",
    mapQuery: "South Africa",
    timezone: "Africa/Johannesburg",
    socials: [
        { label: "Instagram", href: "#" },
        { label: "Facebook", href: "#" },
        { label: "TikTok", href: "#" },
    ],
};

const HOURS: { label: string; days: number[]; open?: number; close?: number }[] = [
    { label: "Mon to Fri", days: [1, 2, 3, 4, 5], open: 9 * 60, close: 17 * 60 + 30 },
    { label: "Saturday", days: [6], open: 9 * 60, close: 14 * 60 },
    { label: "Sunday", days: [0] },
];
const fmt = (m?: number) => (m === undefined ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);

const d = (s: number) => ({ ["--d" as string]: `${s}s` });

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

function storeNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: STORE.timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

function useOpenStatus() {
    const [now, setNow] = useState(storeNow);
    useEffect(() => {
        const t = window.setInterval(() => setNow(storeNow()), 60_000);
        return () => window.clearInterval(t);
    }, []);
    const today = HOURS.find((h) => h.days.includes(now.day));
    const open = !!today && today.open !== undefined && today.close !== undefined && now.minutes >= today.open && now.minutes < today.close;
    return { open, today, day: now.day };
}

function InfoRow({ icon, label, value, href }: { icon: ReactNode; label: string; value: ReactNode; href?: string }) {
    const body = (
        <>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f3f2] text-neutral-900 transition-colors group-hover:bg-neutral-900 group-hover:text-white">
                {icon}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-xs text-neutral-500">{label}</span>
                <span className="mt-0.5 block text-sm font-medium md:text-base">{value}</span>
            </span>
            {href && (
                <span className="text-neutral-300 transition-all duration-300 group-hover:translate-x-1 group-hover:text-neutral-900">
                    <ArrowIcon />
                </span>
            )}
        </>
    );
    const cls = "group flex items-center gap-4 border-b border-neutral-200 py-5 first:border-t";
    return href ? (
        <a href={href} className={`${cls} focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900`}>
            {body}
        </a>
    ) : (
        <div className={cls}>{body}</div>
    );
}

const fieldCls = (err?: string) =>
    `w-full rounded-md border bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 ${err ? "border-red-400" : "border-neutral-300 hover:border-neutral-400"
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

const TOPICS = ["General question", "Order or delivery", "Returns and exchanges", "Sizing help", "Try-on feature", "Something else"];

export default function Contact() {
    const [ref, inView] = useInView<HTMLElement>(0.12);
    const status = useOpenStatus();

    const [form, setForm] = useState({ name: "", email: "", phone: "", topic: TOPICS[0], message: "" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((s) => ({ ...s, [k]: e.target.value }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const er: Record<string, string> = {};
        if (!form.name.trim()) er.name = "Please tell us your name.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Enter a valid email address.";
        if (form.message.trim().length < 10) er.message = "Write at least a short sentence.";
        setErrors(er);
        if (Object.keys(er).length) return;

        setSending(true);

        window.setTimeout(() => {
            setSending(false);
            setSent(true);
        }, 1200);
    };

    const reset = () => {
        setForm({ name: "", email: "", phone: "", topic: TOPICS[0], message: "" });
        setSent(false);
    };

    const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(STORE.mapQuery)}&z=15&output=embed`;
    const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(STORE.mapQuery)}`;

    return (
        <section id="contact" ref={ref} className={`scroll-mt-4 bg-white py-20 text-neutral-900 md:py-28 ${inView ? "cn-in" : ""}`}>
            <style>{CONTACT_CSS}</style>

            <div className="mx-auto max-w-6xl px-6 md:px-12">
                {/* Heading */}
                <div className="cn-reveal max-w-xl" style={d(0.05)}>
                    <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">Contact</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Let&rsquo;s talk.</h2>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-500 md:text-base">
                        Questions about sizing, an order, or the fitting room? Send us a message and we&rsquo;ll get back to you within one working day.
                    </p>
                </div>

                <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
                    {/* Left: details */}
                    <div className="cn-reveal" style={d(0.15)}>
                        <InfoRow
                            icon={<PinIcon />}
                            label="Visit us"
                            href={directions}
                            value={
                                <>
                                    {STORE.address[0]}
                                    <br />
                                    <span className="font-normal text-neutral-500">{STORE.address[1]}</span>
                                </>
                            }
                        />
                        <InfoRow icon={<PhoneIcon />} label="Call us" href={`tel:${STORE.phone.replace(/\s/g, "")}`} value={STORE.phone} />
                        <InfoRow icon={<MailIcon />} label="Email us" href={`mailto:${STORE.email}`} value={STORE.email} />

                        {/* Hours */}
                        <div className="mt-8 rounded-2xl bg-[#f4f3f2] p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold">Opening hours</h3>
                                <span className="flex items-center gap-2 text-xs font-medium">
                                    <span className={`h-2 w-2 rounded-full ${status.open ? "cn-live bg-emerald-600" : "bg-neutral-400"}`} />
                                    {status.open ? "Open now" : "Closed now"}
                                </span>
                            </div>
                            <ul className="mt-4 space-y-2.5 text-sm">
                                {HOURS.map((h) => {
                                    const today = h.days.includes(status.day);
                                    return (
                                        <li key={h.label} className={`flex justify-between ${today ? "font-medium text-neutral-900" : "text-neutral-500"}`}>
                                            <span>{h.label}</span>
                                            <span>{h.open === undefined ? "Closed" : `${fmt(h.open)} to ${fmt(h.close)}`}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            {STORE.socials.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.href}
                                    className="rounded-full border border-neutral-300 px-4 py-2 text-xs font-medium transition-colors hover:border-neutral-900 hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="cn-reveal rounded-2xl bg-[#f4f3f2] p-6 md:p-10" style={d(0.25)}>
                        {sent ? (
                            <div className="flex min-h-[26rem] flex-col items-center justify-center text-center">
                                <span className="cn-pop flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white">
                                    <CheckIcon />
                                </span>
                                <h3 className="mt-6 text-2xl font-semibold tracking-tight">Message sent</h3>
                                <p className="mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">
                                    Thanks {form.name.split(" ")[0]}, we&rsquo;ll reply to {form.email} within one working day.
                                </p>
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="mt-8 rounded-sm border border-neutral-900 px-6 py-3 text-[11px] font-medium uppercase tracking-wider transition-colors hover:bg-neutral-900 hover:text-white"
                                >
                                    Send another
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={submit} noValidate>
                                <h3 className="text-xl font-semibold tracking-tight">Send us a message</h3>
                                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                    <Field label="Your name" error={errors.name}>
                                        <input autoComplete="name" value={form.name} onChange={set("name")} className={`${fieldCls(errors.name)} h-12`} />
                                    </Field>
                                    <Field label="Email" error={errors.email}>
                                        <input type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={`${fieldCls(errors.email)} h-12`} />
                                    </Field>
                                    <Field label="Phone (optional)">
                                        <input type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} className={`${fieldCls()} h-12`} />
                                    </Field>
                                    <Field label="Topic">
                                        <select value={form.topic} onChange={set("topic")} className={`${fieldCls()} h-12 cursor-pointer`}>
                                            {TOPICS.map((t) => (
                                                <option key={t}>{t}</option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field label="Message" error={errors.message} className="sm:col-span-2">
                                        <textarea
                                            rows={5}
                                            value={form.message}
                                            onChange={set("message")}
                                            placeholder="How can we help?"
                                            className={`${fieldCls(errors.message)} resize-none py-3 leading-relaxed`}
                                        />
                                    </Field>
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {sending ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Sending…
                                        </>
                                    ) : (
                                        <>
                                            Send message <ArrowIcon />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                <div className="cn-reveal group relative mt-16 h-[22rem] overflow-hidden rounded-2xl bg-[#f4f3f2] md:h-[30rem]" style={d(0.2)}>
                    <iframe
                        title={`Map showing ${STORE.name}`}
                        src={mapSrc}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="absolute inset-0 h-full w-full border-0 grayscale transition-[filter] duration-700 group-hover:grayscale-0"
                    />
                    <div className="pointer-events-none absolute inset-x-4 bottom-4 md:inset-x-auto md:bottom-6 md:left-6">
                        <div className="pointer-events-auto rounded-2xl bg-white p-5 shadow-lg md:max-w-xs">
                            <p className="text-sm font-semibold">{STORE.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-neutral-500">{STORE.address.join(", ")}</p>
                            <a
                                href={directions}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                            >
                                Get directions <ArrowIcon size={14} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto mt-20 max-w-6xl px-6 md:px-12">
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
                    <p>&copy; {new Date().getFullYear()} {STORE.name}</p>
                    <p className="flex gap-5">
                        <a href="#" className="transition-colors hover:text-neutral-900">Privacy</a>
                        <a href="#" className="transition-colors hover:text-neutral-900">Terms</a>
                    </p>
                </div>
            </div>
        </section>
    );
}