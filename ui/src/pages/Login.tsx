import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

type Mode = "signin" | "signup" | "forgot";

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const COPY: Record<Mode, { title: string; sub: string; button: string }> = {
    signin: { title: "Welcome back", sub: "Sign in to see your orders, closet and saved looks.", button: "Sign in" },
    signup: { title: "Create your account", sub: "Save your closet, outfits and orders in one place.", button: "Create account" },
    forgot: { title: "Reset your password", sub: "Enter your email and we'll send you a link to choose a new one.", button: "Send reset link" },
};

const CSS = `
@keyframes lg-up   { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
@keyframes lg-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes lg-pop  { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
@keyframes lg-float { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }

.lg-reveal { opacity: 0; animation: lg-up 0.8s ${EASE} forwards; animation-delay: var(--d, 0s) }
.lg-fade   { animation: lg-fade 0.45s ease-out both }
.lg-pop    { animation: lg-pop 0.6s ${EASE} both }
.lg-float  { animation: lg-float 7s ease-in-out infinite; animation-delay: var(--d, 0s) }

.lg-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s ${EASE} }
.lg-acc[data-open="true"] { grid-template-rows: 1fr }
.lg-acc > div { overflow: hidden; min-height: 0 }

@media (prefers-reduced-motion: reduce) {
  .lg-reveal { animation: none; opacity: 1; transform: none }
  .lg-fade, .lg-pop, .lg-float { animation: none }
  .lg-acc { transition: none }
}
`;

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);
const EyeIcon = ({ off }: { off: boolean }) => (
    <Svg>
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
        {off && <path d="M4 4l16 16" />}
    </Svg>
);
const ArrowIcon = () => (
    <Svg size={16}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
);
const MailIcon = () => (
    <Svg size={22}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
    </Svg>
);
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3Z" />
        <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.600-4.100H3.100v2.600A10 10 0 0 0 12 22Z" />
        <path fill="#FBBC05" d="M6.400 13.900a6 6 0 0 1 0-3.800V7.500H3.100a10 10 0 0 0 0 9l3.300-2.600Z" />
        <path fill="#EA4335" d="M12 6c1.500 0 2.800.5 3.800 1.500l2.900-2.900A10 10 0 0 0 3.100 7.500l3.300 2.600C7.200 7.800 9.400 6 12 6Z" />
    </svg>
);

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const fieldCls = (err?: string) =>
    `h-12 w-full rounded-md border bg-white px-4 text-sm outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 ${err ? "border-red-400" : "border-neutral-300 hover:border-neutral-400"
    }`;

