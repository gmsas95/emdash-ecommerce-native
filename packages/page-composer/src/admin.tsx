import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import type { PluginAdminExports } from "emdash";
import * as React from "react";

import { createSectionId, type LayoutPreset, type PageLayout, type SectionInstance } from "./layout.js";
import { DEFAULT_SECTION_DEFINITIONS, createSectionRegistry } from "./registry.js";
import { safeParsePageLayout } from "./validation.js";

const API = "/_emdash/api/plugins/emdash-page-composer";
const REGISTRY = createSectionRegistry();

const DEFAULT_SETTINGS: Record<string, Record<string, unknown>> = {
  hero: { heading: "New hero", body: "", ctaLabel: "", ctaHref: "" },
  "image-text": { heading: "New image section", body: "", imageUrl: "https://example.com/image.jpg", imageAlt: "" },
  "feature-columns": { items: [{ title: "Feature", body: "Describe this feature." }] },
  faq: { items: [{ question: "Question", answer: "Answer" }] },
  "product-grid": { columns: "4" },
  "featured-product": { productId: "product-id" },
  "category-grid": { categoryIds: ["category-id"] },
  reviews: {},
  announcement: { text: "Announcement" },
  newsletter: { heading: "Stay in the loop", submitLabel: "Subscribe" },
};

type LayoutResponse = { pageId: string; layout: unknown | null };

type Breakpoint = "desktop" | "tablet" | "mobile";
const BREAKPOINTS: readonly { key: Breakpoint; label: string }[] = [
  { key: "desktop", label: "Desktop" },
  { key: "tablet", label: "Tablet" },
  { key: "mobile", label: "Mobile" },
];

async function post(route: string, body: unknown): Promise<unknown> {
  const response = await apiFetch(`${API}/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Page Composer request failed (${response.status})`);
  }
  return parseApiResponse(response);
}

function cloneSection(section: SectionInstance, existingIds: ReadonlySet<string>): SectionInstance {
  const type = section.type;
  return {
    ...section,
    id: createSectionId(type, existingIds),
    settings: structuredClone(section.settings),
  };
}

function moveSection(sections: readonly SectionInstance[], index: number, direction: -1 | 1): SectionInstance[] {
  const target = index + direction;
  if (index < 0 || index >= sections.length || target < 0 || target >= sections.length) {
    return [...sections];
  }
  const next = [...sections];
  const [section] = next.splice(index, 1);
  if (!section) return next;
  next.splice(target, 0, section);
  return next;
}

