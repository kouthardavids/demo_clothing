export type MeasureKey = "chest" | "waist" | "hips" | "height";
export type Range = [number, number];
export type SizeChartRow = {
    size: string;
    chest: Range | null;
    waist: Range | null;
    hips: Range | null;
    height: Range | null; // body height (cm) this size is cut for
};
export type Body = Partial<Record<MeasureKey, number>>;
export type Pref = "snug" | "true" | "relaxed";

export const MEASURES: { key: MeasureKey; label: string; how: string }[] = [
    { key: "chest", label: "Chest / bust", how: "Around the fullest part, with the tape level across your back." },
    { key: "waist", label: "Waist", how: "Around the narrowest part of your torso, usually just above the belly button." },
    { key: "hips", label: "Hips", how: "Around the fullest part of your hips and bottom, feet together." },
    { key: "height", label: "Height", how: "Stand straight against a wall, without shoes." },
];

// Same limits as a sanity check on typos (cm)
export const LIMITS: Record<MeasureKey, Range> = {
    chest: [40, 200],
    waist: [30, 200],
    hips: [40, 220],
    height: [120, 220],
};

const pair = (a: unknown, b: unknown): Range | null => (a == null || b == null ? null : [Number(a), Number(b)]);
const anchor = (r: SizeChartRow) => (r.waist ?? r.chest ?? r.hips ?? r.height ?? [0, 0])[0];

/** Turns database rows into a chart sorted from smallest to largest size. */
export const toChart = (rows: any[] | null | undefined): SizeChartRow[] =>
    (rows ?? [])
        .map((r) => ({
            size: String(r.size),
            chest: pair(r.chest_min, r.chest_max),
            waist: pair(r.waist_min, r.waist_max),
            hips: pair(r.hips_min, r.hips_max),
            height: pair(r.height_min, r.height_max),
        }))
        .sort((a, b) => anchor(a) - anchor(b));

/** Which measurements this product's chart actually uses. */
export const neededMeasures = (chart: SizeChartRow[]) => MEASURES.filter((m) => chart.some((r) => r[m.key]));

export type Result = {
    size: string;
    driver: MeasureKey;
    perMeasure: { key: MeasureKey; value: number; range: Range; suits: string; diff: number }[]; // diff: <0 below the range, >0 above it
    notes: string[];
    alt: { size: string; direction: "up" | "down" } | null;
    out: "small" | "large" | null;
};

export function recommend(chart: SizeChartRow[], body: Body, pref: Pref, offered: string[]): Result | null {
    const rows = chart.filter((r) => offered.includes(r.size)); // only sizes you actually sell
    // a measurement is only used when every size we sell has a range for it
    const keys = neededMeasures(rows)
        .map((m) => m.key)
        .filter((k) => body[k] !== undefined && rows.every((r) => r[k]));
    if (rows.length === 0 || keys.length === 0) return null;

    // the first size whose upper limit covers the measurement (gaps round up)
    const idxFor = (k: MeasureKey, v: number) => {
        const i = rows.findIndex((r) => r[k] && v <= r[k]![1]);
        return i === -1 ? rows.length - 1 : i;
    };
    const idx = {} as Record<MeasureKey, number>;
    keys.forEach((k) => (idx[k] = idxFor(k, body[k]!)));

    // the measurement that needs the biggest size decides, so nothing ends up too tight or too short
    let driver = keys[0];
    keys.forEach((k) => { if (idx[k] > idx[driver]) driver = k; });

    // outside the range we sell (width measurements)
    const first = rows[0], last = rows[rows.length - 1];
    const widthKeys = keys.filter((k) => k !== "height");
    let out: Result["out"] = null;
    widthKeys.forEach((k) => { if (last[k] && body[k]! > last[k]![1] + 2) out = "large"; });
    if (!out) widthKeys.forEach((k) => { if (first[k] && body[k]! < first[k]![0] - 4) out = "small"; });

    // fit preference
    let at = idx[driver];
    if (pref === "relaxed" && at < rows.length - 1) at += 1;
    if (pref === "snug" && at > 0 && keys.every((k) => !rows[at - 1][k] || body[k]! <= rows[at - 1][k]![1] + 2)) at -= 1;

    const chosen = rows[at];
    const perMeasure = keys.map((k) => {
        const r = chosen[k]!, v = body[k]!;
        return { key: k, value: v, range: r, suits: rows[idx[k]].size, diff: v < r[0] ? v - r[0] : v > r[1] ? v - r[1] : 0 };
    });

    const notes: string[] = [];

    // outside the heights we sell
    if (keys.includes("height")) {
        const h = body.height!;
        if (h > last.height![1] + 5) notes.push("You're taller than the heights our sizes are cut for, so the length may feel short.");
        else if (h < first.height![0] - 5) notes.push("You're shorter than the heights our sizes are cut for, so the length may feel long.");
    }

    const spread = Math.max(...keys.map((k) => idx[k])) - Math.min(...keys.map((k) => idx[k]));
    if (driver === "height" && spread >= 1) {
        notes.push("We chose this size for your height so the length isn't too short. Your other measurements fit a smaller size, so it may feel roomier.");
    } else if (spread >= 2) {
        notes.push("Your measurements fall in quite different sizes. We chose the size that fits your largest measurement so nothing is too tight, so other areas may feel roomier.");
    }

    // borderline: very close to the edge of the range on the measurement that decided the size
    let alt: Result["alt"] = null;
    const dm = perMeasure.find((p) => p.key === driver)!;
    if (dm.diff === 0) {
        if (dm.range[1] - dm.value <= 1 && at < rows.length - 1) alt = { size: rows[at + 1].size, direction: "up" };
        else if (dm.value - dm.range[0] <= 1 && at > 0) alt = { size: rows[at - 1].size, direction: "down" };
    }

    return { size: chosen.size, driver, perMeasure, notes, alt, out };
}