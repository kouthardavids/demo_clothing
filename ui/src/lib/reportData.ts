const API_URL = import.meta.env.VITE_API_URL;

export type RangeKey = "7d" | "30d" | "90d" | "12m";

export const RANGES: { value: RangeKey; label: string; days: number }[] = [
    { value: "7d", label: "Last 7 days", days: 7 },
    { value: "30d", label: "Last 30 days", days: 30 },
    { value: "90d", label: "Last 90 days", days: 90 },
    { value: "12m", label: "Last 12 months", days: 365 },
];

export type StockStatus = "out" | "reorder" | "healthy" | "over";

export type Report = {
    range: RangeKey;
    days: number;
    cur: Totals;
    prev: Totals;
    points: (Totals & { label: string; date: string })[];
    best: Totals & { label: string; date: string };
    products: ProductRow[];
    categories: { name: string; value: number }[];
    payments: { name: string; amount: number; share: number }[];
    custTotal: number;
    avgOrder: number;
    locations: { name: string; customers: number; pct: number }[];
    orderFreq: { label: string; pct: number }[];
    topCustomers: { name: string; orders: number; spend: number }[];
    tryOn: { share: number; with: number; without: number };
    sources: { name: string; visitors: number; pct: number }[];
    devices: { name: string; pct: number }[];
    pages: { label: string; path: string; views: number; pct: number }[];
    funnel: { label: string; value: number }[];
    bounce: { cur: number; prev: number };
};

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

type ProductRow = {
    id: number;
    name: string;
    image: string;
    tone: string;
    category: string;
    price: number;
    stock: number;
    units: number;
    prevUnits: number;
    revenue: number;
    share: number;
    cover: number | null;
    sellThrough: number;
    status: StockStatus;
};

export const fetchReport = async (range: RangeKey): Promise<Report> => {
    const res = await fetch(`${API_URL}/api/reports?range=${range}`);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Could not load report");
    }
    return res.json();
};