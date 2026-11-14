import { useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

const CSS = `
@keyframes ad-up { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
.ad-reveal { opacity: 0; animation: ad-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s) }
.ad-sub { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s cubic-bezier(0.22, 1, 0.36, 1) }
.ad-sub[data-open="true"] { grid-template-rows: 1fr }
.ad-sub > div { overflow: hidden; min-height: 0 }
.ad-chev { transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1) }
@media (prefers-reduced-motion: reduce) {
  .ad-reveal { animation: none; opacity: 1; transform: none }
  .ad-sub, .ad-chev { transition: none }
}
`;

const Svg = ({ children }: { children: ReactNode }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
    </svg>
);

const ChevronDown = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
    </svg>
);

const NAV = [
    {
        to: "/admin",
        label: "Dashboard",
        end: true,
        icon: (
            <Svg>
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </Svg>
        ),
    },
    {
        to: "/admin/products",
        label: "Products",
        end: false,
        icon: (
            <Svg>
                <path d="M20 12 12 20 4 12V4h8l8 8Z" />
                <circle cx="8.5" cy="8.5" r="1.2" />
            </Svg>
        ),
    },
    {
        label: "Inventory",
        match: "/admin/inventory",
        icon: (
            <Svg>
                <path d="M21 8 12 3 3 8l9 5 9-5Z" />
                <path d="M3 8v8l9 5 9-5V8M12 13v8" />
            </Svg>
        ),
        children: [
            { to: "/admin/inventory/stocks", label: "Stocks" },
        ],
    },
    {
        to: "/admin/orders",
        label: "Orders",
        end: false,
        icon: (
            <Svg>
                <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
                <path d="M9 8h6M9 12h6" />
            </Svg>
        ),
    },
    {
        to: "/admin/reports",
        label: "Reports",
        end: false,
        icon: (
            <Svg>
                <path d="M4 20V10M10 20V4M16 20v-7M2 20h20" />
            </Svg>
        ),
    },
];

export default function AdminLayout() {
    const location = useLocation();
    const inInventory = location.pathname.startsWith("/admin/inventory");
    const [inventoryOpen, setInventoryOpen] = useState(inInventory);

    return (
        <div className="min-h-screen bg-[#f4f3f2] font-sans text-neutral-900 lg:flex">
            <style>{CSS}</style>

            <aside className="border-b border-neutral-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
                <div className="flex items-center justify-between gap-4 px-6 py-5 lg:block">
                    <Link to="/admin" className="block text-xl font-bold tracking-tight">
                        Demo Clothing
                        <span className="ml-2 rounded-full bg-neutral-900 px-2 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wider text-white">Admin</span>
                    </Link>
                </div>

                <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-4 pb-4 lg:mt-2 lg:flex-1 lg:flex-col lg:px-4">
                    {NAV.map((n) => {
                        if ("to" in n) {
                            return (
                                <NavLink
                                    key={n.to}
                                    to={n.to}
                                    end={n.end}
                                    className={({ isActive }) =>
                                        `flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-[#f4f3f2] hover:text-neutral-900"
                                        }`
                                    }
                                >
                                    {n.icon}
                                    {n.label}
                                </NavLink>
                            );
                        }

                        // Collapsible group
                        const groupActive = location.pathname.startsWith(n.match);
                        const showOpen = inventoryOpen || groupActive;
                        return (
                            <div key={n.label} className="shrink-0 lg:shrink">
                                <button
                                    type="button"
                                    aria-expanded={showOpen}
                                    aria-controls="admin-inventory-sub"
                                    onClick={() => setInventoryOpen((o) => !o)}
                                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${groupActive
                                        ? "text-neutral-900"
                                        : "text-neutral-600 hover:bg-[#f4f3f2] hover:text-neutral-900"
                                        }`}
                                >
                                    {n.icon}
                                    <span className="flex-1 text-left">{n.label}</span>
                                    <span className="ad-chev text-neutral-400" style={{ transform: showOpen ? "rotate(180deg)" : "none" }}>
                                        <ChevronDown />
                                    </span>
                                </button>

                                <div id="admin-inventory-sub" className="ad-sub" data-open={showOpen}>
                                    <div>
                                        <div className="mb-1 ml-4 space-y-1 border-l border-neutral-200 pl-4">
                                            {n.children.map((child) => (
                                                <NavLink
                                                    key={child.to}
                                                    to={child.to}
                                                    className={({ isActive }) =>
                                                        `block rounded-lg px-3 py-2 text-sm transition-colors ${isActive
                                                            ? "bg-neutral-900 text-white"
                                                            : "text-neutral-600 hover:bg-[#f4f3f2] hover:text-neutral-900"
                                                        }`
                                                    }
                                                >
                                                    {child.label}
                                                </NavLink>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    <Link
                        to="/"
                        className="flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-[#f4f3f2] hover:text-neutral-900 lg:mt-auto"
                    >
                        <Svg>
                            <path d="M15 5l-7 7 7 7" />
                        </Svg>
                        Back to store
                    </Link>
                </nav>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="flex items-center justify-end gap-4 px-6 py-5 md:px-10">
                    <Link to="/login" aria-label="Account" className="flex h-10 w-20 items-center justify-center rounded-full bg-neutral-900 text-sm font-medium text-white">
                        Logout
                    </Link>
                </header>
                <main className="px-6 pb-12 md:px-10">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}