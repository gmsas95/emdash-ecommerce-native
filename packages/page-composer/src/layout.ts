import { z } from "zod";

import type { SectionRegistry } from "./registry.js";

export const LAYOUT_VERSION = 1 as const;

export const LAYOUT_PRESETS = [
  "stack",
  "split",
  "three-column",
  "center",
  "wide",
  "narrow",
] as const;

export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];

export const SECTION_CATEGORIES = ["content", "commerce", "conversion"] as const;
export type SectionCategory = (typeof SECTION_CATEGORIES)[number];

export const layoutPresetSchema = z.enum(LAYOUT_PRESETS);

export const responsiveLayoutSchema = z
  .object({
    desktop: layoutPresetSchema.optional(),
    tablet: layoutPresetSchema.optional(),
    mobile: layoutPresetSchema.optional(),
  })
  .strict();

export const responsiveVisibilitySchema = z
  .object({
    desktop: z.boolean().optional(),
    tablet: z.boolean().optional(),
    mobile: z.boolean().optional(),
  })
  .strict();

export const sectionInstanceSchema = z
  .object({
    id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
    type: z.string().min(1).max(128).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
    settings: z.record(z.string(), z.unknown()),
    layout: responsiveLayoutSchema.optional(),
    visibility: responsiveVisibilitySchema.optional(),
  })
  .strict();

export const pageLayoutSchema = z
  .object({
    version: z.literal(LAYOUT_VERSION),
    sections: z.array(sectionInstanceSchema).max(100),
  })
  .strict();

export type ResponsiveLayout = z.infer<typeof responsiveLayoutSchema>;
export type ResponsiveVisibility = z.infer<typeof responsiveVisibilitySchema>;
export type SectionInstance = z.infer<typeof sectionInstanceSchema>;
export type PageLayout = z.infer<typeof pageLayoutSchema>;

export type SectionRenderInput<Context = unknown> = {
  section: SectionInstance;
  context: Context;
};

export type SectionRenderer<Context = unknown, Output = unknown> = (
  input: SectionRenderInput<Context>,
) => Output | Promise<Output>;

export type SectionDefinition<Context = unknown, Output = unknown> = {
  type: string;
  label: string;
  category: SectionCategory;
  settingsSchema: z.ZodTypeAny;
  supportedPresets: readonly LayoutPreset[];
  render: SectionRenderer<Context, Output>;
};


/**
 * Parse the base layout and then parse each section with its registered settings
 * schema. Validation occurs before storage and before a renderer is selected.
 */
export function parsePageLayout(input: unknown, registry: SectionRegistry): PageLayout {
  const layout = pageLayoutSchema.parse(input);
  const ids = new Set<string>();

  return {
    version: layout.version,
    sections: layout.sections.map((section) => {
      if (ids.has(section.id)) {
        throw new Error(`Duplicate section ID: ${section.id}`);
      }
      ids.add(section.id);

      const definition = registry.get(section.type);

      if (section.layout) {
        for (const preset of Object.values(section.layout)) {
          if (preset && !definition.supportedPresets.includes(preset)) {
            throw new Error(`Unsupported ${preset} preset for section type: ${section.type}`);
          }
        }
      }

      const settings = definition.settingsSchema.parse(section.settings);
      if (settings === null || typeof settings !== "object" || Array.isArray(settings)) {
        throw new Error(`Settings for section type ${section.type} must be an object`);
      }

      return { ...section, settings: settings as Record<string, unknown> };
    }),
  };
}

export function createSectionId(type: string, existingIds: ReadonlySet<string>): string {
  const base = type.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/^-+|-+$/g, "") || "section";
  let id = `${base}-1`;
  let suffix = 1;
  while (existingIds.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  return id;
}
