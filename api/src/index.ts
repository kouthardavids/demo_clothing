import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import sharp from "sharp";
import rateLimit from "express-rate-limit";

import { productsRouter } from "./endpoints/products.js";
import { ordersRouter } from "./endpoints/orders.js";
import { reportsRouter } from "./endpoints/reports.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.set("trust proxy", 1);

const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "You've reached the demo limit for AI features. Try again in a few minutes." },
});

const API_KEY = process.env.POLLINATIONS_API_KEY;
const MODEL = "klein";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 6 },
});

app.use(cors());
app.use(express.json());

app.use("/api/products", productsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/tryon", aiLimiter);

const MAX_INPUT = 640;
const OUT = 1024;
const MAX_MODEL_IMAGES = 4;

const shrink = (buf: Buffer, max = MAX_INPUT) =>
    sharp(buf)
        .rotate()
        .resize(max, max, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90 })
        .toBuffer();

const snap16 = (n: number) => Math.max(256, Math.round(n / 16) * 16);

type Rect = { x: number; y: number; w: number; h: number };

async function cropFace(buf: Buffer, r: Rect) {
    const rotated = await sharp(buf).rotate().toBuffer();
    const m = await sharp(rotated).metadata();
    const W = m.width ?? 1;
    const H = m.height ?? 1;
    const pad = 0.5;
    const x0 = Math.max(0, r.x - r.w * pad);
    const y0 = Math.max(0, r.y - r.h * pad);
    const x1 = Math.min(1, r.x + r.w * (1 + pad));
    const y1 = Math.min(1, r.y + r.h * (1 + pad));
    return sharp(rotated)
        .extract({
            left: Math.round(x0 * W),
            top: Math.round(y0 * H),
            width: Math.max(16, Math.round((x1 - x0) * W)),
            height: Math.max(16, Math.round((y1 - y0) * H)),
        })
        .resize(768, 768, { fit: "inside" })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 92 })
        .toBuffer();
}

const ORDINAL = ["first", "second", "third", "fourth", "fifth"];

async function sideBySide(a: Buffer, b: Buffer) {
    const [pa, pb] = await Promise.all([shrink(a), shrink(b)]);
    const [ma, mb] = await Promise.all([sharp(pa).metadata(), sharp(pb).metadata()]);
    const wa = ma.width ?? MAX_INPUT;
    const H = Math.max(ma.height ?? MAX_INPUT, mb.height ?? MAX_INPUT);
    const W = wa + (mb.width ?? MAX_INPUT);

    return sharp({
        create: { width: W, height: H, channels: 3, background: "#ffffff" },
    })
        .composite([
            { input: pa, left: 0, top: 0 },
            { input: pb, left: wa, top: 0 },
        ])
        .jpeg({ quality: 90 })
        .toBuffer();
}

