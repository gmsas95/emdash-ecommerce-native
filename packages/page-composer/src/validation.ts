import type { PageLayout } from "./layout.js";
import { parsePageLayout } from "./layout.js";
import type { SectionRegistry } from "./registry.js";

export type PageLayoutValidation =
  | { success: true; data: PageLayout }
  | { success: false; error: Error };

export function safeParsePageLayout(input: unknown, registry: SectionRegistry): PageLayoutValidation {
  try {
    return { success: true, data: parsePageLayout(input, registry) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Invalid page layout"),
    };
  }
}
