import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { money } from "../../lib/cart";
import { RANGES, fetchReport } from "../../lib/api/reportData";
import type { RangeKey, Report, StockStatus } from "../../lib/api/reportData";

const d = (s: number) => ({ ["--d" as string]: `${s}s` });
const tooltipStyle = { borderRadius: 12, border: "1px solid #e5e5e5", fontSize: 12, boxShadow: "none" };
const tick = { fontSize: 12, fill: "#737373" };
const SHADES = ["#171717", "#525252", "#8a8a8a", "#bdbdbd", "#e0e0e0"];
const kRand = (v: unknown) => `R${Math.round(Number(v) / 1000)}k`;
const fmt = (n: number) => n.toLocaleString("en-ZA");

const CSS = `
@keyframes rp-fade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
.rp-fade { animation: rp-fade 0.45s cubic-bezier(0.22, 1, 0.36, 1) both }
.rp-bar { transition: width 0.9s cubic-bezier(0.22, 1, 0.36, 1) }
.rp-scroll { scrollbar-width: none }
.rp-scroll::-webkit-scrollbar { display: none }
@media (prefers-reduced-motion: reduce) { .rp-fade { animation: none } .rp-bar { transition: none } }
`;

type TabKey = "money" | "products" | "inventory" | "customers" | "traffic";
const TABS: { key: TabKey; label: string; question: string; hint: string }[] = [
    { key: "money", label: "Revenue", question: "How much money is my business making?", hint: "Sales, orders and what each customer spends." },
    { key: "products", label: "Products", question: "What products are selling?", hint: "Your best sellers and slowest movers." },
    { key: "inventory", label: "Inventory", question: "How is my inventory performing?", hint: "What you hold, how fast it sells and what to reorder." },
    { key: "customers", label: "Customers", question: "How are my customers behaving?", hint: "Who buys, how often and where they are." },
    { key: "traffic", label: "Traffic", question: "How many people are visiting my website?", hint: "Visitors, where they come from and where they drop off." },
];

const Svg = ({ children }: { children: ReactNode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
    return <section className={`rounded-2xl bg-white p-5 md:p-6 ${className}`}>{children}</section>;
}

function CardTitle({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-5">
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
        </div>
    );
}

function Delta({ now, before, invert = false }: { now: number; before: number; invert?: boolean }) {
    if (!before) return null;
    const pct = ((now - before) / before) * 100;
    const good = invert ? pct <= 0 : pct >= 0;
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: good ? "#059669" : "#dc2626" }}>
            {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
        </span>
    );
}

function Stat({ label, value, delta, icon, note }: { label: string; value: string; delta?: ReactNode; icon: ReactNode; note?: string }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-5">
            <div className="min-w-0">
                <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-neutral-500">{label}</p>
                <p className="mt-2 flex items-center gap-2 text-[11px] text-neutral-400">
                    {delta}
                    {delta ? "vs previous period" : note}
                </p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4f3f2]">{icon}</span>
        </div>
    );
}

const Grid = ({ children, cols = "xl:grid-cols-4" }: { children: ReactNode; cols?: string }) => (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${cols}`}>{children}</div>
);

function Donut({ data, center }: { data: { name: string; value: number }[]; center?: ReactNode }) {
    return (
        <div className="relative mx-auto h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" innerRadius="68%" outerRadius="100%" paddingAngle={3} stroke="none" cornerRadius={4}>
                        {data.map((e, i) => (
                            <Cell key={e.name} fill={SHADES[i % SHADES.length]} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
            </ResponsiveContainer>
            {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
        </div>
    );
}

function Legend({ items }: { items: { name: string; right: string }[] }) {
    return (
        <ul className="mt-5 space-y-2.5 text-xs">
            {items.map((it, i) => (
                <li key={it.name} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SHADES[i % SHADES.length] }} />
                        {it.name}
                    </span>
                    <span className="text-neutral-500">{it.right}</span>
                </li>
            ))}
        </ul>
    );
}

function BarRow({ label, value, pct, color = "#171717" }: { label: string; value: string; pct: number; color?: string }) {
    return (
        <li>
            <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{label}</span>
                <span className="shrink-0 text-xs text-neutral-500">{value}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                <div className="rp-bar h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
            </div>
        </li>
    );
}

function Thumb({ src, tone, size = "h-12 w-10" }: { src: string; tone: string; size?: string }) {
    return (
        <span className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-lg`} style={{ backgroundColor: tone }}>
            {src && <img src={src} alt="" draggable={false} className="h-full w-full object-contain object-center" />}
        </span>
    );
}

