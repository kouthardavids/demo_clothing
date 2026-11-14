import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { money } from "../../lib/cart";
import { getProducts, loadProducts } from "../../lib/products";
import type { Product } from "../../lib/products";
import { fetchOrders } from "../../lib/orders";
import type { AdminOrder } from "../../lib/orders";

const d = (s: number) => ({ ["--d" as string]: `${s}s` });
const tooltipStyle = { borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12, boxShadow: "none" };

const STATUS_COLOR: Record<string, string> = {
    pending: "#d97706",
    paid: "#059669",
    shipped: "#2563eb",
    delivered: "#059669",
    cancelled: "#dc2626",
    refunded: "#6b7280",
};

const PERIODS = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "all", label: "All time" },
] as const;
type Period = (typeof PERIODS)[number]["value"];

const inPeriod = (iso: string, period: Period): boolean => {
    if (period === "all") return true;
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    return new Date(iso).getTime() >= Date.now() - days * 86_400_000;
};

// Same threshold the Stock page uses
const LOW_STOCK_THRESHOLD = 15;

const Svg = ({ children }: { children: ReactNode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

const WarningIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 10v4M12 17v.5" />
    </svg>
);

function Card({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
    return (
        <section className={`ad-reveal rounded-2xl bg-white p-5 md:p-6 ${className}`} style={d(delay)}>
            {children}
        </section>
    );
}

function Stat({ label, value, icon, delay }: { label: string; value: string; icon: ReactNode; delay: number }) {
    return (
        <div className="ad-reveal flex items-center justify-between rounded-2xl bg-white p-5" style={d(delay)}>
            <div>
                <p className="text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-neutral-500">{label}</p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f3f2]">{icon}</span>
        </div>
    );
}

function Ring({ percent, color, label }: { percent: number; color: string; label: string }) {
    const data = [{ v: percent }, { v: 100 - percent }];
    return (
        <div className="text-center">
            <div className="relative mx-auto h-28 w-28">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="v" innerRadius="78%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" cornerRadius={6}>
                            <Cell fill={color} />
                            <Cell fill="#ececec" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold">{percent}%</span>
            </div>
            <p className="mt-3 text-xs text-neutral-500">{label}</p>
        </div>
    );
}

// banner                                          */
function LowStockBanner({ products, loading }: { products: Product[]; loading: boolean }) {
    const low = useMemo(
        () => products
            .filter((p) => {
                const total = p.variants.reduce((n, v) => n + v.stock, 0);
                return total > 0 && total <= LOW_STOCK_THRESHOLD;
            })
            .sort((a, b) => {
                const at = a.variants.reduce((n, v) => n + v.stock, 0);
                const bt = b.variants.reduce((n, v) => n + v.stock, 0);
                return at - bt;
            }),
        [products]
    );

    if (loading) return null;
    if (low.length === 0) return null;

    return (
        <div
            role="alert"
            className="ad-reveal mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:flex-row md:items-center md:justify-between md:p-5"
            style={d(0.02)}
        >
            <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                    <WarningIcon />
                </span>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-amber-900">
                        {low.length === 1
                            ? "1 product is running out of stock"
                            : `${low.length} products are running out of stock`}
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800">
                        Restock soon to avoid missing sales.
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {low.slice(0, 4).map((p) => {
                    const total = p.variants.reduce((n, v) => n + v.stock, 0);
                    return (
                        <Link
                            key={p.id}
                            to={`/admin/inventory/stocks?product=${p.id}`}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100"
                            title={`${p.name}: ${total} left`}
                        >
                            <span className="h-4 w-4 shrink-0 rounded border border-amber-300" style={{ backgroundColor: p.tone }} />
                            <span className="max-w-[10rem] truncate">{p.name}</span>
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                {total}
                            </span>
                        </Link>
                    );
                })}
                {low.length > 4 && (
                    <Link
                        to="/admin/inventory/stocks?level=low"
                        className="text-xs font-medium text-amber-900 underline-offset-4 hover:underline"
                    >
                        +{low.length - 4} more
                    </Link>
                )}
                <Link
                    to="/admin/inventory/stocks?level=low"
                    className="ml-2 inline-flex h-9 items-center rounded-full bg-amber-900 px-4 text-xs font-medium text-white transition-colors hover:bg-amber-950"
                >
                    View all low stock
                </Link>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(true);

    const [products, setProducts] = useState<Product[]>(() => getProducts());
    const [productsLoading, setProductsLoading] = useState(products.length === 0);

    const [period, setPeriod] = useState<Period>("7d");

    // Orders
    useEffect(() => {
        let alive = true;
        fetchOrders()
            .then((rows) => { if (alive) setOrders(rows); })
            .catch((e) => console.error("Failed to load orders:", e))
            .finally(() => { if (alive) setOrdersLoading(false); });
        return () => { alive = false; };
    }, []);

    // Products — needed for the banner + low-stock stat + top-selling lookups
    useEffect(() => {
        if (products.length > 0) return;
        let alive = true;
        loadProducts()
            .then((list) => { if (alive) setProducts(list); })
            .catch((e) => console.error("Failed to load products:", e))
            .finally(() => { if (alive) setProductsLoading(false); });
        return () => { alive = false; };
    }, [products.length]);

    const scoped = useMemo(() => orders.filter((o) => inPeriod(o.created_at, period)), [orders, period]);

    const pct = (s: string) =>
        scoped.length ? Math.round((scoped.filter((o) => o.status === s).length / scoped.length) * 100) : 0;

    const overview = Object.entries(
        orders.reduce<Record<string, number>>((acc, o) => {
            acc[o.status] = (acc[o.status] ?? 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value, color: STATUS_COLOR[name] ?? "#6b7280" }));

    const deliveredPct = orders.length
        ? Math.round((orders.filter((o) => o.status === "delivered").length / orders.length) * 100)
        : 0;

    const totalOrders = orders.length;
    const uniqueCustomers = new Set(orders.map((o) => o.email)).size;
    const revenue = orders.reduce((n, o) => n + o.total_cents, 0) / 100;

    const lowStock = products.filter((p) => {
        const total = p.variants.reduce((n, v) => n + v.stock, 0);
        return total > 0 && total <= LOW_STOCK_THRESHOLD;
    }).length;

    const topSelling = useMemo(() => {
        const map = new Map<string, { name: string; sold: number; productId?: number; price: string; image?: string; tone?: string }>();
        for (const o of orders) {
            for (const it of o.order_items) {
                const existing = map.get(it.product_name);
                if (existing) existing.sold += it.qty;
                else {
                    const p = products.find((x) => x.name === it.product_name);
                    map.set(it.product_name, {
                        name: it.product_name,
                        sold: it.qty,
                        productId: p?.id,
                        price: p?.price ?? money(it.unit_price_cents / 100),
                        image: p?.image,
                        tone: p?.tone,
                    });
                }
            }
        }
        return [...map.values()].sort((a, b) => b.sold - a.sold).slice(0, 5);
    }, [orders, products]);

    const weekly = useMemo(() => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const now = new Date();
        const result: { day: string; thisWeek: number; lastWeek: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(now);
            dayStart.setDate(now.getDate() - i);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);
            const prevStart = new Date(dayStart);
            prevStart.setDate(dayStart.getDate() - 7);
            const prevEnd = new Date(dayEnd);
            prevEnd.setDate(dayEnd.getDate() - 7);

            const count = (start: Date, end: Date) =>
                orders.filter((o) => {
                    const t = new Date(o.created_at).getTime();
                    return t >= start.getTime() && t < end.getTime();
                }).length;

            result.push({
                day: days[dayStart.getDay()],
                thisWeek: count(dayStart, dayEnd),
                lastWeek: count(prevStart, prevEnd),
            });
        }
        return result;
    }, [orders]);

    const monthly = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const now = new Date();
        const buckets: { month: string; revenue: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const sum = orders
                .filter((o) => {
                    const t = new Date(o.created_at).getTime();
                    return t >= start.getTime() && t < end.getTime();
                })
                .reduce((n, o) => n + o.total_cents, 0) / 100;
            buckets.push({ month: months[start.getMonth()], revenue: sum });
        }
        return buckets;
    }, [orders]);

    return (
        <div>
            <h1 className="ad-reveal text-2xl font-semibold tracking-tight md:text-3xl" style={d(0.05)}>
                Dashboard
            </h1>
            <p className="ad-reveal mt-1 text-sm text-neutral-500" style={d(0.08)}>
                {ordersLoading ? "Loading…" : "Live data from your store."}
            </p>

            <LowStockBanner products={products} loading={productsLoading} />

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                <Stat delay={0.1} label="Total orders" value={String(totalOrders)} icon={<Svg><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></Svg>} />
                <Stat delay={0.14} label="Customers" value={String(uniqueCustomers)} icon={<Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Svg>} />
                <Stat delay={0.18} label="Revenue" value={money(revenue)} icon={<Svg><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.3 0-2.3-.5-2.7-1.4M12 6v2M12 16v2" /></Svg>} />
                <Stat delay={0.22} label="Products" value={String(products.length)} icon={<Svg><path d="M20 12 12 20 4 12V4h8l8 8Z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>} />
                <Stat delay={0.26} label="Low stock items" value={String(lowStock)} icon={<Svg><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17v.5" /></Svg>} />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
                <Card delay={0.3}>
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-base font-semibold tracking-tight">Order summary</h2>
                        <label>
                            <span className="sr-only">Period</span>
                            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="h-9 cursor-pointer rounded-full bg-[#f4f3f2] px-4 text-xs font-medium outline-none hover:bg-neutral-200">
                                {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </label>
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-2">
                        <Ring percent={pct("shipped")} color={STATUS_COLOR.shipped} label="Shipped" />
                        <Ring percent={pct("delivered")} color={STATUS_COLOR.delivered} label="Delivered" />
                        <Ring percent={pct("cancelled")} color={STATUS_COLOR.cancelled} label="Cancelled" />
                    </div>
                    <p className="mt-5 text-center text-xs text-neutral-400">
                        {scoped.length} {scoped.length === 1 ? "order" : "orders"} in this period
                    </p>
                </Card>

                <Card delay={0.34}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold tracking-tight">Overview</h2>
                        <Link to="/admin/orders" className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">View all</Link>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Orders by status</p>
                    <div className="relative mx-auto mt-4 h-40 w-40">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={overview} dataKey="value" innerRadius="68%" outerRadius="100%" paddingAngle={3} stroke="none" cornerRadius={4}>
                                    {overview.map((e) => <Cell key={e.name} fill={e.color} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-semibold">{deliveredPct}%</span>
                            <span className="text-[10px] text-neutral-500">delivered</span>
                        </div>
                    </div>
                    <ul className="mt-4 space-y-2 text-xs">
                        {overview.map((e) => (
                            <li key={e.name} className="flex items-center justify-between">
                                <span className="flex items-center gap-2 capitalize">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.color }} />
                                    {e.name}
                                </span>
                                <span className="text-neutral-500">{e.value}</span>
                            </li>
                        ))}
                    </ul>
                </Card>

                <Card delay={0.38}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold tracking-tight">Top selling</h2>
                        <Link to="/shop" className="text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline">View all</Link>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">Units sold</p>
                    {topSelling.length === 0 ? (
                        <p className="mt-4 rounded-xl bg-[#f4f3f2] px-4 py-6 text-center text-xs text-neutral-500">
                            No sales yet.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-4">
                            {topSelling.map((p) => (
                                <li key={p.name}>
                                    {p.productId ? (
                                        <Link to={`/product/${p.productId}`} className="flex items-center gap-3">
                                            <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ backgroundColor: p.tone }}>
                                                {p.image && <img src={p.image} alt="" draggable={false} className="h-full w-full object-contain object-center" />}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{p.name}</span>
                                                <span className="block text-xs text-neutral-500">{p.price}</span>
                                            </span>
                                            <span className="text-sm font-semibold">{p.sold}</span>
                                        </Link>
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <span className="h-12 w-12 shrink-0 rounded-lg bg-[#f4f3f2]" />
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate text-sm font-medium">{p.name}</span>
                                            </span>
                                            <span className="text-sm font-semibold">{p.sold}</span>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
                <Card delay={0.42}>
                    <div className="flex items-center justify-between">
                        <h2 className="text-base font-semibold tracking-tight">Orders this week</h2>
                        <div className="flex items-center gap-4 text-xs text-neutral-500">
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" />This week</span>
                            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" />Last week</span>
                        </div>
                    </div>
                    <div className="mt-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weekly} barGap={4} margin={{ left: -20, right: 4 }}>
                                <CartesianGrid vertical={false} stroke="#ececec" />
                                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#737373" }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#737373" }} />
                                <Tooltip cursor={{ fill: "#f4f3f2" }} contentStyle={tooltipStyle} />
                                <Bar dataKey="thisWeek" name="This week" fill="#171717" radius={[6, 6, 0, 0]} maxBarSize={18} />
                                <Bar dataKey="lastWeek" name="Last week" fill="#d4d4d4" radius={[6, 6, 0, 0]} maxBarSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card delay={0.46}>
                    <h2 className="text-base font-semibold tracking-tight">Total revenue</h2>
                    <div className="mt-6 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={monthly} margin={{ left: -10, right: 8, top: 8 }}>
                                <defs>
                                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#171717" stopOpacity={0.18} />
                                        <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} stroke="#ececec" />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#737373" }} />
                                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#737373" }} tickFormatter={(v) => `R${Number(v) / 1000}k`} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(Number(v)), "Revenue"]} />
                                <Area type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} fill="url(#rev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
}