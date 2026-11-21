import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { createPortal } from "react-dom";
import type { Product } from "../lib/api/products";
import { LIMITS, MEASURES, neededMeasures, recommend } from "../lib/sizing";
import type { Body, MeasureKey, Pref, Range, Result } from "../lib/sizing";

type Unit = "cm" | "in";
type Props = { product: Product; onClose: () => void; onSelect: (size: string) => void };

const STORE = "demo-clothing:try-on:measurements:v1"; // same key as the fitting room form
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

const PREFS: { value: Pref; title: string; text: string }[] = [
    { value: "snug", title: "Close to the body", text: "A snugger fit. We only go down a size when it's safe to." },
    { value: "true", title: "True to size", text: "The standard fit for your measurements." },
    { value: "relaxed", title: "A little room", text: "We go up one size for a looser feel." },
];

const loadStored = (): { unit: Unit; values: Record<string, string> } => {
    try {
        const p = JSON.parse(window.localStorage.getItem(STORE) ?? "null");
        if (p) return { unit: p.unit === "in" ? "in" : "cm", values: p.values ?? {} };
    } catch { /* ignore */ }
    return { unit: "cm", values: {} };
};

// merges into what the fitting room form already saved instead of replacing it
const saveStored = (unit: Unit, vals: Record<string, string>) => {
    const old = loadStored();
    const f = old.unit === unit ? 1 : unit === "in" ? 1 / 2.54 : 2.54;
    const merged: Record<string, string> = {};
    Object.entries(old.values).forEach(([k, v]) => {
        const n = parseFloat(v);
        merged[k] = Number.isNaN(n) ? v : String(Math.round(n * f * 10) / 10);
    });
    // empty fields must not erase something already saved
    const filled = Object.fromEntries(Object.entries(vals).filter(([, v]) => v !== ""));
    try {
        window.localStorage.setItem(STORE, JSON.stringify({ unit, values: { ...merged, ...filled } }));
    } catch { /* storage blocked */ }
};

const toCm = (s: string, u: Unit) => (u === "in" ? parseFloat(s) * 2.54 : parseFloat(s));
const len = (cm: number, u: Unit) => (u === "in" ? `${(cm / 2.54).toFixed(1)} in` : `${Math.round(cm * 10) / 10} cm`);
const span = (r: Range, u: Unit) => (u === "in" ? `${(r[0] / 2.54).toFixed(1)} to ${(r[1] / 2.54).toFixed(1)} in` : `${r[0]} to ${r[1]} cm`);
const label = (k: MeasureKey) => MEASURES.find((m) => m.key === k)!.label;
const HEIGHT = MEASURES.find((m) => m.key === "height")!;

