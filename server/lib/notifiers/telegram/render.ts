import { InlineKeyboard } from "grammy";
import { eq } from "drizzle-orm";
import { db } from "~/server/db/client";
import { flat } from "~/server/db/schema";
import { propertyManagementConfigs } from "~/data/propertyManagements/configs";
import { type NotifiableFlat } from "~/server/lib/notifiers/types";
import { escapeHtml } from "./html";

/** Collapse internal whitespace/newlines and trim; optionally cap length. */
function clean(text: string, maxLength = 120): string {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > maxLength
    ? `${collapsed.slice(0, maxLength - 1).trimEnd()}…`
    : collapsed;
}

function formatEuro(value: number | null): string | null {
  if (value == null) return null;
  return `${value.toLocaleString("de-DE")} €`;
}

function formatArea(value: number | null): string | null {
  if (value == null) return null;
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} m²`;
}

function providerName(id: string | null): string | null {
  if (!id) return null;
  const cfg =
    propertyManagementConfigs[id as keyof typeof propertyManagementConfigs];
  return cfg?.name ?? id;
}

function formatAddress(f: NotifiableFlat): string | null {
  const parts = [
    [f.street, f.streetNumber].filter(Boolean).join(" "),
    [f.postalCode, f.city].filter(Boolean).join(" "),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Google Maps deep link — coordinates when available, else the address. */
function mapsUrl(f: NotifiableFlat): string | null {
  if (f.latitude != null && f.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${f.latitude},${f.longitude}`;
  }
  const address = formatAddress(f);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export type RenderedNotification = {
  caption: string;
  keyboard: InlineKeyboard;
};

/** Build the HTML caption + inline keyboard for a listing notification. */
export function renderNotification(f: NotifiableFlat): RenderedNotification {
  const rows: [string, string | null][] = [
    ["Titel", clean(f.title)],
    ["Warmmiete", formatEuro(f.warmRentPrice)],
    ["Kaltmiete", formatEuro(f.coldRentPrice)],
    ["Zimmer", f.roomCount != null ? String(f.roomCount) : null],
    ["Fläche", formatArea(f.usableArea)],
    ["Anbieter", providerName(f.propertyManagementId)],
    ["Adresse", formatAddress(f)],
  ];

  const body = rows
    .filter(([, value]) => value != null && value !== "")
    .map(([label, value]) => `<b>${label}:</b> ${escapeHtml(value as string)}`)
    .join("\n");

  const caption = `🏠 <b>Neues Wohnungsangebot</b>\n\n${body}`;

  const keyboard = new InlineKeyboard();
  const maps = mapsUrl(f);
  if (maps) keyboard.url("🗺️ Google Maps", maps);
  keyboard.url("🔗 Anschauen", f.url);

  return { caption, keyboard };
}

/** Load the listing's stored image blob, or null if it has none. */
export async function loadFlatImage(flatId: string): Promise<Buffer | null> {
  const row = await db.query.flat.findFirst({
    where: eq(flat.id, flatId),
    columns: { image: true },
  });
  return row?.image ?? null;
}
