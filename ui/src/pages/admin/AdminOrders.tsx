import { useEffect, useMemo, useState } from "react";
import { money } from "../../lib/cart";
import { fetchOrders } from "../../lib/orders";
import type { AdminOrder } from "../../lib/orders";

const PAGE_SIZE = 8;
const d = (s: number) => ({ ["--d" as string]: `${s}s` });

const CSS = `
.od-acc { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.45s cubic-bezier(0.22, 1, 0.36, 1) }
.od-acc[data-open="true"] { grid-template-rows: 1fr }
.od-acc > div { overflow: hidden; min-height: 0 }
@media (prefers-reduced-motion: reduce) { .od-acc { transition: none } }
`;

const STATUS_COLOR: Record<string, string> = {
    pending: "#d97706",
    paid: "#059669",
    shipped: "#2563eb",
    delivered: "#059669",
    cancelled: "#dc2626",
    refunded: "#6b7280",
};

const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;

const PERIODS = [
    { value: "all", label: "All time" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const inPeriod = (iso: string, period: Period): boolean => {
    if (period === "all") return true;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    return new Date(iso).getTime() >= Date.now() - days * 86_400_000;
};

const orderDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

const orderTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const initials = (name: string) =>
    name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const Swatch = ({ color, size = 14 }: { color: string; size?: number }) => (
    <span className="inline-block shrink-0 rounded-full border border-black/10" style={{ backgroundColor: color, width: size, height: size }} />
);

const Chevron = ({ open }: { open: boolean }) => (
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
        className="transition-transform duration-500"
        style={{ transform: open ? "rotate(180deg)" : "none" }}
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
);

export default function AdminOrders() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [q, setQ] = useState("");
    const [status, setStatus] = useState<string>("All");
    const [period, setPeriod] = useState<Period>("all");
    const [page, setPage] = useState(1);
    const [openId, setOpenId] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        fetchOrders()
            .then((rows) => { if (alive) setOrders(rows); })
            .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Could not load orders"); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return orders.filter(
            (o) =>
                inPeriod(o.created_at, period) &&
                (status === "All" || o.status === status) &&
                (!needle ||
                    [o.number, o.ship_name, o.email, o.ship_city, o.ship_phone ?? ""]
                        .some((v) => v.toLowerCase().includes(needle)))
        );
    }, [orders, q, status, period]);

    useEffect(() => setPage(1), [q, status, period]);

    const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const current = Math.min(page, pages);
    const visible = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

    const exportCsv = () => {
        const head = ["Order", "Customer", "Email", "Location", "Status", "Contact", "Total (R)", "Date"];
        const body = rows.map((o) => [
            o.number,
            o.ship_name,
            o.email,
            `${o.ship_city}, ${o.ship_province}`,
            o.status,
            o.ship_phone ?? "",
            (o.total_cents / 100).toFixed(2),
            orderDate(o.created_at),
        ]);
        const csv = [head, ...body]
            .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
            .join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = "orders.csv";
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div>
            <style>{CSS}</style>

            <div className="ad-reveal flex flex-wrap items-end justify-between gap-4" style={d(0.05)}>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Orders</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        {loading ? "Loading…" : `${rows.length} ${rows.length === 1 ? "order" : "orders"}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={exportCsv}
                    disabled={rows.length === 0 || loading}
                    className="h-10 rounded-full bg-neutral-900 px-5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-40"
                >
                    Export CSV
                </button>
            </div>

            <section className="ad-reveal mt-6 rounded-2xl bg-white p-5 md:p-6" style={d(0.12)}>
                {error && (
                    <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                        {error}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                    <label className="relative min-w-[14rem] flex-1 md:max-w-xs">
                        <span className="sr-only">Search orders</span>
                        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search order, customer, place"
                            className="h-10 w-full rounded-full bg-[#f4f3f2] pl-11 pr-4 text-xs outline-none placeholder:text-neutral-400 focus:ring-2 focus:ring-neutral-900"
                        />
                    </label>

                    <label>
                        <span className="sr-only">Period</span>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value as Period)}
                            className="h-10 cursor-pointer rounded-full bg-[#f4f3f2] px-4 text-xs font-medium outline-none hover:bg-neutral-200"
                        >
                            {PERIODS.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </label>

                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
                        {(["All", ...STATUSES] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={status === s}
                                onClick={() => setStatus(s)}
                                className={`h-10 rounded-full px-4 text-xs font-medium capitalize transition-colors ${status === s ? "bg-neutral-900 text-white" : "bg-[#f4f3f2] hover:bg-neutral-200"}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-14 animate-pulse rounded-xl bg-[#f4f3f2]" />
                            ))}
                        </div>
                    ) : (
                        <table className="w-full min-w-[44rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                    {["Order", "Customer", "Payment", "Location", "Status", "Contact", "Total", ""].map((h, i) => (
                                        <th key={h} className={`pb-3 font-medium ${i === 6 ? "text-right" : ""} ${i === 7 ? "w-8" : ""}`}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((o) => {
                                    const color = STATUS_COLOR[o.status] ?? "#6b7280";
                                    const open = openId === o.id;
                                    return (
                                        <FragmentRow
                                            key={o.id}
                                            order={o}
                                            color={color}
                                            open={open}
                                            onToggle={() => setOpenId(open ? null : o.id)}
                                        />
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {!loading && visible.length === 0 && (
                        <p className="rounded-xl bg-[#f4f3f2] px-6 py-12 text-center text-sm text-neutral-500">
                            {orders.length === 0 ? "No orders yet." : "No orders match these filters."}
                        </p>
                    )}
                </div>

                {!loading && pages > 1 && (
                    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between text-xs text-neutral-500">
                        <span>Page {current} of {pages}</span>
                        <div className="flex gap-2">
                            <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="h-9 rounded-full bg-[#f4f3f2] px-4 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-40">Previous</button>
                            <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="h-9 rounded-full bg-[#f4f3f2] px-4 font-medium text-neutral-900 transition-colors hover:bg-neutral-200 disabled:opacity-40">Next</button>
                        </div>
                    </nav>
                )}
            </section>
        </div>
    );
}

// Row + expanded detail
function FragmentRow({
    order,
    color,
    open,
    onToggle,
}: {
    order: AdminOrder;
    color: string;
    open: boolean;
    onToggle: () => void;
}) {
    return (
        <>
            {/* Clickable summary row */}
            <tr
                onClick={onToggle}
                className="cursor-pointer border-b border-neutral-100 transition-colors last:border-0 hover:bg-[#faf9f8]"
                aria-expanded={open}
            >
                <td className="py-4 pr-4">
                    <span className="block font-medium">{order.number}</span>
                    <span className="block text-xs text-neutral-400">
                        {orderDate(order.created_at)}
                    </span>
                </td>
                <td className="py-4 pr-4">
                    <span className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4f3f2] text-[11px] font-medium">
                            {initials(order.ship_name)}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate">{order.ship_name}</span>
                            <span className="block truncate text-xs text-neutral-400">{order.email}</span>
                        </span>
                    </span>
                </td>
                <td className="py-4 pr-4 text-neutral-600">{order.payment_provider ?? "—"}</td>
                <td className="py-4 pr-4 text-neutral-600">
                    {order.ship_city}, {order.ship_province}
                </td>
                <td className="py-4 pr-4">
                    <span className="flex items-center gap-2 text-xs font-medium capitalize" style={{ color }}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        {order.status}
                    </span>
                </td>
                <td className="py-4 pr-4 text-neutral-600">{order.ship_phone ?? "—"}</td>
                <td className="py-4 text-right font-semibold">{money(order.total_cents / 100)}</td>
                <td className="py-4 pl-2 text-neutral-500">
                    <Chevron open={open} />
                </td>
            </tr>

            <tr className="border-b border-neutral-100 last:border-0">
                <td colSpan={8} className="p-0">
                    <div className="od-acc" data-open={open}>
                        <div>
                            <div className="border-t border-neutral-200 bg-[#faf9f8] p-4 md:p-6">
                                <OrderDetail order={order} />
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        </>
    );
}

function OrderDetail({ order }: { order: AdminOrder }) {
    const count = order.order_items.reduce((n, it) => n + it.qty, 0);

    return (
        <div className="space-y-6">
            {/* Items */}
            <div>
                <p className="text-xs font-medium text-neutral-500">
                    Items ({count})
                </p>
                <ul className="mt-3 space-y-3">
                    {order.order_items.map((it) => {
                        console.log("[order item]", it.product_name, "image:", it.image);
                        const line = it.unit_price_cents * it.qty;
                        return (
                            <li
                                key={it.id}
                                className="flex items-center gap-4 rounded-xl bg-white p-3 md:p-4"
                            >
                                <span
                                    className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f4f3f2]"
                                >
                                    <ProductThumb name={it.product_name} src={it.image} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{it.product_name}</p>
                                    <p className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                                        <Swatch color={it.color} />
                                        <span>Size {it.size}</span>
                                        <span className="text-neutral-300">·</span>
                                        <span>Qty {it.qty}</span>
                                    </p>
                                    <p className="mt-1 text-xs text-neutral-400">
                                        {money(it.unit_price_cents / 100)} each
                                    </p>
                                </div>
                                <p className="shrink-0 text-sm font-semibold">{money(line / 100)}</p>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* Summary + shipping */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl bg-white p-4 md:p-5">
                    <p className="text-xs font-medium text-neutral-500">Order summary</p>
                    <dl className="mt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-neutral-500">Subtotal</dt>
                            <dd>{money(order.subtotal_cents / 100)}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-neutral-500">
                                Delivery ({order.shipping_method})
                            </dt>
                            <dd>
                                {order.shipping_cents === 0
                                    ? "Free"
                                    : money(order.shipping_cents / 100)}
                            </dd>
                        </div>
                        <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold">
                            <dt>Total</dt>
                            <dd>{money(order.total_cents / 100)}</dd>
                        </div>
                    </dl>
                </div>

                <div className="rounded-xl bg-white p-4 md:p-5">
                    <p className="text-xs font-medium text-neutral-500">Shipping to</p>
                    <div className="mt-3 space-y-1 text-sm">
                        <p className="font-medium">{order.ship_name}</p>
                        {order.ship_phone && (
                            <p className="text-neutral-500">{order.ship_phone}</p>
                        )}
                        <p className="text-neutral-500">
                            {order.ship_street}
                            <br />
                            {order.ship_suburb}
                            <br />
                            {order.ship_city}, {order.ship_province}, {order.ship_postal}
                        </p>
                        <p className="mt-2 text-xs text-neutral-400">
                            Placed {orderDate(order.created_at)} at {orderTime(order.created_at)}
                        </p>
                        {order.payment_ref && (
                            <p className="mt-1 text-xs text-neutral-400">
                                Payment ref: {order.payment_ref}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ProductThumb({ name, src }: { name: string; src?: string | null }) {
    if (src) {
        return <img src={src} alt="" className="h-full w-full object-contain object-center" draggable={false} />;
    }
    const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    return (
        <span className="flex h-full w-full items-center justify-center text-xs font-medium text-neutral-500">
            {initials || "?"}
        </span>
    );
}