import type { CSSProperties, ReactNode } from 'react';
import type { Screen } from '../store';

type IconProps = {
  size?: number;
  stroke?: number;
  style?: CSSProperties;
  className?: string;
};

function Svg({
  size = 18,
  stroke = 1.7,
  style,
  className,
  children,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={className}
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <g
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </g>
    </svg>
  );
}

export function IconHome(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </Svg>
  );
}

export function IconLedger(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-1.5L13 20l-3-1.5L7 20V6a2 2 0 0 1 2-2Z" />
      <path d="M10 9h6M10 13h6" />
    </Svg>
  );
}

export function IconVoucher(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-2.2-1.2L14.5 20 12 18.8 9.5 20 7.2 18.8 5 20V5a1 1 0 0 1 1-1Z" />
      <path d="M9 9h6M9 13h4" />
    </Svg>
  );
}

export function IconReports(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 16V10M12 16V7M16 16v-4" />
    </Svg>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.2 19a4.2 4.2 0 0 1 5.3-3.7" />
    </Svg>
  );
}

export function IconStock(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 8.5 12 4l8 4.5V16L12 20.5 4 16V8.5Z" />
      <path d="M12 12v8.5M12 12 4 8.5M12 12l8-3.5" />
    </Svg>
  );
}

export function IconPrice(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.1-4.5 3 1.8 2.7 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.1-4.5-3" />
    </Svg>
  );
}

export function IconSettings(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.2v-2.4l1.5-1.2-1.4-2.5-1.9.5a6.8 6.8 0 0 0-1.4-.8l-.4-1.9h-2.8l-.4 1.9c-.5.2-1 .5-1.4.8l-1.9-.5-1.4 2.5 1.5 1.2v2.4l-1.5 1.2 1.4 2.5 1.9-.5c.4.3.9.6 1.4.8l.4 1.9h2.8l.4-1.9c.5-.2 1-.5 1.4-.8l1.9.5 1.4-2.5-1.5-1.2Z" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconEdit(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h4.5L19 9.5 14.5 5 4 15.5V20Z" />
      <path d="M12.5 7.5 16.5 11.5" />
    </Svg>
  );
}

export function IconPrint(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 8V4h10v4" />
      <path d="M7 16H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <path d="M7 13h10v7H7v-7Z" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.5 16.5 21 21" />
    </Svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5v-12Z" />
      <path d="M8 3.5V6M16 3.5V6M5 10h14" />
    </Svg>
  );
}

export function IconUser(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19.5a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function IconId(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-11Z" />
      <circle cx="9" cy="11" r="2" />
      <path d="M13.5 10h4M13.5 14H17M6.5 15.5c.6-1.2 1.8-2 3-2s2.4.8 3 2" />
    </Svg>
  );
}

export function IconMapPin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s-6.5-5.2-6.5-10A6.5 6.5 0 0 1 18.5 11C18.5 15.8 12 21 12 21Z" />
      <circle cx="12" cy="11" r="2.2" />
    </Svg>
  );
}

export function IconPhone(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M8.5 3.5h3L13 8l-2 1.2a12 12 0 0 0 3.8 3.8L16 11l4.5 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 3.5 5.7a2 2 0 0 1 2-2.2h3Z" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Svg>
  );
}

export function IconScale(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v16M6 8h12" />
      <path d="M6 8 3.5 14a3 3 0 0 0 5.5 0L6 8ZM18 8l-2.5 6a3 3 0 0 0 5.5 0L18 8Z" />
    </Svg>
  );
}

const NAV_ICONS: Partial<Record<Screen, (p: IconProps) => ReactNode>> = {
  dash: IconHome,
  ledger: IconLedger,
  voucher: IconVoucher,
  reports: IconReports,
  customers: IconUsers,
  stock: IconStock,
  prices: IconPrice,
  settings: IconSettings,
  entry: IconPlus,
};

export function NavIcon({ screen, ...p }: IconProps & { screen: Screen }) {
  const C = NAV_ICONS[screen] ?? IconHome;
  return <C {...p} />;
}