app.post(
    "/api/tryon",
    upload.fields([
        { name: "person", maxCount: 1 }, // full body photo
        { name: "clothes", maxCount: 4 },
    ]),
    async (req, res) => {
        try {
            if (!API_KEY) {
                return res.status(500).json({ error: "Server is missing POLLINATIONS_API_KEY." });
            }

            const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
            const person = files.person?.[0];
            const clothes = files.clothes ?? [];

            if (!person || clothes.length === 0) {
                return res
                    .status(400)
                    .json({ error: "Need a person photo and at least one clothing item." });
            }

            let labels: string[] = [];
            try {
                labels = JSON.parse(req.body?.labels ?? "[]");
            } catch { }

            let faceRect: Rect | null = null;
            try {
                const f = JSON.parse(req.body?.faceRect ?? "null");
                if (f && [f.x, f.y, f.w, f.h].every((n: unknown) => typeof n === "number")) faceRect = f;
            } catch { }

            // Face reference: crop from the body photo if we have a box, else the uploaded close-up
            let faceRef: Buffer | null = null;
            if (faceRect) faceRef = await cropFace(person.buffer, faceRect);

            type Item = { buf: Buffer; label: string };
            let items: Item[] = clothes.map((f, i) => ({
                buf: f.buffer,
                label: labels[i] ?? "clothing item",
            }));

            const reserved = faceRef ? 2 : 1;
            while (items.length + reserved > MAX_MODEL_IMAGES) {
                const [a, b, ...rest] = items;
                items = [
                    {
                        buf: await sideBySide(a.buf, b.buf),
                        label: `${a.label} (left half) and ${b.label} (right half), shown side by side`,
                    },
                    ...rest,
                ];
            }

            const imageList = items
                .map((it, i) => `The ${ORDINAL[i + 1]} image is the ${it.label}.`)
                .join("\n");

            const garmentList = items.map((it) => it.label).join(", ");

            const hijabIdx = items.findIndex((it) => it.label === "hijab");
            const hijabRule =
                hijabIdx === -1
                    ? ""
                    : `
HIJAB: The ${ORDINAL[hijabIdx + 1]} image is a hijab (headscarf). Wrap it over the person's head so it fully
covers their hair, ears and neck, with the face fully visible. The hijab replaces the visible hair.
`;

            const faceOrdinal = ORDINAL[items.length + 1];
            const faceRule = faceRef
                ? `
FACE REFERENCE: The ${faceOrdinal} image is a close-up of this person's real face. It is NOT clothing.
The face in the result must match it exactly: same eyes, eyebrows, nose, lips, cheeks, jawline,
face shape, skin tone and skin texture.
`
                : "";

            const prompt = `
Edit the first image by changing only the person's clothing.

The first image is the person and is the definitive reference for identity and pose. The other images are references:
${imageList}
${faceRule}
CLOTHING (follow exactly):
The person must wear exactly these garments and nothing else: ${garmentList}.
Keep every garment's type exactly as shown in its reference image. A skirt must stay a skirt, pants must stay pants,
a dress must stay a dress. Never swap one garment type for another and never add extra garments such as pants
under a skirt. Reproduce each item's original color, pattern, fabric, texture, length and shape as accurately
as possible, and fit the garments naturally.
${hijabRule}
IDENTITY PRESERVATION IS THE HIGHEST PRIORITY:
Keep the face exactly as it is in the first image. Do not generate a new face, and do not alter eye shape,
eyebrows, nose, lips, cheeks, jawline, skin tone, natural skin texture or facial proportions.
Do not redraw, beautify, smooth, retouch or reinterpret the face.

BODY AND HAIR (also locked):
Keep the exact same body build, height, proportions, shoulder width, arm thickness and leg shape as the first image.
Keep the same hair colour, length, parting and hairstyle.
Where the new outfit shows more skin (arms or legs), draw them to match the person's visible skin tone and body proportions.
Do not slim, lengthen, widen or reshape the body.

Preserve the original head position, expression, gaze, body shape, pose, background, lighting and camera framing.
Do not alter any part of the photograph except what is necessary to change the outfit.
`;

            const inputs: Buffer[] = await Promise.all([
                shrink(person.buffer, 1024),
                ...items.map((it) => shrink(it.buf)),
            ]);
            if (faceRef) inputs.push(faceRef);

            const meta = await sharp(inputs[0]).metadata();
            const mw = meta.width ?? MAX_INPUT;
            const mh = meta.height ?? MAX_INPUT;
            const scale = OUT / Math.max(mw, mh);
            const size = `${snap16(mw * scale)}x${snap16(mh * scale)}`;

            const refs = inputs.map((buf) => `data:image/jpeg;base64,${buf.toString("base64")}`);

            const pr = await fetch("https://gen.pollinations.ai/v1/images/generations", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: MODEL,
                    prompt,
                    image: refs,
                    size,
                    response_format: "b64_json",
                }),
            });
            const data: any = await pr.json().catch(() => ({}));

            const first = data?.data?.[0];
            let image: string | undefined = first?.b64_json;

            if (!image && first?.url) {
                const dl = await fetch(first.url);
                if (dl.ok) image = Buffer.from(await dl.arrayBuffer()).toString("base64");
            }

            if (!pr.ok || !image) {
                console.error(JSON.stringify(data));
                return res.status(502).json({ error: data?.error?.message ?? "No image returned" });
            }

            const mimeType = image.startsWith("/9j/") ? "image/jpeg" : "image/png";
            res.set("Content-Type", mimeType);
            res.set("Cache-Control", "no-store");
            return res.send(Buffer.from(image, "base64"));
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Try-on generation failed" });
        }
    }
);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: `Upload problem: ${err.message}` });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
});