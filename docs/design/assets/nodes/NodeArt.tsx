/* Generated from docs/design/demos/shared/art.js. Original illustrations for System Design Lab.
   Colour: set `color` on the svg (category token); fill uses --sd-art-fill or a 16% tint of currentColor. */
import type { SVGProps } from "react";

export type NodeArtKind =
  | "client"
  | "mobile"
  | "dns"
  | "cdn"
  | "api-gateway"
  | "lb"
  | "rate-limiter"
  | "web-server"
  | "worker"
  | "scheduler"
  | "postgres"
  | "read-replica"
  | "kv-store"
  | "search"
  | "redis"
  | "memcached"
  | "queue"
  | "rabbitmq"
  | "stream"
  | "object-storage"
  | "third-party";

const ART: Record<NodeArtKind, JSX.Element> = {
  "client": (
    <>
      <rect x="7" y="9" width="36" height="24" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M12 16h14M12 21h20M12 26h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 36h44l-3 4H6z" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="46" y="15" width="14" height="25" rx="3" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M51 36h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "mobile": (
    <>
      <rect x="20" y="4" width="24" height="40" rx="4" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M29 8h6M30 40h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="24.5" y="13" width="6" height="6" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="33.5" y="13" width="6" height="6" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="24.5" y="22" width="6" height="6" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="33.5" y="22" width="6" height="6" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M50 12a8 8 0 0 1 0 12M54 8a14 14 0 0 1 0 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "dns": (
    <>
      <circle cx="22" cy="24" r="15" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M7 24h30M22 9c-5 4-6 26 0 30M22 9c5 4 6 26 0 30M10 16h24M10 32h24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="40" y="11" width="20" height="9" rx="2" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M43.5 15.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="40" y="28" width="20" height="9" rx="2" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M43.5 32.5h4M50 32.5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M50 20v8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2.5"/>
    </>
  ),
  "cdn": (
    <>
      <path d="M10 30a9 9 0 0 1 4-17 12 12 0 0 1 23-1 9 9 0 0 1 13 9 7 7 0 0 1-2 14H14a7 7 0 0 1-4-5z" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M18 42v-6M32 42v-6M46 42v-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="43" r="2.2" fill="currentColor"/>
      <circle cx="32" cy="43" r="2.2" fill="currentColor"/>
      <circle cx="46" cy="43" r="2.2" fill="currentColor"/>
      <path d="M22 22h20M28 17l-6 5 6 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "api-gateway": (
    <>
      <path d="M10 42V15l22-9 22 9v27" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M21 42V27a11 11 0 0 1 22 0v15" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M4 42h56M29 14h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 34h56M54 30l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "lb": (
    <>
      <path d="M2 34h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="27" width="44" height="14" rx="3" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="17" cy="34" r="1.6" fill="currentColor"/>
      <circle cx="23" cy="34" r="1.6" fill="currentColor"/>
      <path d="M30 34h18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3"/>
      <path d="M32 27V20M32 20L14 8M32 20V7M32 20l18-12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11 10l3-2 1 3.4M29 9.6l3-2.6 3 2.6M47.4 11.2l2.6-3.2 0.4 3.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "rate-limiter": (
    <>
      <path d="M12 11h40L38 26v9l-12 5V26z" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="18" cy="4" r="1.6" fill="currentColor"/>
      <circle cx="25" cy="6.5" r="1.6" fill="currentColor"/>
      <circle cx="32" cy="3.5" r="1.6" fill="currentColor"/>
      <circle cx="39" cy="6" r="1.6" fill="currentColor"/>
      <circle cx="46" cy="4" r="1.6" fill="currentColor"/>
      <circle cx="32" cy="45" r="1.9" fill="currentColor"/>
    </>
  ),
  "web-server": (
    <>
      <rect x="8" y="6" width="48" height="15" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="8" y="25" width="48" height="15" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="15" cy="13.5" r="1.7" fill="currentColor"/>
      <circle cx="21" cy="13.5" r="1.7" fill="currentColor"/>
      <circle cx="15" cy="32.5" r="1.7" fill="currentColor"/>
      <circle cx="21" cy="32.5" r="1.7" fill="currentColor"/>
      <path d="M36 10v7M40 10v7M44 10v7M48 10v7M36 29v7M40 29v7M44 29v7M48 29v7M13 40v3M51 40v3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "worker": (
    <>
      <rect x="6" y="14" width="34" height="26" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="12" cy="20" r="1.6" fill="currentColor"/>
      <circle cx="18" cy="20" r="1.6" fill="currentColor"/>
      <path d="M11 30h14M11 35h20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="46" cy="16" r="9" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="46" cy="16" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M46 4.5v3M46 24.5v3M34.5 16h3M54.5 16h3M37.9 7.9l2.1 2.1M52 22l2.1 2.1M37.9 24.1l2.1-2.1M52 10l2.1-2.1" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "scheduler": (
    <>
      <rect x="6" y="9" width="34" height="32" rx="3" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M6 17h34M14 5v7M32 5v7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 23h4M20 23h4M28 23h4M12 29h4M20 29h4M12 35h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="46" cy="32" r="12" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M46 25v7l5 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "postgres": (
    <>
      <path d="M13 9v28c0 3 17.1 5 19 5s19 -2 19 -5V9" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <ellipse cx="32" cy="9" rx="19" ry="4.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13 18.5c0 3 8.5 5.5 19 5.5s19-2.5 19-5.5M13 28c0 3 8.5 5.5 19 5.5S51 31 51 28" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="44" cy="22" r="1.4" fill="currentColor"/>
      <circle cx="44" cy="31.5" r="1.4" fill="currentColor"/>
    </>
  ),
  "read-replica": (
    <>
      <path d="M26 10v26c0 3 13.5 5 15 5s15 -2 15 -5V10" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="3 2.5"/>
      <ellipse cx="41" cy="10" rx="15" ry="4.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="3 2.5"/>
      <path d="M6 14v26c0 3 13.5 5 15 5s15 -2 15 -5V14" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <ellipse cx="21" cy="14" rx="15" ry="4.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M6 23c0 2.5 6.7 4.5 15 4.5s15-2 15-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M38 6h12a6 6 0 0 1 6 6v2M53 11l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "kv-store": (
    <>
      <rect x="8" y="6" width="48" height="36" rx="3" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 18h48M8 30h48M26 6v36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15" cy="12" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.3 12h4.2M20 12v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15" cy="24" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.3 24h4.2M20 24v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15" cy="36" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.3 36h4.2M20 36v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M31 12h18M31 24h12M31 36h20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "search": (
    <>
      <rect x="6" y="5" width="30" height="38" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M11 12h18M11 18h20M11 24h14M11 30h16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="40" cy="26" r="10" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M47.5 33.5L57 43" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3"/>
      <path d="M36 26a4 4 0 0 1 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "redis": (
    <>
      <rect x="4" y="14" width="56" height="20" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="9" y="18" width="8" height="10" rx="1" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="20" y="18" width="8" height="10" rx="1" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="36" y="18" width="8" height="10" rx="1" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="47" y="18" width="8" height="10" rx="1" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M8 34v4M14 34v4M20 34v4M26 34v4M38 34v4M44 34v4M50 34v4M56 34v4M31 34v5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M34 2l-6 11h6l-3 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"/>
    </>
  ),
  "memcached": (
    <>
      <rect x="4" y="8" width="56" height="13" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="4" y="26" width="56" height="13" rx="2.5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M10 12.5h8M22 12.5h8M34 12.5h8M46 12.5h8M10 16.5h8M22 16.5h8M34 16.5h8M46 16.5h8M10 30.5h8M22 30.5h8M34 30.5h8M46 30.5h8M10 34.5h8M22 34.5h8M34 34.5h8M46 34.5h8" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3"/>
      <path d="M9 39v4M17 39v4M25 39v4M39 39v4M47 39v4M55 39v4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "queue": (
    <>
      <path d="M2 24h6M56 24h6M58 20l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="8" y="13" width="48" height="22" rx="11" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="15" y="18" width="9" height="12" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="27.5" y="18" width="9" height="12" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="40" y="18" width="9" height="12" rx="1.5" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M15 18l4.5 5 4.5-5M27.5 18l4.5 5 4.5-5M40 18l4.5 5 4.5-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/>
    </>
  ),
  "rabbitmq": (
    <>
      <path d="M2 24h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="10" y="15" width="16" height="18" rx="3" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M13 24h5l4-4M18 24l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M26 24c6 0 6-12 12-12M26 24c6 0 6 12 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="38" y="6" width="22" height="12" rx="6" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="38" y="30" width="22" height="12" rx="6" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <circle cx="44" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="49" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="54" cy="12" r="1.6" fill="currentColor"/>
      <circle cx="44" cy="36" r="1.6" fill="currentColor"/>
      <circle cx="49" cy="36" r="1.6" fill="currentColor"/>
    </>
  ),
  "stream": (
    <>
      <rect x="4" y="7" width="52" height="9" rx="2" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="4" y="20" width="52" height="9" rx="2" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="4" y="33" width="52" height="9" rx="2" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M12 7v9M20 7v9M28 7v9M36 7v9M44 7v9M12 20v9M20 20v9M28 20v9M36 20v9M12 33v9M20 33v9M28 33v9M36 33v9M44 33v9M52 33v9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2"/>
      <path d="M59 6v38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3"/>
      <path d="M40 3l2 3 2-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
  "object-storage": (
    <>
      <path d="M10 16l4 26h36l4-26" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <ellipse cx="32" cy="16" rx="22" ry="5" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M22 16V7h9l3 3v6M36 16v-6h8v6" fill="var(--sd-surface, #fff)" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
      <path d="M25 11h3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 28h36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3"/>
    </>
  ),
  "third-party": (
    <>
      <path d="M10 32a9 9 0 0 1 3-17 12 12 0 0 1 22-3 10 10 0 0 1 16 8 7 7 0 0 1 0 14H13a7 7 0 0 1-3-2z" fill="var(--sd-art-fill, color-mix(in srgb, currentColor 16%, var(--sd-surface, #fff)))" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="4 2.5"/>
      <path d="M28 19h-3v12h12v-3M32 16h8v8M40 16l-9 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 42h20M20 38l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  ),
};

export function NodeArt({ kind, ...props }: { kind: NodeArtKind } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden="true" focusable="false" {...props}>
      {ART[kind]}
    </svg>
  );
}