export default function FindMySize({ product, onClose, onSelect }: Props) {
    const chart = product.sizeChart;
    const offered = product.sizes;
    const needed = useMemo(() => neededMeasures(chart.filter((r) => offered.includes(r.size))), [chart, offered]);
    // height is always asked, even for a product whose sizes don't have height ranges yet
    const fields = useMemo(() => (needed.some((m) => m.key === "height") ? needed : [...needed, HEIGHT]), [needed]);

    const [shown, setShown] = useState(false);
    const [step, setStep] = useState(0);
    const saved = useMemo(loadStored, []);
    const [unit, setUnit] = useState<Unit>(saved.unit);
    const [vals, setVals] = useState<Record<string, string>>(() =>
        Object.fromEntries(fields.map((m) => [m.key, saved.values[m.key] ?? ""]))
    );
    const [pref, setPref] = useState<Pref>("true");
    const [remember, setRemember] = useState(true);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [result, setResult] = useState<Result | null>(null);

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
        window.setTimeout(onClose, 250);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const change = (key: string) => (e: ChangeEvent<HTMLInputElement>) => {
        const clean = e.target.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 5);
        setVals((v) => ({ ...v, [key]: clean }));
        setErrors((er) => ({ ...er, [key]: "" }));
    };

    const switchUnit = (next: Unit) => {
        if (next === unit) return;
        const f = next === "in" ? 1 / 2.54 : 2.54;
        setVals((v) =>
            Object.fromEntries(Object.entries(v).map(([k, s]) => {
                const n = parseFloat(s);
                return [k, Number.isNaN(n) ? s : String(Math.round(n * f * 10) / 10)];
            }))
        );
        setUnit(next);
    };

    const parse = () => {
        const er: Record<string, string> = {};
        const body: Body = {};
        for (const m of fields) {
            const raw = (vals[m.key] ?? "").trim();
            const n = toCm(raw, unit);
            const [lo, hi] = LIMITS[m.key];
            if (!raw || Number.isNaN(n)) er[m.key] = m.key === "height" ? "Enter your height." : "Enter this measurement.";
            else if (n < lo || n > hi) er[m.key] = `That doesn't look right. We expect ${span([lo, hi], unit)}.`;
            else body[m.key] = n;
        }
        return { er, body };
    };

    const toPreference = () => {
        const { er } = parse();
        setErrors(er);
        if (Object.keys(er).length === 0) setStep(1);
    };

    const toResult = () => {
        const { body } = parse();
        setResult(recommend(chart, body, pref, offered));
        if (remember) saveStored(unit, vals);
        setStep(2);
    };

    const stockOf = (size: string) => product.variants.filter((v) => v.size === size).reduce((n, v) => n + v.stock, 0);


    const inputCls = (err?: string) =>
        `h-12 w-full rounded-md border bg-white pl-4 pr-12 text-sm outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-900 ${err ? "border-red-400" : "border-neutral-300 hover:border-neutral-400"}`;

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
            <div onClick={close} className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`} />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Find my size"
                className={`relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl transition-all duration-300 sm:rounded-2xl ${shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}
                style={{ transitionTimingFunction: EASE }}
            >
                <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Find my size</h2>
                        <p className="mt-1 text-xs text-neutral-500">{product.name}</p>
                    </div>
                    <button type="button" aria-label="Close" onClick={close} className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-neutral-100">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-2 px-6" aria-hidden="true">
                    {["Measure", "Fit", "Result"].map((s, i) => (
                        <div key={s}>
                            <span className={`block h-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-neutral-900" : "bg-neutral-200"}`} />
                            <span className={`mt-1.5 block text-[11px] ${i <= step ? "text-neutral-900" : "text-neutral-400"}`}>{s}</span>
                        </div>
                    ))}
                </div>

                <div key={step} className="pp-fade px-6 pb-6 pt-6">
                    {/* STEP 1: measurements (height is always required) */}
                    {step === 0 && (
                        <>
                            <div className="rounded-xl bg-[#f4f3f2] p-4 text-xs leading-relaxed text-neutral-600">
                                Use a soft tape measure over light clothing or underwear. Stand relaxed and keep the tape snug but not tight. Measure your <span className="font-medium text-neutral-900">body</span>, not your clothes.
                            </div>

                            <div className="mt-5 flex items-center justify-between">
                                <p className="text-xs text-neutral-500">Your measurements</p>
                                <div role="group" aria-label="Units" className="grid grid-cols-2 rounded-full bg-[#f4f3f2] p-0.5 text-xs font-medium">
                                    {(["cm", "in"] as const).map((u) => (
                                        <button key={u} type="button" aria-pressed={unit === u} onClick={() => switchUnit(u)} className={`h-7 w-10 rounded-full transition-colors ${unit === u ? "bg-white shadow-sm" : "text-neutral-500 hover:text-neutral-900"}`}>
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 space-y-5">
                                {fields.map((m) => (
                                    <label key={m.key} className="block">
                                        <span className="text-sm font-medium">{m.label}</span>
                                        <div className="relative mt-1.5">
                                            <input inputMode="decimal" autoComplete="off" placeholder="0" value={vals[m.key] ?? ""} onChange={change(m.key)} className={inputCls(errors[m.key])} />
                                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400">{unit}</span>
                                        </div>
                                        <span className="mt-1 block text-[11px] leading-tight text-neutral-400">{m.how}</span>
                                        {errors[m.key] && <span className="mt-1 block text-xs text-red-600" role="alert">{errors[m.key]}</span>}
                                    </label>
                                ))}
                            </div>

                            <button type="button" onClick={toPreference} className="mt-6 flex h-12 w-full items-center justify-center rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700">
                                Continue
                            </button>
                        </>
                    )}

                    {/* STEP 2: fit preference */}
                    {step === 1 && (
                        <>
                            <p className="text-sm font-medium">How do you like it to fit?</p>
                            <div role="radiogroup" aria-label="Fit preference" className="mt-4 space-y-3">
                                {PREFS.map((p) => (
                                    <button key={p.value} type="button" role="radio" aria-checked={pref === p.value} onClick={() => setPref(p.value)}
                                        className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${pref === p.value ? "border-neutral-900 bg-[#f4f3f2]" : "border-neutral-200 hover:border-neutral-400"}`}>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${pref === p.value ? "border-neutral-900" : "border-neutral-300"}`}>
                                            <span className={`h-2.5 w-2.5 rounded-full bg-neutral-900 transition-transform ${pref === p.value ? "scale-100" : "scale-0"}`} />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-medium">{p.title}</span>
                                            <span className="block text-xs text-neutral-500">{p.text}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <label className="mt-5 flex cursor-pointer items-center gap-3 text-xs text-neutral-600">
                                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 accent-neutral-900" />
                                Remember my measurements on this device
                            </label>

                            <div className="mt-6 flex gap-3">
                                <button type="button" onClick={() => setStep(0)} className="h-12 rounded-md border border-neutral-900 px-6 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white">Back</button>
                                <button type="button" onClick={toResult} className="h-12 flex-1 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700">See my size</button>
                            </div>
                        </>
                    )}

                    {/* STEP 3: result */}
                    {step === 2 && (
                        <>
                            {!result ? (
                                <p className="rounded-xl bg-[#f4f3f2] p-5 text-sm text-neutral-600">We couldn't work out a size from these numbers. Please go back and check them.</p>
                            ) : (
                                <>
                                    <div className="rounded-2xl bg-[#f4f3f2] p-6 text-center">
                                        <p className="text-xs text-neutral-500">Your size</p>
                                        <p className="pp-pop mt-1 text-5xl font-semibold tracking-tight">{result.size}</p>
                                        <p className="mt-2 text-xs text-neutral-500">Based on your {label(result.driver).toLowerCase()}</p>
                                    </div>

                                    {result.out && (
                                        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800" role="alert">
                                            {result.out === "large" ? "Your measurements are above our largest size, so this may fit snugly." : "Your measurements are below our smallest size, so this may fit loosely."}
                                        </p>
                                    )}
                                    {stockOf(result.size) === 0 && (
                                        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800" role="alert">Size {result.size} is currently out of stock.</p>
                                    )}

                                    <p className="mt-6 text-xs font-medium text-neutral-500">How size {result.size} fits you</p>
                                    <ul className="mt-3 divide-y divide-neutral-100">
                                        {result.perMeasure.map((p) => {
                                            const isHeight = p.key === "height";
                                            return (
                                                <li key={p.key} className="flex items-start justify-between gap-4 py-3 text-sm">
                                                    <span>
                                                        <span className="block font-medium">{label(p.key)}</span>
                                                        <span className="block text-xs text-neutral-500">You: {len(p.value, unit)} &middot; Size {result.size}: {span(p.range, unit)}</span>
                                                        {p.suits !== result.size && <span className="block text-[11px] text-neutral-400">This measurement alone suits {p.suits}</span>}
                                                    </span>
                                                    <span className={`shrink-0 text-xs font-medium ${p.diff === 0 ? "text-emerald-600" : p.diff > 0 ? "text-amber-600" : "text-neutral-500"}`}>
                                                        {p.diff === 0
                                                            ? "In range"
                                                            : isHeight
                                                                ? p.diff > 0 ? `${len(p.diff, unit)} taller` : `${len(-p.diff, unit)} shorter`
                                                                : p.diff > 0 ? `${len(p.diff, unit)} snugger` : `${len(-p.diff, unit)} roomier`}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                    </ul>

                                    {result.alt && (
                                        <p className="mt-4 rounded-xl bg-[#f4f3f2] p-4 text-xs leading-relaxed text-neutral-600">
                                            {result.alt.direction === "up" ? `You're near the top of this size's range. For more room, choose ${result.alt.size}.` : `You're near the bottom of this size's range. For a closer fit, try ${result.alt.size}.`}
                                        </p>
                                    )}
                                    {result.notes.map((n) => <p key={n} className="mt-3 text-xs leading-relaxed text-neutral-500">{n}</p>)}

                                    <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">A recommendation from body measurements. Fabric stretch and cut can change how a piece feels.</p>

                                    <div className="mt-5 flex gap-3">
                                        <button type="button" onClick={() => setStep(0)} className="h-12 rounded-md border border-neutral-900 px-6 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white">Start again</button>
                                        <button type="button" onClick={() => onSelect(result.size)} className="h-12 flex-1 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700">Use size {result.size}</button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}