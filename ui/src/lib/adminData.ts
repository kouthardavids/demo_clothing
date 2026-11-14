import { PRODUCTSS } from "./products";
import { priceOf } from "./cart";

export type Status = "Processing" | "On delivery" | "Delivered" | "Cancelled";
export type Payment = "Card" | "EFT" | "Cash on delivery";
export type Period = "today" | "7d" | "30d" | "all";

export type Order = {
    id: string;
    customer: string;
    payment: Payment;
    location: string;
    status: Status;
    contact: string;
    total: number; // rand
    daysAgo: number;
};

export const STATUSES: Status[] = ["Processing", "On delivery", "Delivered", "Cancelled"];
export const STATUS_COLOR: Record<Status, string> = {
    Processing: "#f59e0b",
    "On delivery": "#171717",
    Delivered: "#059669",
    Cancelled: "#dc2626",
};

export const PERIODS: { value: Period; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "all", label: "All time" },
];

// id, customer, payment, location, status, contact, total, daysAgo
const RAW: [string, string, Payment, string, Status, string, number, number][] = [
    ["#45671", "Joe Martin", "Card", "132 Main St, Cape Town", "Delivered", "082 456 2690", 1248, 0],
    ["#45672", "Aisha Peterson", "Card", "8 Long St, Cape Town", "Delivered", "082 456 2641", 649, 0],
    ["#45673", "Shaleena Naidoo", "Cash on delivery", "33 Berea Rd, Durban", "On delivery", "083 456 2672", 1598, 0],
    ["#45674", "Patrik Botha", "Card", "400 Church St, Pretoria", "Cancelled", "084 456 2651", 449, 1],
    ["#45675", "Angeline Dlamini", "Cash on delivery", "25 Oak Ave, Johannesburg", "On delivery", "082 456 2662", 799, 1],
    ["#45676", "Denver Smith", "EFT", "28 Square Rd, Cape Town", "Delivered", "082 456 2613", 2147, 1],
    ["#45677", "Jamison Cele", "Card", "22 Seal St, Gqeberha", "Delivered", "071 456 2616", 699, 2],
    ["#45678", "Nadia Adams", "Card", "5 Rose Ln, Stellenbosch", "Processing", "072 456 2677", 1448, 2],
    ["#45679", "Thabo Mokoena", "EFT", "90 Vilakazi St, Soweto", "Delivered", "073 456 2688", 899, 3],
    ["#45680", "Lerato Khumalo", "Card", "14 Beach Rd, Durban", "Delivered", "074 456 2690", 1347, 3],
    ["#45681", "Kyle Jacobs", "Cash on delivery", "61 Kloof St, Cape Town", "Cancelled", "076 456 2611", 649, 4],
    ["#45682", "Zanele Nkosi", "Card", "7 Park Dr, Bloemfontein", "Delivered", "078 456 2622", 1798, 4],
    ["#45683", "Ryan van Wyk", "EFT", "12 Vine St, Paarl", "Delivered", "079 456 2633", 449, 5],
    ["#45684", "Fatima Hendricks", "Card", "3 Pine Rd, Cape Town", "On delivery", "081 456 2644", 1348, 5],
    ["#45685", "Sipho Dube", "Card", "77 Jan Smuts Ave, Johannesburg", "Delivered", "082 456 2655", 2497, 6],
    ["#45686", "Megan Louw", "Cash on delivery", "19 Ocean View, George", "Delivered", "083 456 2666", 799, 8],
    ["#45687", "Imran Patel", "Card", "44 Grey St, Durban", "Delivered", "084 456 2677", 1598, 10],
    ["#45688", "Chloe Fourie", "EFT", "2 Mill St, Cape Town", "Cancelled", "071 456 2688", 699, 12],
    ["#45689", "Bongani Zulu", "Card", "88 Smith St, Durban", "Delivered", "072 456 2699", 1148, 15],
    ["#45690", "Tasneem Davids", "Card", "6 Station Rd, Cape Town", "Delivered", "073 456 2610", 2196, 19],
    ["#45691", "Liam Pretorius", "EFT", "31 Lake Rd, Pretoria", "Delivered", "074 456 2621", 649, 24],
];

export const ORDERS: Order[] = RAW.map(([id, customer, payment, location, status, contact, total, daysAgo]) => ({
    id, customer, payment, location, status, contact, total, daysAgo,
}));

export const inPeriod = (o: Order, p: Period) => p === "all" || o.daysAgo <= (p === "today" ? 0 : p === "7d" ? 7 : 30);

export const orderDate = (o: Order) =>
    new Date(Date.now() - o.daysAgo * 864e5).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });

/* ---- headline numbers (swap for API data later) ---- */
export const LOW_STOCK_AT = 20;
export const headline = () => ({
    orders: ORDERS.length,
    customers: new Set(ORDERS.map((o) => o.customer)).size,
    revenue: ORDERS.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0),
    products: PRODUCTSS.length,
    lowStock: PRODUCTSS.filter((p) => p.stock < LOW_STOCK_AT).length,
});

/* ---- demo chart data ---- */
export const WEEKLY = [
    { day: "Mon", thisWeek: 48, lastWeek: 40 },
    { day: "Tue", thisWeek: 72, lastWeek: 55 },
    { day: "Wed", thisWeek: 36, lastWeek: 52 },
    { day: "Thu", thisWeek: 41, lastWeek: 38 },
    { day: "Fri", thisWeek: 66, lastWeek: 58 },
    { day: "Sat", thisWeek: 88, lastWeek: 70 },
    { day: "Sun", thisWeek: 54, lastWeek: 47 },
];

export const MONTHLY_REVENUE = [
    { month: "Jan", revenue: 18200 }, { month: "Feb", revenue: 21400 }, { month: "Mar", revenue: 19800 },
    { month: "Apr", revenue: 26500 }, { month: "May", revenue: 31200 }, { month: "Jun", revenue: 28900 },
    { month: "Jul", revenue: 34700 }, { month: "Aug", revenue: 33100 }, { month: "Sep", revenue: 39800 },
    { month: "Oct", revenue: 44600 }, { month: "Nov", revenue: 41200 }, { month: "Dec", revenue: 52800 },
];

const UNITS_SOLD: Record<number, number> = { 1: 142, 2: 118, 3: 96, 4: 77, 5: 64 };
export const TOP_SELLING = PRODUCTSS.map((p) => ({
    id: p.id,
    name: p.name,
    image: p.image,
    tone: p.tone,
    price: priceOf(p),
    sold: UNITS_SOLD[p.id] ?? 0,
}))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);