import { Link } from "react-router-dom";
import { useCart } from "../../lib/cart";

export default function BagLink({
    className = "",
    badgeClassName = "bg-neutral-900 text-white",
}: {
    className?: string;
    badgeClassName?: string;
}) {
    const { count } = useCart();
    return (
        <Link
            to="/cart"
            aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
            className={`relative inline-flex transition-opacity hover:opacity-60 ${className}`}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 8h14l-1 12H6L5 8Z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
            </svg>
            {count > 0 && (
                <span
                    key={count}
                    className={`absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none ${badgeClassName}`}
                >
                    {count}
                </span>
            )}
        </Link>
    );
}