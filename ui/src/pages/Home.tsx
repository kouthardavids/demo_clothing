import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BagLink from "./links/Baglink";
import ClosetLink from "./links/Closetlink";

import { ANIMATION_CSS } from "../styles";
import { UserIcon } from "../assets/icons/icons";

const NAV_LINKS = ["Home", "Shop", "Collection", "Contact"] as const;
const HEADLINE = ["Try it on", "before you", "buy it"] as const;

const ROUTES: Record<string, string> = { Home: "/", Shop: "/shop", Contact: "/" };
type HeroVideo = { src: string; poster?: string };

const VIDEOS: HeroVideo[] = [
    { src: "/videos/7872844-uhd_4096_2160_25fps (1).mp4" },
];

export default function Homepage() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [ready, setReady] = useState<boolean[]>(() => VIDEOS.map(() => false));
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    const [reduced] = useState(
        () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    useEffect(() => {
        if (reduced) return;
        const timers: number[] = [];
        videoRefs.current.forEach((video, i) => {
            if (!video) return;
            if (i === active) {
                video.currentTime = 0;
                video.play().catch(() => { });
            } else {
                timers.push(window.setTimeout(() => video.pause(), 1600));
            }
        });
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [active, reduced]);

    return (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0e0e10] font-sans text-white">
            <style>{ANIMATION_CSS}</style>

            {/* Background video */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                {VIDEOS.map((video, i) => (
                    <video
                        key={video.src}
                        ref={(el) => {
                            videoRefs.current[i] = el;
                        }}
                        src={video.src}
                        poster={video.poster}
                        muted
                        playsInline
                        loop={VIDEOS.length === 1}
                        autoPlay={i === 0 && !reduced}
                        preload={i === 0 ? "auto" : "metadata"}
                        onLoadedData={() => setReady((r) => r.map((v, j) => (j === i ? true : v)))}
                        onEnded={() => setActive((a) => (a + 1) % VIDEOS.length)}
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${active === i && (ready[i] || video.poster) ? "opacity-100" : "opacity-0"
                            }`}
                    />
                ))}

                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-black/10" />
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent" />
            </div>

            <header className="elevn-fade relative z-20 flex w-full shrink-0 items-center justify-between bg-transparent px-6 py-6 md:px-12">
                <a href="/" className="text-2xl font-bold tracking-tight">
                    Demo Clothing
                </a>

                <nav className="hidden items-center gap-12 md:flex" aria-label="Main">
                    {NAV_LINKS.map((link) => {
                        const cls =
                            "text-[15px] font-medium uppercase tracking-wide text-white transition-colors hover:text-white/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";
                        return ROUTES[link] ? (
                            <Link key={link} to={ROUTES[link]} className={cls}>
                                {link}
                            </Link>
                        ) : (
                            <a key={link} href={`#${link.toLowerCase()}`} className={cls}>
                                {link}
                            </a>
                        );
                    })}
                </nav>

                <div className="flex items-center gap-5">
                    <Link to={'/account'} aria-label="Account" className="transition-opacity hover:opacity-60">
                        <UserIcon />
                    </Link>
                    <ClosetLink />
                    <BagLink />
                    <button
                        aria-label="Toggle menu"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen((o) => !o)}
                        className="ml-1 flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
                    >
                        <span className={`h-px w-5 bg-white transition-transform ${menuOpen ? "translate-y-[3.5px] rotate-45" : ""}`} />
                        <span className={`h-px w-5 bg-white transition-transform ${menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""}`} />
                    </button>
                </div>
            </header>

            {/* Mobile responsive */}
            {menuOpen && (
                <nav
                    className="relative z-20 flex flex-col gap-4 bg-transparent px-6 pb-6 md:hidden"
                    aria-label="Mobile"
                >
                    {NAV_LINKS.map((link) => {
                        const cls = "text-sm font-medium uppercase tracking-wide text-white";
                        return ROUTES[link] ? (
                            <Link key={link} to={ROUTES[link]} onClick={() => setMenuOpen(false)} className={cls}>
                                {link}
                            </Link>
                        ) : (
                            <a key={link} href={`#${link.toLowerCase()}`} onClick={() => setMenuOpen(false)} className={cls}>
                                {link}
                            </a>
                        );
                    })}
                </nav>
            )}

            {/* Hero */}
            <main className="relative z-10 flex w-full flex-1 items-center px-6 md:pl-24 md:pr-12 lg:pl-32">
                <div>
                    <h1 className="text-6xl font-extrabold uppercase leading-[1.2] tracking-tight sm:text-7xl lg:text-8xl">
                        {HEADLINE.map((line, i) => (
                            <span key={line} className="block overflow-hidden">
                                <span className="elevn-line" style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                                    {line}
                                </span>
                            </span>
                        ))}
                    </h1>

                    <p
                        className="elevn-up mt-8 max-w-xs text-xl leading-relaxed text-white/80"
                        style={{ animationDelay: "0.8s" }}
                    >
                        Try any piece on virtually and see the whole outfit before you buy.
                    </p>

                    <div
                        className="elevn-up mt-10 flex flex-wrap items-center gap-4"
                        style={{ animationDelay: "0.95s" }}
                    >
                        <Link
                            to="/shop"
                            className="rounded-sm border border-white/70 px-6 py-3 text-[12px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                            Shop now
                        </Link>
                        <a
                            href="#collection"
                            className="rounded-sm border border-white/70 px-6 py-3 text-[12px] font-medium uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                        >
                            Explore collection
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}