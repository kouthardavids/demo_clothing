import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { getProduct } from "../lib/products";
import type { Product } from "../lib/products";
import { generateLook, MAX_CLOTHES } from "../lib/tryon";
import { detectFace } from "../lib/detectFace";
import { useTryOn } from "./Tryon";
import type { Outfit } from "./Tryon";
import { useNavigate } from "react-router-dom";
import { useCart } from "../lib/cart";

import { UserIcon } from "../assets/icons/icons";
import { BagIcon } from "../assets/icons/icons";
import { HangerIcon } from "../assets/icons/icons";
import { CheckIcon } from "../assets/icons/icons";
import { PlusIcon } from "../assets/icons/icons";
import { MinusIcon } from "../assets/icons/icons";
import { CloseIcon } from "../assets/icons/icons";
import { ChevronDown } from "../assets/icons/icons";

import { CLOSET_CSS } from "../styles";

const NAV_LINKS = ["Home", "Shop", "Collection"] as const;

const priceOf = (p: Product) => Number(p.price.replace(/[^\d.]/g, "")) || 0;
const money = (n: number) => `R${n.toLocaleString("en-ZA").replace(/\u00a0/g, " ")}`;
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));
const d = (s: number) => ({ ["--d" as string]: `${s}s` });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

type PhotoKind = "body" | "face";
type PhotoRecord = { id: string; kind: PhotoKind; dataUrl: string; addedAt: number };
const PHOTOS_KEY = "demo-clothing:try-on:photos:v1";

const loadPhotos = (): PhotoRecord[] => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(PHOTOS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed
                .filter((p: any) => !!p && typeof p.id === "string" && typeof p.dataUrl === "string")
                .map((p: any): PhotoRecord => ({ ...p, kind: p.kind === "face" ? "face" : "body" }))
            : [];
    } catch {
        return [];
    }
};

const readAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });

const resizeImage = (file: File, maxDim = 1200, quality = 0.82): Promise<string> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("no canvas"));
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("load failed"));
        };
        img.src = url;
    });

type GeneratedLook = {
    id: string;
    resultDataUrl: string;
    itemIds: number[];
    createdAt: number;
};

const GENERATED_KEY = "demo-clothing:try-on:generated:v2";

const loadGenerated = (): GeneratedLook[] => {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(GENERATED_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter(
                (g): g is GeneratedLook =>
                    !!g &&
                    typeof g.id === "string" &&
                    typeof g.resultDataUrl === "string" &&
                    Array.isArray(g.itemIds) &&
                    typeof g.createdAt === "number"
            )
            : [];
    } catch {
        return [];
    }
};
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function Header({ count }: { count: number }) {
    return (
        <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-12">
                <Link to="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </Link>
                <nav className="hidden items-center gap-10 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => (
                        <a
                            key={link}
                            href={`/#${link.toLowerCase()}`}
                            className="text-sm font-medium uppercase tracking-wide text-neutral-800 transition-colors hover:text-neutral-500"
                        >
                            {link}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-5">
                    <Link to={'/account'} aria-label="Account" className="transition-opacity hover:opacity-60">
                        <UserIcon />
                    </Link>
                    <Link
                        to="/try-on"
                        aria-label={`Try on closet, ${count} ${count === 1 ? "piece" : "pieces"}`}
                        aria-current="page"
                        className="relative inline-flex"
                    >
                        <HangerIcon />
                        {count > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-medium leading-none text-white">
                                {count}
                            </span>
                        )}
                    </Link>
                    <button aria-label="Bag" className="transition-opacity hover:opacity-60">
                        <BagIcon />
                    </button>
                </div>
            </div>
        </header>
    );
}

function Accordion({
    title,
    open,
    onToggle,
    children,
}: {
    title: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <div className="border-t border-neutral-200">
            <button
                type="button"
                aria-expanded={open}
                onClick={onToggle}
                className="flex w-full items-center justify-between py-4 text-left text-sm font-medium transition-colors hover:text-neutral-500"
            >
                {title}
                <span className="cl-spin" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                    <ChevronDown />
                </span>
            </button>
            <div className="cl-acc" data-open={open}>
                <div>
                    <div className="pb-4">{children}</div>
                </div>
            </div>
        </div>
    );
}

