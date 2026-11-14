import type { ReactNode } from "react";

type IconProps = { size?: number };

const Svg = ({ children, size = 18 }: { children: ReactNode; size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        {children}
    </svg>
);

export const UserIcon = ({ size = 18 }: IconProps) => (
    <Svg size={size}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
);

export const PlusIcon = ({ size = 14 }: IconProps) => (
    <Svg size={size}>
        <path d="M12 5v14M5 12h14" />
    </Svg>
);

export const HeartIcon = ({ filled }: { filled: boolean }) => (
    <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.7 3.6 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.4 0 5.4 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5Z" />
    </svg>
);

export const MinusIcon = ({ size = 14 }: IconProps) => (
    <Svg size={size}>
        <path d="M5 12h14" />
    </Svg>
);

export const CloseIcon = ({ size = 14 }: IconProps) => (
    <Svg size={size}>
        <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
);

export const CheckIcon = ({ size = 14 }: IconProps) => (
    <Svg size={size}>
        <path d="m5 12.5 4.5 4.5L19 7" />
    </Svg>
);

export const ArrowIcon = ({ size = 16 }: IconProps) => (
    <Svg size={size}>
        <path d="M5 12h14M13 6l6 6-6 6" />
    </Svg>
);

export const BagIcon = ({ size = 18 }: IconProps) => (
    <Svg size={size}>
        <path d="M5 8h14l-1 12H6L5 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
    </Svg>
);

export const ChevronDown = ({ size = 16 }: IconProps) => (
    <Svg size={size}>
        <path d="m6 9 6 6 6-6" />
    </Svg>
);

export const ChevronRight = ({ size = 16 }: IconProps) => (
    <Svg size={size}>
        <path d="m9 5 7 7-7 7" />
    </Svg>
);

export const FilterIcon = ({ size = 16 }: IconProps) => (
    <Svg size={size}>
        <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
);

export const HangerIcon = ({ size = 18 }: IconProps) => (
    <Svg size={size}>
        <path d="M12 8.5V7.8c0-.9 1.8-1.2 1.8-2.8a1.8 1.8 0 1 0-3.6 0" />
        <path d="M12 8.5 3.4 15.2a1.3 1.3 0 0 0 .8 2.3h15.6a1.3 1.3 0 0 0 .8-2.3L12 8.5Z" />
    </Svg>
);

export const PinIcon = () => (
    <Svg>
        <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" />
        <circle cx="12" cy="10" r="2.3" />
    </Svg>
);

export const PhoneIcon = () => (
    <Svg>
        <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </Svg>
);

export const MailIcon = () => (
    <Svg>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
    </Svg>
);