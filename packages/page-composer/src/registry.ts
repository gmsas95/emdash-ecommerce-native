import { z } from "zod";

import type {
  LayoutPreset,
  SectionDefinition,
  SectionInstance,
  SectionRenderInput,
} from "./layout.js";

export type SectionRegistry = {
  get(type: string): SectionDefinition;
  list(): readonly SectionDefinition[];
  has(type: string): boolean;
};

function structuredRenderer({ section }: SectionRenderInput): StructuredSection {
  return {
    type: section.type,
    id: section.id,
    settings: section.settings,
    layout: section.layout,
    visibility: section.visibility,
  };
}

export type StructuredSection = {
  type: string;
  id: string;
  settings: Record<string, unknown>;
  layout?: SectionInstance["layout"];
  visibility?: SectionInstance["visibility"];
};

const ALL_PRESETS: readonly LayoutPreset[] = [
  "stack",
  "split",
  "three-column",
  "center",
  "wide",
  "narrow",
];

const copySettings = z
  .object({
    eyebrow: z.string().max(120).optional(),
    heading: z.string().min(1).max(240),
    body: z.string().max(2_000).optional(),
    ctaLabel: z.string().max(80).optional(),
    ctaHref: z.string().max(2_000).optional(),
  })
  .strict();

const imageTextSettings = z
  .object({
    heading: z.string().min(1).max(240),
    body: z.string().max(2_000).optional(),
    imageUrl: z.string().url().max(2_000),
    imageAlt: z.string().max(240),
    imagePosition: z.enum(["left", "right"]).default("right"),
  })
  .strict();

const featureColumnsSettings = z
  .object({
    heading: z.string().max(240).optional(),
    items: z
      .array(
        z
          .object({
            title: z.string().min(1).max(160),
            body: z.string().max(1_000),
          })
          .strict(),
      )
      .min(1)
      .max(6),
  })
  .strict();

const faqSettings = z
  .object({
    heading: z.string().max(240).optional(),
    items: z
      .array(
        z
          .object({
            question: z.string().min(1).max(240),
            answer: z.string().min(1).max(2_000),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict();

const productGridSettings = z
  .object({
    heading: z.string().max(240).optional(),
    query: z.string().max(500).optional(),
    columns: z.enum(["2", "3", "4"]).default("4"),
  })
  .strict();

const featuredProductSettings = z
  .object({
    productId: z.string().min(1).max(200),
    heading: z.string().max(240).optional(),
  })
  .strict();

const categoryGridSettings = z
  .object({
    heading: z.string().max(240).optional(),
    categoryIds: z.array(z.string().min(1).max(200)).min(1).max(30),
  })
  .strict();

const reviewsSettings = z
  .object({
    heading: z.string().max(240).optional(),
    productId: z.string().min(1).max(200).optional(),
  })
  .strict();

const announcementSettings = z
  .object({
    text: z.string().min(1).max(500),
    tone: z.enum(["neutral", "positive", "attention"]).default("neutral"),
  })
  .strict();

const newsletterSettings = z
  .object({
    heading: z.string().min(1).max(240),
    body: z.string().max(1_000).optional(),
    submitLabel: z.string().min(1).max(80).default("Subscribe"),
  })
  .strict();

const definitions: readonly SectionDefinition[] = [
  { type: "hero", label: "Hero", category: "content", settingsSchema: copySettings, supportedPresets: ALL_PRESETS, render: structuredRenderer },
  { type: "image-text", label: "Image and text", category: "content", settingsSchema: imageTextSettings, supportedPresets: ["split", "wide", "narrow"], render: structuredRenderer },
  { type: "feature-columns", label: "Feature columns", category: "content", settingsSchema: featureColumnsSettings, supportedPresets: ["three-column", "wide"], render: structuredRenderer },
  { type: "faq", label: "FAQ", category: "content", settingsSchema: faqSettings, supportedPresets: ["stack", "wide", "narrow"], render: structuredRenderer },
  { type: "product-grid", label: "Product grid", category: "commerce", settingsSchema: productGridSettings, supportedPresets: ["stack", "wide"], render: structuredRenderer },
  { type: "featured-product", label: "Featured product", category: "commerce", settingsSchema: featuredProductSettings, supportedPresets: ["split", "center", "wide", "narrow"], render: structuredRenderer },
  { type: "category-grid", label: "Category grid", category: "commerce", settingsSchema: categoryGridSettings, supportedPresets: ["three-column", "wide"], render: structuredRenderer },
  { type: "reviews", label: "Reviews", category: "commerce", settingsSchema: reviewsSettings, supportedPresets: ["stack", "wide", "narrow"], render: structuredRenderer },
  { type: "announcement", label: "Announcement strip", category: "conversion", settingsSchema: announcementSettings, supportedPresets: ["stack", "wide"], render: structuredRenderer },
  { type: "newsletter", label: "Newsletter or contact CTA", category: "conversion", settingsSchema: newsletterSettings, supportedPresets: ["split", "center", "wide", "narrow"], render: structuredRenderer },
];

export const DEFAULT_SECTION_DEFINITIONS = definitions;

export function createSectionRegistry(
  sectionDefinitions: readonly SectionDefinition[] = DEFAULT_SECTION_DEFINITIONS,
): SectionRegistry {
  const byType: Record<string, SectionDefinition> = {};
  for (const definition of sectionDefinitions) {
    if (byType[definition.type]) {
      throw new Error(`Duplicate section type: ${definition.type}`);
    }
    if (definition.supportedPresets.length === 0) {
      throw new Error(`Section type ${definition.type} must support a layout preset`);
    }
    byType[definition.type] = definition;
  }

  return {
    get(type) {
      const definition = byType[type];
      if (!definition) {
        throw new Error(`Unknown section type: ${type}`);
      }
      return definition;
    },
    list() {
      return sectionDefinitions;
    },
    has(type) {
      return Boolean(byType[type]);
    },
  };
}