function TrayTile({
    product,
    index,
    selected,
    onPress,
    onRemove,
}: {
    product: Product;
    index: number;
    selected: boolean;
    onPress: () => void;
    onRemove: () => void;
}) {
    return (
        <li className="cl-tray-item group relative w-24 shrink-0 sm:w-28" style={{ ["--i" as string]: index }}>
            <button
                type="button"
                aria-pressed={selected}
                aria-label={`${selected ? "Take" : "Put"} ${product.name} ${selected ? "out of" : "in"} the look`}
                onClick={onPress}
                className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-900"
            >
                <span
                    className={`relative block aspect-[4/5] overflow-hidden rounded-xl transition-shadow ${selected ? "ring-2 ring-neutral-900 ring-offset-2" : ""
                        }`}
                    style={{ backgroundColor: product.tone }}
                >
                    <img
                        src={product.image}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-contain object-center transition-transform duration-[1200ms] ease-out group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <span
                        aria-hidden="true"
                        className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition ${selected ? "bg-neutral-900 text-white" : "bg-white text-neutral-900 shadow-sm"
                            }`}
                    >
                        {selected ? <CheckIcon /> : <PlusIcon />}
                    </span>
                </span>
                <span className="mt-1.5 block truncate text-xs font-medium">{product.name}</span>
                <span className="block text-xs text-neutral-500">{product.price}</span>
            </button>
            <button
                type="button"
                aria-label={`Remove ${product.name} from closet`}
                onClick={onRemove}
                className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-900 opacity-0 shadow-sm transition-opacity hover:bg-neutral-100 focus-visible:opacity-100 group-hover:opacity-100"
            >
                <CloseIcon />
            </button>
        </li>
    );
}

function OutfitRow({
    outfit,
    worn,
    onWear,
    onDelete,
}: {
    outfit: Outfit;
    worn: boolean;
    onWear: () => void;
    onDelete: () => void;
}) {
    const items = outfit.items.map(getProduct).filter((p): p is Product => !!p);
    const total = items.reduce((sum, p) => sum + priceOf(p), 0);
    const shown = items.slice(0, 4);
    const extra = items.length - shown.length;

    return (
        <div className="group relative w-full">
            <button
                type="button"
                onClick={onWear}
                aria-pressed={worn}
                aria-label={`${worn ? "Currently wearing" : "Wear"} ${outfit.name}`}
                className={`block w-full overflow-hidden rounded-2xl bg-white text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${worn ? "ring-2 ring-neutral-900" : "ring-1 ring-neutral-200 hover:ring-neutral-300"
                    }`}
            >
                <span
                    className={`relative grid aspect-square gap-px bg-neutral-200 ${shown.length === 1 ? "grid-cols-1" : "grid-cols-2"
                        }`}
                >
                    {shown.map((p, i) => (
                        <span key={p.id} className="relative overflow-hidden" style={{ backgroundColor: p.tone }}>
                            <img
                                src={p.image}
                                alt=""
                                draggable={false}
                                className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                            />
                            {extra > 0 && i === shown.length - 1 && (
                                <span className="absolute inset-0 flex items-center justify-center bg-neutral-900/55 text-sm font-medium text-white">
                                    +{extra}
                                </span>
                            )}
                        </span>
                    ))}
                </span>

                <span className="block px-3.5 pb-3.5 pt-3">
                    <span className="flex items-center justify-between gap-2">
                        <span className="block min-w-0 truncate text-sm font-semibold tracking-tight text-neutral-900">
                            {outfit.name}
                        </span>
                        {worn && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                                <CheckIcon />
                                On
                            </span>
                        )}
                    </span>
                    <span className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                        <span>
                            {items.length} {items.length === 1 ? "piece" : "pieces"}
                        </span>
                        <span className="font-medium text-neutral-900">{money(total)}</span>
                    </span>
                </span>
            </button>

            <button
                type="button"
                aria-label={`Delete ${outfit.name}`}
                onClick={onDelete}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
                <CloseIcon />
            </button>
        </div>
    );
}

function GeneratedRow({
    look,
    active,
    onDelete,
    onView,
}: {
    look: GeneratedLook;
    active: boolean;
    onDelete: () => void;
    onView: () => void;
}) {
    const items = look.itemIds.map(getProduct).filter((p): p is Product => !!p);
    const stamp = new Date(look.createdAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const title = items.map((p) => p.name).join(", ") || `${look.itemIds.length} pieces`;

    return (
        <div className="group relative w-full">
            <button
                type="button"
                onClick={onView}
                aria-pressed={active}
                aria-label={`View look: ${title}`}
                className={`block w-full overflow-hidden rounded-2xl bg-white text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${active ? "ring-2 ring-neutral-900" : "ring-1 ring-neutral-200 hover:ring-neutral-300"
                    }`}
            >
                <span className="relative block aspect-square overflow-hidden bg-[#f4f3f2]">
                    <img
                        src={look.resultDataUrl}
                        alt=""
                        draggable={false}
                        className="h-full w-full object-contain object-center transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
                    />
                </span>

                <span className="block px-3.5 pb-3.5 pt-3">
                    <span className="flex items-center justify-between gap-2">
                        <span className="block min-w-0 truncate text-sm font-semibold tracking-tight text-neutral-900">
                            {title}
                        </span>
                        {active && (
                            <span
                                aria-label="Currently viewing"
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white"
                            >
                                <CheckIcon />
                            </span>
                        )}
                    </span>
                    <span className="mt-1 flex items-center justify-between text-xs text-neutral-500">
                        <span>
                            {look.itemIds.length} {look.itemIds.length === 1 ? "piece" : "pieces"}
                        </span>
                        <span>{stamp}</span>
                    </span>
                </span>
            </button>

            <button
                type="button"
                aria-label="Delete generated look"
                onClick={onDelete}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-neutral-900 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
                <CloseIcon />
            </button>
        </div>
    );
}

function PhotoThumb({
    record,
    active,
    onSelect,
    onRemove,
}: {
    record: PhotoRecord;
    active: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    return (
        <li className="relative shrink-0">
            <button
                type="button"
                onClick={onSelect}
                aria-pressed={active}
                aria-label={active ? "Current photo" : "Use this photo"}
                className={`block h-20 w-16 overflow-hidden rounded-lg border-2 transition ${active ? "border-neutral-900" : "border-transparent hover:border-neutral-300"
                    }`}
            >
                <img src={record.dataUrl} alt="" draggable={false} className="h-full w-full object-cover object-top" />
            </button>
            <button
                type="button"
                onClick={onRemove}
                aria-label="Remove photo"
                className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-100"
            >
                <CloseIcon />
            </button>
        </li>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Closet() {
    const {
        closet,
        selected,
        outfits,
        removeFromCloset,
        toggleSelected,
        saveOutfit,
        wearOutfit,
        deleteOutfit,
    } = useTryOn();

    const navigate = useNavigate();
    const { addItem } = useCart();
    const [photos, setPhotos] = useState<PhotoRecord[]>(loadPhotos);
    const [bodyId, setBodyId] = useState<string | null>(() => loadPhotos().find((p) => p.kind === "body")?.id ?? null);
    const [generated, setGenerated] = useState<GeneratedLook[]>(loadGenerated);
    const [generating, setGenerating] = useState(false);
    const [viewing, setViewing] = useState<string | null>(null);
    const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

    const [trayOpen, setTrayOpen] = useState(false);
    const [section, setSection] = useState<"outfits" | "generated" | null>(null);

    // Zoom + pan
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);
    const drag = useRef({ active: false, sx: 0, sy: 0, px: 0, py: 0 });

    const fileRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);
    const uploadKind = useRef<PhotoKind>("body");

    const bodies = photos.filter((p) => p.kind === "body");
    const body = bodies.find((p) => p.id === bodyId) ?? bodies[0] ?? null;
    const stageImage = viewing ?? body?.dataUrl ?? null;

    const say = (text: string) => setToast({ id: Date.now(), text });

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 2200);
        return () => window.clearTimeout(t);
    }, [toast]);

    useEffect(() => {
        try {
            window.localStorage.setItem(PHOTOS_KEY, JSON.stringify(photos));
        } catch {
            // Storage full: keep in memory for this visit.
        }
    }, [photos]);

    useEffect(() => {
        try {
            window.localStorage.setItem(GENERATED_KEY, JSON.stringify(generated));
        } catch {
            // Storage full: keep in memory for this visit.
        }
    }, [generated]);

    // Reset zoom whenever the picture on the stage changes
    useEffect(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [stageImage]);

    // Escape closes the tray
    useEffect(() => {
        if (!trayOpen) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTrayOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [trayOpen]);

    /* ---------- zoom / pan ---------- */

    const clampPan = (x: number, y: number, z: number) => {
        const el = stageRef.current;
        if (!el) return { x, y };
        const mx = ((z - 1) * el.clientWidth) / 2;
        const my = ((z - 1) * el.clientHeight) / 2;
        return { x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
    };

    const setZoomLevel = (next: number) => {
        const z = clamp(next, 1, 3);
        setZoom(z);
        setPan((p) => (z === 1 ? { x: 0, y: 0 } : clampPan(p.x, p.y, z)));
    };

    const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
        if (zoom <= 1) return;
        drag.current = { active: true, sx: e.clientX, sy: e.clientY, px: pan.x, py: pan.y };
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
        const g = drag.current;
        if (!g.active) return;
        setPan(clampPan(g.px + (e.clientX - g.sx), g.py + (e.clientY - g.sy), zoom));
    };
    const endDrag = () => {
        drag.current.active = false;
        setDragging(false);
    };

    const pickPhoto = (source: "camera" | "upload") => {
        uploadKind.current = "body";
        if (source === "camera") {
            cameraRef.current?.click();
        } else {
            fileRef.current?.click();
        }
    };

    const onDropPhoto = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const file = e.dataTransfer.files[0];

        if (!file || !file.type.startsWith("image/")) {
            say("Please drop an image file");
            return;
        }

        uploadKind.current = "body";
        addPhoto(file);
    };

    const addPhoto = async (file: File) => {
        if (!file.type.startsWith("image/")) return;

        try {
            let dataUrl: string;

            try {
                dataUrl = await resizeImage(file, 1200);
            } catch {
                dataUrl = await readAsDataUrl(file);
            }

            const rec: PhotoRecord = {
                id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                kind: "body",
                dataUrl,
                addedAt: Date.now(),
            };

            setPhotos((prev) => [...prev, rec]);
            setBodyId(rec.id);
            setViewing(null);
            say("Body photo added");
        } catch {
            say("Could not read that image");
        }
    };

    const onFile = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) {
            addPhoto(file);
        }
    };

    const removePhoto = (p: PhotoRecord) => {
        setPhotos((prev) => prev.filter((x) => x.id !== p.id));
        if (bodyId === p.id) setBodyId(null);
    };

    /* ---------- closet / look ---------- */

    const closetItems = closet.map(getProduct).filter((p): p is Product => !!p);
    const lookItems = selected.map(getProduct).filter((p): p is Product => !!p);
    const total = lookItems.reduce((sum, p) => sum + priceOf(p), 0);

    const onPressTile = (id: number) => {
        if (!selected.includes(id) && selected.length >= MAX_CLOTHES) {
            say(`Up to ${MAX_CLOTHES} pieces per look`);
            return;
        }
        toggleSelected(id);
    };

    const onSave = () => {
        const result = saveOutfit();
        if (!result) return;
        say(result.created ? `Saved as ${result.outfit.name}` : `Already saved as ${result.outfit.name}`);
    };

    const onDressMe = async () => {
        if (generating) return;
        if (selected.length === 0) return say("Pick pieces from your closet first");
        if (!body) return say("Add a full body photo first");
        if (selected.length > MAX_CLOTHES) return say(`Pick at most ${MAX_CLOTHES} pieces at a time`);

        const itemIds = [...selected];
        setTrayOpen(false);
        setGenerating(true);
        try {
            const faceRect = await detectFace(body.dataUrl);
            const resultDataUrl = await generateLook({
                bodyDataUrl: body.dataUrl,
                itemIds,
                faceRect,
            });
            const look: GeneratedLook = {
                id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                resultDataUrl,
                itemIds,
                createdAt: Date.now(),
            };
            setGenerated((prev) => [look, ...prev].slice(0, 6));
            setViewing(resultDataUrl);
            say("Look generated");
        } catch (err) {
            say(err instanceof Error ? err.message : "Could not generate your look");
        } finally {
            setGenerating(false);
        }
    };

    const onBuy = () => {
        if (lookItems.length === 0) return;
        lookItems.forEach((p) =>
            addItem({ id: p.id, size: p.sizes.includes("M") ? "M" : p.sizes[0], color: p.colors[0], qty: 1 })
        );
        navigate("/cart");
    };

    const toggleSection = (s: "outfits" | "generated") => setSection((cur) => (cur === s ? null : s));

    return (
        <div className="min-h-screen bg-white font-sans text-neutral-900">
            <style>{CLOSET_CSS}</style>
            <Header count={closet.length} />

            <main className="mx-auto w-full max-w-7xl px-6 py-8 md:px-12 md:py-10">
                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
                    <section aria-label="Try on stage" className="lg:sticky lg:top-24 lg:self-start">
                        <div
                            ref={stageRef}
                            className="cl-wipe relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[#f4f3f2] lg:aspect-auto lg:h-[calc(100dvh-9rem)] lg:min-h-[32rem]"
                        >
                            <div
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                className={`absolute inset-0 touch-none ${zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
                                    }`}
                            >
                                {stageImage ? (
                                    <div key={stageImage.slice(-24)} className="cl-fade absolute inset-0">
                                        <img
                                            src={stageImage}
                                            alt={viewing ? "Generated look" : "Your photo"}
                                            draggable={false}
                                            className="h-full w-full select-none object-contain object-center will-change-transform"
                                            style={{
                                                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                                                transition: dragging ? "none" : `transform 0.5s ${EASE}`,
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                                        <p className="max-w-[16rem] text-sm leading-snug text-neutral-700">
                                            Add a full body portrait to get started
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="absolute left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
                                <button
                                    type="button"
                                    aria-label="Zoom in"
                                    disabled={zoom >= 3}
                                    onClick={() => setZoomLevel(zoom + 0.5)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40"
                                >
                                    <PlusIcon size={16} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="Zoom out"
                                    disabled={zoom <= 1}
                                    onClick={() => setZoomLevel(zoom - 0.5)}
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur transition hover:bg-white disabled:opacity-40"
                                >
                                    <MinusIcon />
                                </button>
                            </div>

                            {viewing && !generating && (
                                <button
                                    type="button"
                                    onClick={() => setViewing(null)}
                                    className="absolute right-4 top-4 z-20 rounded-full bg-white/90 px-3.5 py-2 text-xs font-medium shadow-sm backdrop-blur transition-colors hover:bg-white"
                                >
                                    Back to my photo
                                </button>
                            )}

                            {generating && (
                                <div
                                    className="cl-fade absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-white/70 backdrop-blur-sm"
                                    role="status"
                                >
                                    <span className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                                    <p className="text-sm font-medium">Dressing you…</p>
                                    <p className="text-xs text-neutral-500">This can take up to a minute</p>
                                </div>
                            )}

                            {toast && (
                                <p
                                    key={toast.id}
                                    role="status"
                                    className="cl-toast absolute left-1/2 top-4 z-40 max-w-[85%] rounded-full bg-neutral-900 px-4 py-2 text-center text-xs font-medium text-white"
                                >
                                    {toast.text}
                                </p>
                            )}

                            <div
                                id="closet-tray"
                                data-open={trayOpen}
                                aria-hidden={!trayOpen}
                                className="cl-tray absolute bottom-4 left-[4.75rem] right-4 z-20 rounded-2xl bg-white/95 p-4 shadow-lg backdrop-blur"
                            >
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-sm font-semibold">
                                            In your closet ({closet.length})
                                        </h2>

                                        <button
                                            type="button"
                                            onClick={() => navigate("/shop")}
                                            aria-label="Browse catalog and add items"
                                            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f4f3f2] text-neutral-700 transition hover:bg-neutral-200 active:scale-95"
                                        >
                                            <PlusIcon />
                                        </button>
                                    </div>
                                </div>
                                {closetItems.length > 0 ? (
                                    <ul className="cl-scroll flex gap-3 overflow-x-auto pb-1 pl-1 pr-1 pt-1">
                                        {closetItems.map((p, i) => (
                                            <TrayTile
                                                key={p.id}
                                                product={p}
                                                index={i}
                                                selected={selected.includes(p.id)}
                                                onPress={() => onPressTile(p.id)}
                                                onRemove={() => removeFromCloset(p.id)}
                                            />
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="rounded-xl bg-[#f4f3f2] p-4 text-sm leading-relaxed text-neutral-600">
                                        Nothing here yet. Press Try On on any product to add it to your closet.
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                aria-label={trayOpen ? "Close closet" : "Open closet"}
                                aria-expanded={trayOpen}
                                aria-controls="closet-tray"
                                onClick={() => setTrayOpen((o) => !o)}
                                className="absolute bottom-4 left-4 z-30 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
                            >
                                <span className="cl-spin flex" style={{ transform: trayOpen ? "rotate(90deg)" : "none" }}>
                                    <CloseIcon size={18} />
                                </span>
                                {!trayOpen && closet.length > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-medium leading-none text-white">
                                        {closet.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </section>

                    <section aria-label="Look details" className="space-y-5">
                        {/* Photos */}
                        <div className="cl-reveal rounded-2xl border border-neutral-200 p-5" style={d(0.15)}>
                            <h2 className="text-base font-semibold tracking-tight">Your photo</h2>

                            <div className="mt-4">
                                <p className="mb-2 text-xs text-neutral-500">
                                    Full body photo ({bodies.length})
                                </p>
                                <div
                                    className="rounded-xl border-2 border-dashed border-neutral-200 p-3 transition-colors hover:border-neutral-400"
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={onDropPhoto}
                                >
                                    <div className="mb-3 flex flex-wrap justify-center gap-2 mt-3">
                                        <button
                                            type="button"
                                            onClick={() => pickPhoto("camera")}
                                            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-neutral-700"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 4h-4l-2 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4z" />
                                                <circle cx="12" cy="14" r="3" />
                                            </svg>
                                            Take photo
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => pickPhoto("upload")}
                                            className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M12 16V4m-5 5 5-5 5 5" />
                                                <path d="M20 16v4H4v-4" />
                                            </svg>
                                            Upload image
                                        </button>
                                    </div>

                                    <p className="mb-3 text-center text-xs text-neutral-400">
                                        Or drag and drop an image here
                                    </p>

                                    <ul className="cl-scroll flex items-start gap-3 overflow-x-auto pb-1 pt-1.5">
                                        {bodies.map((p) => (
                                            <PhotoThumb
                                                key={p.id}
                                                record={p}
                                                active={p.id === body?.id}
                                                onSelect={() => {
                                                    setBodyId(p.id);
                                                    setViewing(null);
                                                }}
                                                onRemove={() => removePhoto(p)}
                                            />
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                onChange={onFile}
                                className="sr-only"
                                tabIndex={-1}
                            />
                            <input
                                ref={cameraRef}
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={onFile}
                                className="sr-only"
                                tabIndex={-1}
                            />
                        </div>

                        <div className="cl-reveal rounded-2xl border border-neutral-200 p-5" style={d(0.22)}>
                            <div className="mt-5">
                                <Accordion
                                    title={`Saved outfits (${outfits.length})`}
                                    open={section === "outfits"}
                                    onToggle={() => toggleSection("outfits")}
                                >
                                    {outfits.length > 0 ? (
                                        <ul className="cl-scroll flex gap-3 overflow-x-auto px-1 pb-4 pt-2">
                                            {outfits.map((o) => (
                                                <li key={o.id} className="w-44 shrink-0">
                                                    <OutfitRow
                                                        outfit={o}
                                                        worn={sameSet(o.items, selected)}
                                                        onWear={() => wearOutfit(o.id)}
                                                        onDelete={() => deleteOutfit(o.id)}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-neutral-500">
                                            No saved outfits yet. Pick a few pieces, then press Save outfit.
                                        </p>
                                    )}
                                </Accordion>

                                <Accordion
                                    title={`Generated looks (${generated.length})`}
                                    open={section === "generated"}
                                    onToggle={() => toggleSection("generated")}
                                >
                                    {generated.length > 0 ? (
                                        <ul className="cl-scroll flex gap-3 overflow-x-auto px-1 pb-4 pt-2">
                                            {generated.map((g) => (
                                                <li key={g.id} className="w-44 shrink-0">
                                                    <GeneratedRow
                                                        look={g}
                                                        active={viewing === g.resultDataUrl}
                                                        onDelete={() => setGenerated((prev) => prev.filter((x) => x.id !== g.id))}
                                                        onView={() => setViewing(g.resultDataUrl)}
                                                    />
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-sm text-neutral-500">
                                            No generated looks yet. Add your photo, select pieces, then press Dress me.
                                        </p>
                                    )}
                                </Accordion>
                                <div className="border-t border-neutral-200" />
                            </div>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={lookItems.length === 0}
                                    onClick={onSave}
                                    className="inline-flex h-12 shrink-0 items-center justify-center rounded-md border border-neutral-900 px-6 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900"
                                >
                                    Save outfit
                                </button>

                                <button
                                    type="button"
                                    disabled={selected.length === 0 || generating}
                                    onClick={onDressMe}
                                    className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-md border border-neutral-900 px-5 text-sm font-medium transition-colors hover:bg-neutral-900 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-neutral-900"
                                >
                                    <HangerIcon />
                                    <span className="truncate">
                                        {generating
                                            ? "Generating…"
                                            : `Dress me${selected.length > 0 ? ` (${selected.length})` : ""}`}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    disabled={lookItems.length === 0}
                                    onClick={onBuy}
                                    className="flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <BagIcon size={16} />
                                    <span className="truncate">
                                        Buy selected items{lookItems.length > 0 && ` · ${money(total)}`}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}