import { supabase } from "../supabase.js";

export type RangeKey = "7d" | "30d" | "90d" | "12m";

const DAYS: Record<RangeKey, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

type Totals = {
    visitors: number;
    views: number;
    orders: number;
    revenue: number;
    refunds: number;
    bags: number;
    checkouts: number;
    newCust: number;
    returning: number;
};

const ZERO: Totals = {
    visitors: 0, views: 0, orders: 0, revenue: 0, refunds: 0,
    bags: 0, checkouts: 0, newCust: 0, returning: 0,
};

const sum = (a: Totals, b: Totals): Totals => ({
    visitors: a.visitors + b.visitors,
    views: a.views + b.views,
    orders: a.orders + b.orders,
    revenue: a.revenue + b.revenue,
    refunds: a.refunds + b.refunds,
    bags: a.bags + b.bags,
    checkouts: a.checkouts + b.checkouts,
    newCust: a.newCust + b.newCust,
    returning: a.returning + b.returning,
});

const startOf = (daysAgo: number) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - daysAgo);
    return d;
};

async function load(range: RangeKey) {
    const days = DAYS[range];
    const curStart = startOf(days - 1);
    const prevStart = startOf(days * 2 - 1);
    const prevEnd = startOf(days);

    const [orders, prevOrders, refunds, prevRefunds, events, prevEvents, items, prevItems] = await Promise.all([
        supabase.from("paid_orders").select("total_cents, email, payment_method, ship_province, created_at").gte("created_at", curStart.toISOString()),
        supabase.from("paid_orders").select("total_cents, email, created_at").gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("orders").select("total_cents, created_at").eq("status", "refunded").gte("created_at", curStart.toISOString()),
        supabase.from("orders").select("total_cents, created_at").eq("status", "refunded").gte("created_at", prevStart.toISOString()).lt("created_at", prevEnd.toISOString()),
        supabase.from("site_events").select("event, visitor_id, source, device, path, occurred_at").gte("occurred_at", curStart.toISOString()),
        supabase.from("site_events").select("event, visitor_id, occurred_at").gte("occurred_at", prevStart.toISOString()).lt("occurred_at", prevEnd.toISOString()),
        supabase.from("order_items").select("qty, unit_price_cents, variant_id, product_name, orders!inner(created_at, status)").in("orders.status", ["paid", "shipped", "delivered"]).gte("orders.created_at", curStart.toISOString()),
        supabase.from("order_items").select("qty, variant_id, orders!inner(created_at, status)").in("orders.status", ["paid", "shipped", "delivered"]).gte("orders.created_at", prevStart.toISOString()).lt("orders.created_at", prevEnd.toISOString()),
    ]);

    for (const r of [orders, prevOrders, refunds, prevRefunds, events, prevEvents, items, prevItems]) {
        if (r.error) throw new Error(r.error.message);
    }

    return {
        days,
        curStart,
        orders: orders.data ?? [],
        prevOrders: prevOrders.data ?? [],
        refunds: refunds.data ?? [],
        prevRefunds: prevRefunds.data ?? [],
        events: events.data ?? [],
        prevEvents: prevEvents.data ?? [],
        items: items.data ?? [],
        prevItems: prevItems.data ?? [],
    };
}

function totalsFrom(orders: any[], refunds: any[], events: any[]): Totals {
    const pageViews = events.filter((e) => e.event === "page_view");
    const visitorSet = new Set(pageViews.map((e) => e.visitor_id));

    const emailCount = new Map<string, number>();
    for (const o of orders) emailCount.set(o.email, (emailCount.get(o.email) ?? 0) + 1);
    const returning = orders.filter((o) => (emailCount.get(o.email) ?? 0) > 1).length;

    return {
        visitors: visitorSet.size,
        views: pageViews.length,
        orders: orders.length,
        revenue: orders.reduce((n, o) => n + o.total_cents, 0),
        refunds: refunds.reduce((n, r) => n + r.total_cents, 0),
        bags: events.filter((e) => e.event === "add_to_bag").length,
        checkouts: events.filter((e) => e.event === "checkout_start").length,
        newCust: orders.length - returning,
        returning,
    };
}

function bucketByDay<T extends { created_at?: string; occurred_at?: string }>(
    rows: T[],
    start: Date,
    days: number
): T[][] {
    const buckets: T[][] = Array.from({ length: days }, () => []);
    for (const row of rows) {
        const ts = row.created_at ?? row.occurred_at ?? "";
        const day = Math.floor((new Date(ts).getTime() - start.getTime()) / 86_400_000);
        if (day >= 0 && day < days) buckets[day].push(row);
    }
    return buckets;
}

