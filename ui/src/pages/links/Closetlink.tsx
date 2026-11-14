import { Link } from "react-router-dom";
import { useTryOn } from "../Tryon";

const CSS = `
@keyframes cl-badge-pop { 0% { transform: scale(0.4) } 60% { transform: scale(1.25) } 100% { transform: scale(1) } }
.cl-badge { animation: cl-badge-pop 0.35s ease-out }
@media (prefers-reduced-motion: reduce) { .cl-badge { animation: none } }
`;

export default function ClosetLink({
    className = "",
    badgeClassName = "bg-neutral-900 text-white",
}: {
    className?: string;
    badgeClassName?: string;
}) {
    const { closet } = useTryOn();

    return (
        <Link
            to="/try-on"
            aria-label={`Try on closet, ${closet.length} ${closet.length === 1 ? "piece" : "pieces"}`}
            className={`relative inline-flex transition-opacity hover:opacity-60 ${className}`}
        >
            <style>{CSS}</style>
            <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="M12 8.5V7.8c0-.9 1.8-1.2 1.8-2.8a1.8 1.8 0 1 0-3.6 0" />
                <path d="M12 8.5 3.4 15.2a1.3 1.3 0 0 0 .8 2.3h15.6a1.3 1.3 0 0 0 .8-2.3L12 8.5Z" />
            </svg>
            {closet.length > 0 && (
                <span
                    key={closet.length}
                    className={`cl-badge absolute -right-2 -top-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium leading-none ${badgeClassName}`}
                >
                    {closet.length}
                </span>
            )}
        </Link>
    );
}