function PageComposerPage() {
  const [pageId, setPageId] = React.useState("home");
  const [layout, setLayout] = React.useState<PageLayout>({ version: 1, sections: [] });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [settingsText, setSettingsText] = React.useState("{}");
  const [responsiveLayout, setResponsiveLayout] = React.useState<Record<Breakpoint, LayoutPreset>>({
    desktop: "stack",
    tablet: "stack",
    mobile: "stack",
  });
  const [visibility, setVisibility] = React.useState<Record<Breakpoint, boolean>>({
    desktop: true,
    tablet: true,
    mobile: true,
  });
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  function syncEditorState(section: SectionInstance | undefined): void {
    setSettingsText(JSON.stringify(section?.settings ?? {}, null, 2));
    const definition = section ? REGISTRY.get(section.type) : undefined;
    const fallback = definition?.supportedPresets[0] ?? "stack";
    setResponsiveLayout({
      desktop: section?.layout?.desktop ?? fallback,
      tablet: section?.layout?.tablet ?? section?.layout?.desktop ?? fallback,
      mobile: section?.layout?.mobile ?? section?.layout?.tablet ?? section?.layout?.desktop ?? fallback,
    });
    setVisibility({
      desktop: section?.visibility?.desktop ?? true,
      tablet: section?.visibility?.tablet ?? true,
      mobile: section?.visibility?.mobile ?? true,
    });
  }


  const selected = layout.sections.find((section) => section.id === selectedId) ?? null;

  const loadLayout = React.useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = (await post("layouts/get", { pageId })) as LayoutResponse;
      const parsed = result.layout === null
        ? { success: true as const, data: { version: 1 as const, sections: [] } }
        : safeParsePageLayout(result.layout, REGISTRY);
      if (parsed.success) {
        setLayout(parsed.data);
        setSelectedId(parsed.data.sections[0]?.id ?? null);
        syncEditorState(parsed.data.sections[0]);
      } else {
        throw parsed.error;
      }
      setMessage("Layout loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load layout.");
    } finally {
      setLoading(false);
    }
  }, [pageId]);

  React.useEffect(() => {
    void loadLayout();
  }, [loadLayout]);

  function selectSection(section: SectionInstance) {
    setSelectedId(section.id);
    syncEditorState(section);
  }

  function addSection(type: string) {
    const ids = new Set(layout.sections.map((section) => section.id));
    const section: SectionInstance = {
      id: createSectionId(type, ids),
      type,
      settings: structuredClone(DEFAULT_SETTINGS[type] ?? {}),
    };
    setLayout((current) => ({ ...current, sections: [...current.sections, section] }));
    selectSection(section);
  }

  function updateSections(sections: SectionInstance[]) {
    setLayout((current) => ({ ...current, sections }));
  }

  function removeSection(id: string) {
    const sections = layout.sections.filter((section) => section.id !== id);
    updateSections(sections);
    if (selectedId === id) {
      const next = sections[0] ?? null;
      syncEditorState(next ?? undefined);
    }
  }

  function duplicateSection(section: SectionInstance) {
    const ids = new Set(layout.sections.map((item) => item.id));
    const copy = cloneSection(section, ids);
    const index = layout.sections.findIndex((item) => item.id === section.id);
    const sections = [...layout.sections];
    sections.splice(index + 1, 0, copy);
    updateSections(sections);
    selectSection(copy);
  }

  function applySettings() {
    if (!selected) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(settingsText);
    } catch {
      setMessage("Settings must be valid JSON.");
      return;
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      setMessage("Settings must be a JSON object.");
      return;
    }
    updateSections(layout.sections.map((section) => (section.id === selected.id
      ? {
        ...section,
        settings: parsed as Record<string, unknown>,
        layout: { ...responsiveLayout },
        visibility: { ...visibility },
      }
      : section)));
    setMessage("Settings applied locally. Save to persist them.");
  }

  async function saveLayout() {
    setLoading(true);
    setMessage(null);
    try {
      const parsed = safeParsePageLayout(layout, REGISTRY);
      if (!parsed.success) throw parsed.error;
      const result = (await post("layouts/save", { pageId, layout: parsed.data })) as LayoutResponse;
      const saved = safeParsePageLayout(result.layout, REGISTRY);
      if (!saved.success) throw saved.error;
      setLayout(saved.data);
      setMessage("Layout saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save layout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Page Composer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose registered sections with bounded responsive presets. Themes render the saved layout.
        </p>
      </header>

      <div className="flex gap-2 items-end mb-6">
        <label className="flex-1 text-sm font-medium">
          Page ID
          <input className="mt-1 block w-full rounded border px-3 py-2" value={pageId} onChange={(event) => setPageId(event.target.value)} />
        </label>
        <button type="button" className="rounded border px-3 py-2" onClick={() => void loadLayout()} disabled={loading}>
          Load
        </button>
        <button type="button" className="rounded bg-primary px-3 py-2 text-primary-foreground" onClick={() => void saveLayout()} disabled={loading}>
          Save layout
        </button>
      </div>

      {message && <p role="status" className="mb-4 text-sm">{message}</p>}

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr_22rem]">
        <aside aria-label="Add section" className="rounded border p-4">
          <h2 className="font-medium mb-3">Add section</h2>
          <div className="grid gap-2">
            {DEFAULT_SECTION_DEFINITIONS.map((definition) => (
              <button key={definition.type} type="button" className="rounded border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => addSection(definition.type)}>
                <span className="font-medium">{definition.label}</span>
                <span className="block text-xs text-muted-foreground">{definition.category}</span>
              </button>
            ))}
          </div>
        </aside>

        <section aria-label="Section tree" className="rounded border p-4">
          <h2 className="font-medium mb-3">Sections</h2>
          {layout.sections.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sections yet. Add one from the registry.</p>
          ) : (
            <ol className="grid gap-2">
              {layout.sections.map((section, index) => {
                const definition = REGISTRY.get(section.type);
                return (
                  <li key={section.id} className={`rounded border p-3 ${selectedId === section.id ? "border-primary" : ""}`}>
                    <button type="button" className="w-full text-left" onClick={() => selectSection(section)}>
                      <span className="font-medium">{definition.label}</span>
                      <span className="block text-xs text-muted-foreground">{section.id}</span>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => updateSections(moveSection(layout.sections, index, -1))} disabled={index === 0}>Move up</button>
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => updateSections(moveSection(layout.sections, index, 1))} disabled={index === layout.sections.length - 1}>Move down</button>
                      <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => duplicateSection(section)}>Duplicate</button>
                      <button type="button" className="rounded border px-2 py-1 text-xs text-destructive" onClick={() => removeSection(section.id)}>Remove</button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section aria-label="Section settings" className="rounded border p-4">
          <h2 className="font-medium mb-3">Section settings</h2>
          {selected ? (
            <>
              <p className="text-sm mb-2">{REGISTRY.get(selected.type).label}</p>
              <fieldset className="mb-4 grid gap-2">
                <legend className="text-sm font-medium">Responsive layout preset</legend>
                {BREAKPOINTS.map(({ key, label }) => {
                  const presets = REGISTRY.get(selected.type).supportedPresets;
                  return (
                    <label key={key} className="grid gap-1 text-xs">
                      {label}
                      <select
                        value={responsiveLayout[key]}
                        onChange={(event) => setResponsiveLayout((current) => ({ ...current, [key]: event.target.value as LayoutPreset }))}
                      >
                        {presets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}
                      </select>
                    </label>
                  );
                })}
              </fieldset>
              <fieldset className="mb-4 grid gap-2">
                <legend className="text-sm font-medium">Visibility</legend>
                {BREAKPOINTS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={visibility[key]}
                      onChange={(event) => setVisibility((current) => ({ ...current, [key]: event.target.checked }))}
                    />
                    Show on {label}
                  </label>
                ))}
              </fieldset>
              <label className="text-sm font-medium">
                JSON settings
                <textarea className="mt-1 block min-h-64 w-full rounded border px-3 py-2 font-mono text-xs" value={settingsText} onChange={(event) => setSettingsText(event.target.value)} />
              </label>
              <button type="button" className="mt-3 rounded border px-3 py-2 text-sm" onClick={applySettings}>Apply settings</button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a section to edit its validated settings.</p>
          )}
        </section>
      </div>
    </main>
  );
}

export const pages: PluginAdminExports["pages"] = {
  "/": PageComposerPage,
};
