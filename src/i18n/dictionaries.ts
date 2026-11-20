import type { Locale } from "./config";
import type ar from "../messages/ar.json";

// The Arabic file defines the shape. If French or English lacks a key,
// the typecheck fails, so a missing translation cannot reach production.
export type Messages = typeof ar;

const loaders: Record<Locale, () => Promise<Messages>> = {
  ar: () => import("../messages/ar.json").then((module) => module.default),
  fr: () => import("../messages/fr.json").then((module) => module.default),
  en: () => import("../messages/en.json").then((module) => module.default),
};

export function getMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
