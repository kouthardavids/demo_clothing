import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { money } from "../lib/cart";

type Stage = "connecting" | "otp" | "confirming" | "success" | "failed";

type Props = {
    amount: number;
    brand: string;
    last4: string;
    declined: boolean;
    onSuccess: (paymentRef: string) => void;
    onFail: (reason: string) => void;
    onCancel: () => void;
};

export const DEMO_CODE = "123456";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const STEPS = ["Bank", "Verify", "Done"];

const CSS = `
@keyframes pay-up  { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
@keyframes pay-pop { 0% { transform: scale(0.6); opacity: 0 } 60% { transform: scale(1.1) } 100% { transform: scale(1); opacity: 1 } }
.pay-up  { animation: pay-up 0.6s ${EASE} both }
.pay-pop { animation: pay-pop 0.6s ${EASE} both }
@media (prefers-reduced-motion: reduce) { .pay-up, .pay-pop { animation: none } }
`;

const Icon = ({ children }: { children: React.ReactNode }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

const darkBtn =
    "mt-6 flex h-12 w-full items-center justify-center rounded-md bg-neutral-900 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900";

export default function PaymentScreen({ amount, brand, last4, declined, onSuccess, onFail, onCancel }: Props) {
    const [stage, setStage] = useState<Stage>("connecting");
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [tries, setTries] = useState(0);
    const [reason, setReason] = useState("");
    const [seconds, setSeconds] = useState(30);

    const successRef = useRef(onSuccess);
    successRef.current = onSuccess;
    const paymentRef = useRef(`demo_${Math.random().toString(36).slice(2, 10)}`);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, []);

    useEffect(() => {
        let t: number | undefined;
        if (stage === "connecting") {
            t = window.setTimeout(() => {
                if (declined) {
                    setReason("Your bank declined this card. Please try another card.");
                    setStage("failed");
                } else {
                    setStage("otp");
                }
            }, 1600);
        }
        if (stage === "confirming") t = window.setTimeout(() => setStage("success"), 1400);
        if (stage === "success") t = window.setTimeout(() => successRef.current(paymentRef.current), 1300);
        return () => window.clearTimeout(t);
    }, [stage, declined]);

    useEffect(() => {
        if (stage !== "otp" || seconds <= 0) return;
        const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => window.clearTimeout(t);
    }, [stage, seconds]);

    const verify = (e: FormEvent) => {
        e.preventDefault();
        if (code.length < 6) return setError("Enter the 6-digit code.");
        if (code !== DEMO_CODE) {
            const n = tries + 1;
            setTries(n);
            if (n >= 3) {
                setReason("Too many incorrect codes, so this payment was cancelled.");
                setStage("failed");
                return;
            }
            setCode("");
            setError(`That code isn't right. ${3 - n} ${3 - n === 1 ? "try" : "tries"} left.`);
            return;
        }
        setError("");
        setStage("confirming");
    };

    const active = stage === "connecting" ? 0 : stage === "otp" || stage === "confirming" ? 1 : 2;
    const spinning = stage === "connecting" || stage === "confirming";

    return (
        <div role="dialog" aria-modal="true" aria-label="Secure payment" className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-white font-sans text-neutral-900">
            <style>{CSS}</style>

            <header className="border-b border-neutral-200">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-12">
                    <span className="text-2xl font-bold tracking-tight">Demo Clothing</span>
                    <span className="flex items-center gap-2 text-xs text-neutral-500">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="5" y="11" width="14" height="9" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                        </svg>
                        Secure payment
                    </span>
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-6 py-10">
                <div className="pay-up w-full max-w-md">
                    <p className="mb-4 rounded-full bg-[#f4f3f2] px-4 py-2 text-center text-xs text-neutral-600">Demo payment screen. No real money moves.</p>

                    <div className="rounded-2xl border border-neutral-200 p-6 md:p-8">
                        <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
                            <div>
                                <p className="text-xs text-neutral-500">Paying Demo Clothing</p>
                                <p className="mt-1 text-2xl font-semibold">{money(amount)}</p>
                            </div>
                            <p className="text-right text-xs text-neutral-500">
                                {brand}
                                <br />
                                <span className="text-sm font-medium text-neutral-900">•••• {last4}</span>
                            </p>
                        </div>

                        <div className="mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
                            {STEPS.map((label, i) => (
                                <div key={label}>
                                    <span className={`block h-1 rounded-full transition-colors duration-500 ${stage !== "failed" && i <= active ? "bg-neutral-900" : "bg-neutral-200"}`} />
                                    <span className={`mt-1.5 block text-[11px] ${stage !== "failed" && i <= active ? "text-neutral-900" : "text-neutral-400"}`}>{label}</span>
                                </div>
                            ))}
                        </div>

                        <div key={stage} className="pay-up">
                            {spinning && (
                                <div className="flex flex-col items-center py-10 text-center" role="status">
                                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900" />
                                    <p className="mt-6 text-base font-semibold">{stage === "connecting" ? "Contacting your bank…" : "Confirming your payment…"}</p>
                                    <p className="mt-1 text-xs text-neutral-500">Please don't close or refresh this page.</p>
                                    {stage === "connecting" && (
                                        <button type="button" onClick={onCancel} className="mt-6 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">
                                            Cancel payment
                                        </button>
                                    )}
                                </div>
                            )}

                            {stage === "otp" && (
                                <form onSubmit={verify} noValidate className="pt-6">
                                    <h2 className="text-lg font-semibold tracking-tight">Verify it's you</h2>
                                    <p className="mt-1 text-sm leading-relaxed text-neutral-500">
                                        Your bank sent a 6-digit code to your phone. In this demo the code is{" "}
                                        <span className="font-medium text-neutral-900">{DEMO_CODE}</span>.
                                    </p>

                                    <label className="mt-5 block">
                                        <span className="text-xs text-neutral-500">Verification code</span>
                                        <input
                                            autoFocus
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={code}
                                            onChange={(e) => {
                                                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                                                setError("");
                                            }}
                                            placeholder="••••••"
                                            className={`mt-1.5 h-14 w-full rounded-md border bg-white text-center text-xl tracking-[0.5em] outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-900 ${error ? "border-red-400" : "border-neutral-300"
                                                }`}
                                        />
                                    </label>
                                    {error && (
                                        <p className="mt-2 text-xs text-red-600" role="alert">
                                            {error}
                                        </p>
                                    )}

                                    <button type="submit" className={darkBtn}>
                                        Verify and pay {money(amount)}
                                    </button>

                                    <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                                        <button
                                            type="button"
                                            disabled={seconds > 0}
                                            onClick={() => {
                                                setSeconds(30);
                                                setCode("");
                                                setError("");
                                            }}
                                            className="underline-offset-4 enabled:hover:text-neutral-900 enabled:hover:underline disabled:no-underline"
                                        >
                                            {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
                                        </button>
                                        <button type="button" onClick={onCancel} className="underline-offset-4 hover:text-neutral-900 hover:underline">
                                            Cancel payment
                                        </button>
                                    </div>
                                </form>
                            )}

                            {stage === "success" && (
                                <div className="flex flex-col items-center py-10 text-center" role="status">
                                    <span className="pay-pop flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white">
                                        <Icon>
                                            <path d="m5 12.5 4.5 4.5L19 7" />
                                        </Icon>
                                    </span>
                                    <p className="mt-6 text-lg font-semibold">Payment approved</p>
                                    <p className="mt-1 text-xs text-neutral-500">Taking you to your order…</p>
                                </div>
                            )}

                            {stage === "failed" && (
                                <div className="py-8 text-center" role="alert">
                                    <span className="pay-pop mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white">
                                        <Icon>
                                            <path d="M6 6l12 12M18 6 6 18" />
                                        </Icon>
                                    </span>
                                    <p className="mt-6 text-lg font-semibold">Payment failed</p>
                                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-neutral-500">{reason}</p>
                                    <button type="button" onClick={() => onFail(reason)} className={darkBtn}>
                                        Try another card
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}