const AreaTip = (f: (v: number) => string, name: string) => ({
    contentStyle: tooltipStyle,
    formatter: (v: unknown) => [f(Number(v)), name] as [string, string],
});

// 1. Revenue
function MoneyTab({ r }: { r: Report }) {
    const { cur, prev } = r;
    const aov = cur.orders ? cur.revenue / cur.orders : 0;
    const prevAov = prev.orders ? prev.revenue / prev.orders : 0;
    const refundRate = cur.revenue ? (cur.refunds / cur.revenue) * 100 : 0;

    return (
        <div className="space-y-4">
            <Grid>
                <Stat label="Revenue" value={money(cur.revenue)} delta={<Delta now={cur.revenue} before={prev.revenue} />} icon={<Svg><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.3 0-2.3-.5-2.7-1.4M12 6v2M12 16v2" /></Svg>} />
                <Stat label="Orders" value={fmt(cur.orders)} delta={<Delta now={cur.orders} before={prev.orders} />} icon={<Svg><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></Svg>} />
                <Stat label="Average order value" value={money(Math.round(aov))} delta={<Delta now={aov} before={prevAov} />} icon={<Svg><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></Svg>} />
                <Stat label="Refunds" value={money(cur.refunds)} delta={<Delta now={cur.refunds} before={prev.refunds} invert />} icon={<Svg><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></Svg>} />
            </Grid>

            <Card>
                <CardTitle title="Revenue over time" sub="Money coming in, before refunds." />
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={r.points} margin={{ left: -8, right: 8, top: 8 }}>
                            <defs>
                                <linearGradient id="rp-rev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#171717" stopOpacity={0.18} />
                                    <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#ececec" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} tick={tick} tickFormatter={kRand} />
                            <Tooltip {...AreaTip(money, "Revenue")} />
                            <Area type="monotone" dataKey="revenue" stroke="#171717" strokeWidth={2} fill="url(#rp-rev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card>
                    <CardTitle title="Revenue by category" />
                    <Donut data={r.categories} center={<><span className="text-lg font-semibold">{money(cur.revenue)}</span><span className="text-[10px] text-neutral-500">total</span></>} />
                    <Legend items={r.categories.map((c) => ({ name: c.name, right: money(c.value) }))} />
                </Card>

                <Card>
                    <CardTitle title="How customers pay" />
                    <ul className="space-y-5">
                        {r.payments.map((p, i) => (
                            <BarRow key={p.name} label={p.name} value={`${money(p.amount)} · ${p.share}%`} pct={p.share} color={SHADES[i]} />
                        ))}
                    </ul>
                </Card>

                <Card>
                    <CardTitle title="Highlights" />
                    <dl className="space-y-4 text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-neutral-500">Best day</dt>
                            <dd className="text-right font-medium">
                                {new Date(r.best.date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                                <span className="block text-xs font-normal text-neutral-500">{money(r.best.revenue)}</span>
                            </dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-4">
                            <dt className="text-neutral-500">Average per day</dt>
                            <dd className="font-medium">{money(Math.round(cur.revenue / r.days))}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-4">
                            <dt className="text-neutral-500">Refund rate</dt>
                            <dd className="font-medium">{refundRate.toFixed(1)}%</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-3 border-t border-neutral-100 pt-4">
                            <dt className="text-neutral-500">Net revenue</dt>
                            <dd className="font-medium">{money(cur.revenue - cur.refunds)}</dd>
                        </div>
                    </dl>
                </Card>
            </div>
        </div>
    );
}

// 2. Products
function ProductsTab({ r }: { r: Report }) {
    const { products, cur, prev } = r;
    const units = products.reduce((n, p) => n + p.units, 0);
    const prevUnits = products.reduce((n, p) => n + p.prevUnits, 0);
    const best = products[0];
    const slow = products[products.length - 1];

    return (
        <div className="space-y-4">
            <Grid>
                <Stat label="Units sold" value={fmt(units)} delta={<Delta now={units} before={prevUnits} />} icon={<Svg><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></Svg>} />
                <Stat label="Products that sold" value={`${products.filter((p) => p.units > 0).length} of ${products.length}`} note={`${fmt(cur.orders)} orders`} icon={<Svg><path d="M20 12 12 20 4 12V4h8l8 8Z" /><circle cx="8.5" cy="8.5" r="1.2" /></Svg>} />
                <Stat label="Best seller" value={best?.name ?? "None"} note={best ? `${fmt(best.units)} units` : ""} icon={<Svg><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></Svg>} />
                <Stat label="Slowest mover" value={slow?.name ?? "None"} note={slow ? `${fmt(slow.units)} units` : ""} icon={<Svg><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>} />
            </Grid>

            <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
                <Card>
                    <CardTitle title="Units sold by product" sub={`${prev.orders ? "Compared across" : "Across"} the selected period.`} />
                    <div style={{ height: Math.max(220, products.length * 48 + 30) }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={products} layout="vertical" margin={{ left: 0, right: 16 }}>
                                <CartesianGrid horizontal={false} stroke="#ececec" />
                                <XAxis type="number" tickLine={false} axisLine={false} tick={tick} />
                                <YAxis type="category" dataKey="name" width={84} tickLine={false} axisLine={false} tick={tick} />
                                <Tooltip cursor={{ fill: "#f4f3f2" }} contentStyle={tooltipStyle} />
                                <Bar dataKey="units" name="Units sold" fill="#171717" radius={[0, 6, 6, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card>
                    <CardTitle title="Product ranking" />
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[34rem] text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                    {["#", "Product", "Units", "Revenue", "Share"].map((h, i) => (
                                        <th key={h} className={`pb-3 font-medium ${i === 3 ? "text-right" : ""}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p, i) => (
                                    <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                                        <td className="py-3 pr-3 text-neutral-400">{i + 1}</td>
                                        <td className="py-3 pr-4">
                                            <span className="flex items-center gap-3">
                                                <Thumb src={p.image} tone={p.tone} />
                                                <span className="min-w-0">
                                                    <span className="block truncate font-medium">{p.name}</span>
                                                    <span className="block text-xs text-neutral-400">{p.category}</span>
                                                </span>
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className="block font-medium">{fmt(p.units)}</span>
                                            <Delta now={p.units} before={p.prevUnits} />
                                        </td>
                                        <td className="py-3 pr-4 text-right font-semibold">{money(p.revenue)}</td>
                                        <td className="w-36 py-3 pl-4">
                                            <span className="flex items-center gap-2">
                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                                                    <span className="rp-bar block h-full rounded-full bg-neutral-900" style={{ width: `${p.share}%` }} />
                                                </span>
                                                <span className="w-9 text-right text-xs text-neutral-500">{p.share.toFixed(0)}%</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}

// 3. Inventory
const STATUS: Record<StockStatus, { label: string; color: string }> = {
    out: { label: "Out of stock", color: "#dc2626" },
    reorder: { label: "Reorder soon", color: "#d97706" },
    healthy: { label: "Healthy", color: "#059669" },
    over: { label: "Overstocked", color: "#6b7280" },
};

function InventoryTab({ r }: { r: Report }) {
    const { products } = r;
    const stockValue = products.reduce((n, p) => n + p.stock * p.price, 0);
    const onHand = products.reduce((n, p) => n + p.stock, 0);
    const sold = products.reduce((n, p) => n + p.units, 0);
    const sellThrough = sold + onHand ? Math.round((sold / (sold + onHand)) * 100) : 0;
    const attention = products.filter((p) => p.status === "out" || p.status === "reorder").length;
    const byCover = [...products].sort((a, b) => (a.cover ?? 9999) - (b.cover ?? 9999));

    return (
        <div className="space-y-4">
            <Grid>
                <Stat label="Stock value" value={money(stockValue)} note="at selling price" icon={<Svg><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.3 0-2.3-.5-2.7-1.4M12 6v2M12 16v2" /></Svg>} />
                <Stat label="Units on hand" value={fmt(onHand)} note={`${products.length} products`} icon={<Svg><path d="M21 8 12 3 3 8l9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8M12 13v8" /></Svg>} />
                <Stat label="Sell-through" value={`${sellThrough}%`} note="of stock already sold" icon={<Svg><path d="M4 20V10M10 20V4M16 20v-7M2 20h20" /></Svg>} />
                <Stat label="Needs attention" value={String(attention)} note="out or reorder soon" icon={<Svg><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17v.5" /></Svg>} />
            </Grid>

            <Card>
                <CardTitle title="Stock on hand vs units sold" sub="A product with lots on hand and few sold is tying up money." />
                <div className="mb-4 flex items-center gap-5 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" />On hand</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" />Sold</span>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={products} barGap={4} margin={{ left: -16, right: 4 }}>
                            <CartesianGrid vertical={false} stroke="#ececec" />
                            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={tick} />
                            <YAxis tickLine={false} axisLine={false} tick={tick} />
                            <Tooltip cursor={{ fill: "#f4f3f2" }} contentStyle={tooltipStyle} />
                            <Bar dataKey="stock" name="On hand" fill="#171717" radius={[6, 6, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="units" name="Sold" fill="#d4d4d4" radius={[6, 6, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card>
                <CardTitle title="How long will your stock last?" sub="Days of cover: how many days the current stock lasts at the current selling pace." />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[40rem] text-left text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                {["Product", "On hand", "Sold", "Sell-through", "Days of cover", "Status"].map((h) => (
                                    <th key={h} className="pb-3 font-medium">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {byCover.map((p) => {
                                const s = STATUS[p.status];
                                return (
                                    <tr key={p.id} className="border-b border-neutral-100 last:border-0">
                                        <td className="py-3 pr-4">
                                            <span className="flex items-center gap-3">
                                                <Thumb src={p.image} tone={p.tone} />
                                                <span className="font-medium">{p.name}</span>
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 font-medium">{fmt(p.stock)}</td>
                                        <td className="py-3 pr-4 text-neutral-600">{fmt(p.units)}</td>
                                        <td className="w-40 py-3 pr-4">
                                            <span className="flex items-center gap-2">
                                                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-200">
                                                    <span className="rp-bar block h-full rounded-full bg-neutral-900" style={{ width: `${p.sellThrough}%` }} />
                                                </span>
                                                <span className="w-9 text-right text-xs text-neutral-500">{p.sellThrough}%</span>
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4">{p.cover === null ? "No sales" : `${fmt(p.cover)} days`}</td>
                                        <td className="py-3">
                                            <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ color: s.color, backgroundColor: `${s.color}14` }}>
                                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                                                {s.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <p className="mt-4 text-xs text-neutral-400">Reorder soon: under 14 days of cover. Overstocked: over 120 days.</p>
            </Card>
        </div>
    );
}

// 4. Customers
function CustomersTab({ r }: { r: Report }) {
    const { cur, prev } = r;
    const repeat = cur.orders ? (cur.returning / cur.orders) * 100 : 0;
    const prevRepeat = prev.orders ? (prev.returning / prev.orders) * 100 : 0;
    const spend = r.custTotal ? cur.revenue / r.custTotal : 0;
    const prevSpend = prev.newCust + prev.returning ? prev.revenue / (prev.newCust + prev.returning) : 0;

    return (
        <div className="space-y-4">
            <Grid>
                <Stat label="New customers" value={fmt(cur.newCust)} delta={<Delta now={cur.newCust} before={prev.newCust} />} icon={<Svg><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6" /></Svg>} />
                <Stat label="Returning customers" value={fmt(cur.returning)} delta={<Delta now={cur.returning} before={prev.returning} />} icon={<Svg><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" /><path d="M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16" /><path d="M3 21v-5h5" /></Svg>} />
                <Stat label="Repeat purchase rate" value={`${repeat.toFixed(1)}%`} delta={<Delta now={repeat} before={prevRepeat} />} icon={<Svg><path d="m12 20-7-7a4.6 4.6 0 0 1 6.5-6.5L12 7l.5-.5A4.6 4.6 0 0 1 19 13l-7 7Z" /></Svg>} />
                <Stat label="Average spend per customer" value={money(Math.round(spend))} delta={<Delta now={spend} before={prevSpend} />} icon={<Svg><circle cx="12" cy="12" r="9" /><path d="M14.5 9.2c-.4-.8-1.3-1.2-2.5-1.2-1.4 0-2.5.7-2.5 1.8 0 2.5 5 1.2 5 3.7 0 1.1-1.1 1.9-2.5 1.9-1.3 0-2.3-.5-2.7-1.4M12 6v2M12 16v2" /></Svg>} />
            </Grid>

            <Card>
                <CardTitle title="New vs returning customers" sub="Orders placed by people buying for the first time, and by people who came back." />
                <div className="mb-4 flex items-center gap-5 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" />New</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" />Returning</span>
                </div>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={r.points} margin={{ left: -16, right: 4 }}>
                            <CartesianGrid vertical={false} stroke="#ececec" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} tick={tick} />
                            <Tooltip cursor={{ fill: "#f4f3f2" }} contentStyle={tooltipStyle} />
                            <Bar dataKey="newCust" name="New" stackId="c" fill="#171717" maxBarSize={26} />
                            <Bar dataKey="returning" name="Returning" stackId="c" fill="#d4d4d4" radius={[6, 6, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card>
                    <CardTitle title="How often people buy" sub="Share of customers by number of orders." />
                    <ul className="space-y-5">
                        {r.orderFreq.map((f, i) => (
                            <BarRow key={f.label} label={f.label} value={`${f.pct}%`} pct={f.pct} color={SHADES[i]} />
                        ))}
                    </ul>
                </Card>

                <Card>
                    <CardTitle title="Where customers are" sub="By province, from delivery addresses." />
                    <ul className="space-y-4">
                        {r.locations.map((l) => (
                            <BarRow key={l.name} label={l.name} value={`${fmt(l.customers)} · ${l.pct}%`} pct={l.pct * 2.5} />
                        ))}
                    </ul>
                </Card>

                <Card>
                    <CardTitle title="Fitting room impact" sub="Do shoppers who use Try On buy more?" />
                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-[#f4f3f2] p-4">
                            <p className="text-2xl font-semibold">{r.tryOn.with}%</p>
                            <p className="mt-1 text-xs text-neutral-500">convert after trying on</p>
                        </div>
                        <div className="rounded-xl bg-[#f4f3f2] p-4">
                            <p className="text-2xl font-semibold">{r.tryOn.without}%</p>
                            <p className="mt-1 text-xs text-neutral-500">convert without it</p>
                        </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                        <span className="font-medium text-neutral-900">{r.tryOn.share}%</span> of visitors open the fitting room. Those who do are about{" "}
                        <span className="font-medium text-neutral-900">{(r.tryOn.with / r.tryOn.without).toFixed(1)}×</span> more likely to buy.
                    </p>
                </Card>
            </div>

            <Card>
                <CardTitle title="Top customers" sub="Highest spenders in this period." />
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead>
                            <tr className="border-b border-neutral-200 text-xs text-neutral-500">
                                <th className="pb-3 font-medium">Customer</th>
                                <th className="pb-3 font-medium">Orders</th>
                                <th className="pb-3 text-right font-medium">Total spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {r.topCustomers.map((c) => (
                                <tr key={c.name} className="border-b border-neutral-100 last:border-0">
                                    <td className="py-3 pr-4">
                                        <span className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f4f3f2] text-[11px] font-medium">
                                                {c.name.split(" ").map((p) => p[0]).join("")}
                                            </span>
                                            {c.name}
                                        </span>
                                    </td>
                                    <td className="py-3 pr-4 text-neutral-600">{c.orders}</td>
                                    <td className="py-3 text-right font-semibold">{money(c.spend)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}

// 5. Traffic
function TrafficTab({ r }: { r: Report }) {
    const { cur, prev } = r;
    const conv = cur.visitors ? (cur.orders / cur.visitors) * 100 : 0;
    const prevConv = prev.visitors ? (prev.orders / prev.visitors) * 100 : 0;

    return (
        <div className="space-y-4">
            <Grid>
                <Stat label="Visitors" value={fmt(cur.visitors)} delta={<Delta now={cur.visitors} before={prev.visitors} />} icon={<Svg><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></Svg>} />
                <Stat label="Page views" value={fmt(cur.views)} delta={<Delta now={cur.views} before={prev.views} />} icon={<Svg><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></Svg>} />
                <Stat label="Conversion rate" value={`${conv.toFixed(2)}%`} delta={<Delta now={conv} before={prevConv} />} icon={<Svg><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></Svg>} />
                <Stat label="Bounce rate" value={`${r.bounce.cur}%`} delta={<Delta now={r.bounce.cur} before={r.bounce.prev} invert />} icon={<Svg><path d="M9 4H5v16h4M15 8l5 4-5 4M20 12H9" /></Svg>} />
            </Grid>

            <Card>
                <CardTitle title="Visitors over time" sub="People who came to the site, and the pages they looked at." />
                <div className="mb-4 flex items-center gap-5 text-xs text-neutral-500">
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-900" />Visitors</span>
                    <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-neutral-300" />Page views</span>
                </div>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={r.points} margin={{ left: -8, right: 8, top: 8 }}>
                            <defs>
                                <linearGradient id="rp-vis" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#171717" stopOpacity={0.16} />
                                    <stop offset="100%" stopColor="#171717" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke="#ececec" />
                            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={tick} minTickGap={24} />
                            <YAxis tickLine={false} axisLine={false} tick={tick} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Area type="monotone" dataKey="views" name="Page views" stroke="#bdbdbd" strokeWidth={2} fill="none" />
                            <Area type="monotone" dataKey="visitors" name="Visitors" stroke="#171717" strokeWidth={2} fill="url(#rp-vis)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-3">
                <Card>
                    <CardTitle title="Where visitors come from" />
                    <Donut data={r.sources.map((s) => ({ name: s.name, value: s.visitors }))} center={<><span className="text-lg font-semibold">{fmt(cur.visitors)}</span><span className="text-[10px] text-neutral-500">visitors</span></>} />
                    <Legend items={r.sources.map((s) => ({ name: s.name, right: `${fmt(s.visitors)} · ${s.pct}%` }))} />
                </Card>

                <Card>
                    <CardTitle title="Devices" />
                    <ul className="space-y-5">
                        {r.devices.map((dv, i) => (
                            <BarRow key={dv.name} label={dv.name} value={`${dv.pct}%`} pct={dv.pct} color={SHADES[i]} />
                        ))}
                    </ul>
                    <p className="mt-6 rounded-xl bg-[#f4f3f2] p-4 text-xs leading-relaxed text-neutral-600">
                        Most of your visitors are on a phone, so the mobile experience matters most.
                    </p>
                </Card>

                <Card>
                    <CardTitle title="Most viewed pages" />
                    <ul className="space-y-4">
                        {r.pages.map((p) => (
                            <BarRow key={p.label} label={p.label} value={`${fmt(p.views)} views`} pct={p.pct * 3} />
                        ))}
                    </ul>
                </Card>
            </div>

            <Card>
                <CardTitle title="Where visitors drop off" sub="From arriving on the site to placing an order." />
                <ul className="space-y-5">
                    {r.funnel.map((step, i) => {
                        const top = r.funnel[0].value || 1;
                        const before = i ? r.funnel[i - 1].value : 0;
                        return (
                            <li key={step.label}>
                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium">{step.label}</span>
                                    <span className="text-xs text-neutral-500">
                                        {fmt(step.value)}
                                        {i > 0 && before > 0 && <span className="ml-2 text-neutral-400">{((step.value / before) * 100).toFixed(0)}% of previous step</span>}
                                    </span>
                                </div>
                                <div className="mt-2 h-8 overflow-hidden rounded-lg bg-[#f4f3f2]">
                                    <div className="rp-bar h-full rounded-lg" style={{ width: `${(step.value / top) * 100}%`, backgroundColor: SHADES[Math.min(i, 3)] }} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </Card>
        </div>
    );
}

// Page
export default function AdminReports() {
    const [range, setRange] = useState<RangeKey>("30d");
    const [tab, setTab] = useState<TabKey>("money");
    const [r, setR] = useState<Report | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError(null);
        fetchReport(range)
            .then((data) => { if (alive) setR(data); })
            .catch((e) => { if (alive) setError(e instanceof Error ? e.message : "Could not load report"); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [range]);

    const active = TABS.find((t) => t.key === tab) ?? TABS[0];
    const rangeLabel = RANGES.find((x) => x.value === range)?.label ?? "";

    const exportCsv = () => {
        if (!r) return;
        const head = ["Period", "Visitors", "Page views", "Orders", "Revenue (R)", "Refunds (R)", "New customers", "Returning customers"];
        const body = r.points.map((p) => [p.label, p.visitors, p.views, p.orders, p.revenue, p.refunds, p.newCust, p.returning]);
        const csv = [head, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `report-${range}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <div>
            <style>{CSS}</style>

            <div className="ad-reveal flex flex-wrap items-end justify-between gap-4" style={d(0.05)}>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Reports</h1>
                    <p className="mt-1 text-sm text-neutral-500">
                        {loading ? "Loading…" : "Live data from your store."}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <label>
                        <span className="sr-only">Period</span>
                        <select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} className="h-10 cursor-pointer rounded-full bg-white px-4 text-xs font-medium outline-none transition-colors hover:bg-neutral-100">
                            {RANGES.map((x) => (
                                <option key={x.value} value={x.value}>{x.label}</option>
                            ))}
                        </select>
                    </label>
                    <button type="button" onClick={exportCsv} disabled={!r || loading} className="h-10 rounded-full bg-neutral-900 px-5 text-xs font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-50">
                        Export CSV
                    </button>
                </div>
            </div>

            <div role="tablist" aria-label="Reports" className="ad-reveal rp-scroll mt-6 flex gap-2 overflow-x-auto" style={d(0.1)}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        onClick={() => setTab(t.key)}
                        className={`h-10 shrink-0 rounded-full px-5 text-xs font-medium transition-colors ${tab === t.key ? "bg-neutral-900 text-white" : "bg-white hover:bg-neutral-100"}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="ad-reveal mt-6" style={d(0.14)}>
                <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{active.question}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                    {active.hint} <span className="text-neutral-400">&middot; {rangeLabel}</span>
                </p>
            </div>

            <div className="mt-5">
                {loading ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
                            ))}
                        </div>
                        <div className="h-72 animate-pulse rounded-2xl bg-white" />
                    </div>
                ) : error ? (
                    <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-700" role="alert">
                        {error}
                    </p>
                ) : r ? (
                    <div key={`${tab}-${range}`} className="rp-fade" role="tabpanel">
                        {tab === "money" && <MoneyTab r={r} />}
                        {tab === "products" && <ProductsTab r={r} />}
                        {tab === "inventory" && <InventoryTab r={r} />}
                        {tab === "customers" && <CustomersTab r={r} />}
                        {tab === "traffic" && <TrafficTab r={r} />}
                    </div>
                ) : null}
            </div>
        </div>
    );
}