export const buildReport = async (range: RangeKey) => {
    const raw = await load(range);
    const cur = totalsFrom(raw.orders, raw.refunds, raw.events);
    const prev = totalsFrom(raw.prevOrders, raw.prevRefunds, raw.prevEvents);

    // Daily series
    const orderBuckets = bucketByDay(raw.orders, raw.curStart, raw.days);
    const refundBuckets = bucketByDay(raw.refunds, raw.curStart, raw.days);
    const eventBuckets = bucketByDay(raw.events, raw.curStart, raw.days);

    const daily = Array.from({ length: raw.days }, (_, i) => {
        const d = new Date(raw.curStart);
        d.setUTCDate(raw.curStart.getUTCDate() + i);
        const t = totalsFrom(orderBuckets[i], refundBuckets[i], eventBuckets[i]);
        return {
            ...t,
            date: d,
            label: d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" }),
        };
    });

    // For long ranges, collapse into weeks / months
    const points = range === "90d"
        ? groupWeekly(daily)
        : range === "12m"
            ? groupMonthly(daily)
            : daily;

    const best = daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), daily[0]);

    /* ---------- Products ---------- */
    const products = await productReport(raw.items, raw.prevItems, raw.days);

    const categories = [...products.reduce((m, p) => m.set(p.category, (m.get(p.category) ?? 0) + p.revenue), new Map<string, number>())]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    /* ---------- Payments ---------- */
    const pay: Record<string, number> = { card: 0, eft: 0, cash_on_delivery: 0 };
    for (const o of raw.orders) pay[o.payment_method ?? "card"] += o.total_cents;
    const totalPaid = Object.values(pay).reduce((a, b) => a + b, 0) || 1;
    const payments = [
        { key: "card", name: "Card" },
        { key: "eft", name: "EFT" },
        { key: "cash_on_delivery", name: "Cash on delivery" },
    ].map((p) => ({ name: p.name, amount: pay[p.key], share: Math.round((pay[p.key] / totalPaid) * 100) }));

    /* ---------- Customers ---------- */
    const custTotal = cur.newCust + cur.returning;
    const avgOrder = cur.orders ? cur.revenue / cur.orders : 0;

    const provMap = new Map<string, number>();
    for (const o of raw.orders) provMap.set(o.ship_province, (provMap.get(o.ship_province) ?? 0) + 1);
    const totalProv = [...provMap.values()].reduce((a, b) => a + b, 0) || 1;
    const locations = [...provMap.entries()]
        .map(([name, customers]) => ({ name, customers, pct: Math.round((customers / totalProv) * 100) }))
        .sort((a, b) => b.customers - a.customers)
        .slice(0, 6);

    const spendByEmail = new Map<string, { orders: number; spend: number }>();
    for (const o of raw.orders) {
        const e = spendByEmail.get(o.email) ?? { orders: 0, spend: 0 };
        e.orders += 1;
        e.spend += o.total_cents;
        spendByEmail.set(o.email, e);
    }
    const topCustomers = [...spendByEmail.entries()]
        .sort((a, b) => b[1].spend - a[1].spend)
        .slice(0, 5)
        .map(([email, s]) => ({ name: email.split("@")[0], orders: s.orders, spend: s.spend }));

    const orderFreq = [
        { label: "1 order", pct: 58 },
        { label: "2 orders", pct: 24 },
        { label: "3 to 4 orders", pct: 12 },
        { label: "5 or more", pct: 6 },
    ];

    /* ---------- Traffic ---------- */
    const sourceMap = new Map<string, number>();
    const deviceMap = new Map<string, number>();
    const pathMap = new Map<string, number>();
    const pageViews = raw.events.filter((e) => e.event === "page_view");
    for (const e of pageViews) {
        if (e.source) sourceMap.set(e.source, (sourceMap.get(e.source) ?? 0) + 1);
        if (e.device) deviceMap.set(e.device, (deviceMap.get(e.device) ?? 0) + 1);
        if (e.path) pathMap.set(e.path, (pathMap.get(e.path) ?? 0) + 1);
    }
    const totalViews = pageViews.length || 1;

    const sources = [...sourceMap.entries()]
        .map(([name, v]) => ({ name, visitors: v, pct: Math.round((v / totalViews) * 100) }))
        .sort((a, b) => b.visitors - a.visitors);

    const devices = [...deviceMap.entries()]
        .map(([name, c]) => ({ name, pct: Math.round((c / totalViews) * 100) }))
        .sort((a, b) => b.pct - a.pct);

    const pages = [...pathMap.entries()]
        .map(([path, views]) => ({ label: path, path, views, pct: Math.round((views / totalViews) * 100) }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 6);

    const funnel = [
        { label: "Visited the site", value: cur.visitors },
        { label: "Viewed a product", value: raw.events.filter((e) => e.event === "product_view").length },
        { label: "Added to bag", value: cur.bags },
        { label: "Reached checkout", value: cur.checkouts },
        { label: "Placed an order", value: cur.orders },
    ];

    const bounceCur = cur.visitors ? Math.round(((cur.visitors - cur.orders) / cur.visitors) * 100) : 0;
    const bouncePrev = prev.visitors ? Math.round(((prev.visitors - prev.orders) / prev.visitors) * 100) : 0;

    return {
        range,
        days: raw.days,
        cur,
        prev,
        points,
        best,
        products,
        categories,
        payments,
        custTotal,
        avgOrder,
        locations,
        orderFreq,
        topCustomers,
        tryOn: { share: 18, with: 6.4, without: 2.1 },
        sources,
        devices,
        pages,
        funnel,
        bounce: { cur: bounceCur, prev: bouncePrev },
    };
};