function Field({ label, error, children, aside }: { label: string; error?: string; children: ReactNode; aside?: ReactNode }) {
    return (
        <label className="block">
            <span className="flex items-center justify-between text-xs text-neutral-500">
                {label}
                {aside}
            </span>
            <div className="mt-1.5">{children}</div>
            {error && (
                <span className="mt-1 block text-xs text-red-600" role="alert">
                    {error}
                </span>
            )}
        </label>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Login() {
    const navigate = useNavigate();
    const [mode, setMode] = useState<Mode>("signin");
    const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", remember: true, terms: false });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [sentTo, setSentTo] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, []);

    const go = (m: Mode) => {
        setMode(m);
        setErrors({});
        setSentTo(null);
        setShow(false);
    };

    const set = (k: "name" | "email" | "password" | "confirm") => (e: ChangeEvent<HTMLInputElement>) => {
        setForm((s) => ({ ...s, [k]: e.target.value }));
        setErrors((er) => ({ ...er, [k]: "" }));
    };

    // Rough strength meter for the sign-up form
    const strength = (() => {
        const p = form.password;
        let s = 0;
        if (p.length >= 8) s++;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
        if (/\d/.test(p)) s++;
        if (/[^A-Za-z0-9]/.test(p) || p.length >= 14) s++;
        return p ? Math.max(1, s) : 0;
    })();
    const strengthLabel = ["", "Weak", "Okay", "Good", "Strong"][strength];

    const submit = (e: FormEvent) => {
        e.preventDefault();
        const er: Record<string, string> = {};

        if (mode === "signup" && !form.name.trim()) er.name = "Please tell us your name.";
        if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = "Enter a valid email address.";
        if (mode !== "forgot") {
            if (!form.password) er.password = "Enter your password.";
            else if (mode === "signup" && form.password.length < 8) er.password = "Use at least 8 characters.";
        }
        if (mode === "signup") {
            if (form.confirm !== form.password) er.confirm = "Passwords don't match.";
            if (!form.terms) er.terms = "Please accept the terms to continue.";
        }
        setErrors(er);
        if (Object.keys(er).length) return;

        setBusy(true);
        // UI only: no real sign-in happens. Replace this timeout with a call to your auth API.
        window.setTimeout(() => {
            setBusy(false);
            if (mode === "forgot") setSentTo(form.email);
            else navigate("/account");
        }, 1200);
    };

    const copy = COPY[mode];

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900 justify">
            <style>{CSS}</style>

            {/* Form side */}
            <div className="flex min-h-screen flex-col px-6 py-8 md:px-12">
                <div className="lg-reveal flex items-center justify-between" style={d(0.05)}>
                    <Link to="/" className="text-2xl font-bold tracking-tight">
                        Demo Clothing
                    </Link>
                    <Link to="/" className="text-xs text-neutral-500 transition-colors hover:text-neutral-900">
                        &larr; Back to store
                    </Link>
                </div>

                <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
                    {sentTo ? (
                        <div className="lg-fade text-center">
                            <span className="lg-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white">
                                <MailIcon />
                            </span>
                            <h1 className="mt-6 text-3xl font-semibold tracking-tight">Check your email</h1>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-500">
                                If an account exists for <span className="font-medium text-neutral-900">{sentTo}</span>, a reset link is on its way.
                            </p>
                            <button
                                type="button"
                                onClick={() => go("signin")}
                                className="mt-8 h-12 w-full rounded-md border border-neutral-900 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white"
                            >
                                Back to sign in
                            </button>
                        </div>
                    ) : (
                        <div key={mode} className="lg-fade">
                            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{copy.title}</h1>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-500">{copy.sub}</p>

                            <form onSubmit={submit} noValidate className="mt-4 space-y-4">
                                {/* Name (sign up only) */}
                                <div className="lg-acc" data-open={mode === "signup"}>
                                    <div>
                                        <div className="pb-4">
                                            <Field label="Full name" error={errors.name}>
                                                <input autoComplete="name" tabIndex={mode === "signup" ? 0 : -1} value={form.name} onChange={set("name")} className={fieldCls(errors.name)} />
                                            </Field>
                                        </div>
                                    </div>
                                </div>

                                <Field label="Email" error={errors.email}>
                                    <input type="email" autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={fieldCls(errors.email)} />
                                </Field>

                                <Field
                                    label="Password"
                                    error={errors.password}
                                >
                                    <div className="relative">
                                        <input
                                            type={show ? "text" : "password"}
                                            autoComplete={mode === "signin" ? "current-password" : "new-password"}
                                            value={form.password}
                                            onChange={set("password")}
                                            className={`${fieldCls(errors.password)} pr-12`}
                                        />
                                        <button
                                            type="button"
                                            aria-label={show ? "Hide password" : "Show password"}
                                            aria-pressed={show}
                                            onClick={() => setShow((v) => !v)}
                                            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 transition-colors hover:text-neutral-900"
                                        >
                                            <EyeIcon off={show} />
                                        </button>
                                    </div>
                                </Field>

                                {/* Sign-up extras */}
                                <div className="lg-acc" data-open={mode === "signup"}>
                                    <div>
                                        <div className="space-y-4 pb-1">
                                            {form.password && (
                                                <div aria-live="polite">
                                                    <div className="flex gap-1.5">
                                                        {[1, 2, 3, 4].map((n) => (
                                                            <span key={n} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${strength >= n ? "bg-neutral-900" : "bg-neutral-200"}`} />
                                                        ))}
                                                    </div>
                                                    <p className="mt-1.5 text-xs text-neutral-500">Password strength: {strengthLabel}</p>
                                                </div>
                                            )}
                                            <Field label="Confirm password" error={errors.confirm}>
                                                <input type={show ? "text" : "password"} autoComplete="new-password" tabIndex={mode === "signup" ? 0 : -1} value={form.confirm} onChange={set("confirm")} className={fieldCls(errors.confirm)} />
                                            </Field>
                                            <div>
                                                <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-neutral-600">
                                                    <input
                                                        type="checkbox"
                                                        tabIndex={mode === "signup" ? 0 : -1}
                                                        checked={form.terms}
                                                        onChange={(e) => {
                                                            setForm((s) => ({ ...s, terms: e.target.checked }));
                                                            setErrors((er) => ({ ...er, terms: "" }));
                                                        }}
                                                        className="mt-0.5 h-4 w-4 shrink-0 accent-neutral-900"
                                                    />
                                                    <span>
                                                        I agree to the{" "}
                                                        <a href="#" className="text-neutral-900 underline underline-offset-4">Terms</a> and{" "}
                                                        <a href="#" className="text-neutral-900 underline underline-offset-4">Privacy Policy</a>.
                                                    </span>
                                                </label>
                                                {errors.terms && <p className="mt-1 text-xs text-red-600" role="alert">{errors.terms}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {busy ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Please wait…
                                        </>
                                    ) : (
                                        <>
                                            {copy.button} <ArrowIcon />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                <p className="text-center text-xs text-neutral-400">&copy; {new Date().getFullYear()} Demo Clothing</p>
            </div>
        </div>
    );
}