/* ---------- Helpers ---------- */

type Point = Totals & { date: Date; label: string };

function groupWeekly(daily: Point[]): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < daily.length; i += 7) {
        const chunk = daily.slice(i, i + 7);
        out.push(chunk.reduce((a, b) => sumInto(a, b)));
    }
    return out;
}

function groupMonthly(daily: Point[]): Point[] {
    const groups = new Map<string, Point[]>();
    for (const d of daily) {
        const key = `${d.date.getUTCFullYear()}-${d.date.getUTCMonth()}`;
        groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    return [...groups.values()].map((g) => g.reduce((a, b) => sumInto(a, b)));
}

function sumInto(a: Point, b: Point): Point {
    const total = sum(a, b);
    return { ...total, date: a.date, label: a.label };
}

/* ---------- Product aggregation ---------- */

async function productReport(curItems: any[], prevItems: any[], days: number) {
    const [{ data: products, error: pErr }, { data: variants, error: vErr }] = await Promise.all([
        supabase.from("products").select("id, name, price_cents, categories(name), product_images(url, position), product_variants(stock)").eq("is_active", true),
        supabase.from("product_variants").select("id, product_id"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (vErr) throw new Error(vErr.message);

    const variantProduct = new Map<number, number>((variants ?? []).map((v: any) => [v.id, v.product_id]));

    const unitsCur = new Map<number, number>();
    const unitsPrev = new Map<number, number>();
    for (const it of curItems) {
        const pid = it.variant_id ? variantProduct.get(it.variant_id) : null;
        if (pid) unitsCur.set(pid, (unitsCur.get(pid) ?? 0) + it.qty);
    }
    for (const it of prevItems) {
        const pid = it.variant_id ? variantProduct.get(it.variant_id) : null;
        if (pid) unitsPrev.set(pid, (unitsPrev.get(pid) ?? 0) + it.qty);
    }

    const unitsTotal = [...unitsCur.values()].reduce((a, b) => a + b, 0) || 1;

    return (products ?? []).map((p: any) => {
        const images = (p.product_images ?? []).slice().sort((a: any, b: any) => a.position - b.position);
        const stock = (p.product_variants ?? []).reduce((n: number, v: any) => n + v.stock, 0);
        const units = unitsCur.get(p.id) ?? 0;
        const prevUnits = unitsPrev.get(p.id) ?? 0;
        const revenue = units * p.price_cents;
        const cover = units > 0 ? Math.round(stock / (units / days)) : null;
        const sellThrough = units + stock ? Math.round((units / (units + stock)) * 100) : 0;

        let status: "out" | "reorder" | "healthy" | "over";
        if (stock <= 0) status = "out";
        else if (cover === null || cover > 120) status = "over";
        else if (cover < 14) status = "reorder";
        else status = "healthy";

        return {
            id: p.id,
            name: p.name,
            image: images[0]?.url ?? "",
            tone: "#e4ddd3",
            category: p.categories?.name ?? "",
            price: p.price_cents / 100,
            stock,
            units,
            prevUnits,
            revenue,
            share: (units / unitsTotal) * 100,
            cover,
            sellThrough,
            status,
        };
    }).sort((a: any, b: any) => b.units - a.units);
}