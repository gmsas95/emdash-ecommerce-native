import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import type { PluginAdminExports } from "emdash";
import * as React from "react";

import { DEFAULT_THEME_SETTINGS } from "./defaults.js";
import { themeExecuteInputSchema, themeOperationRegistry, type ThemeExecuteOutput } from "./plugin.js";
import { FONT_REGISTRY } from "./fonts.js";
import { applyThemePatch } from "./resolve.js";
import type { ResolvedThemeSettings } from "./schema.js";

const API = "/_emdash/api/plugins/emdash-theme-tokens";

type EditablePath = string;
type Primitive = string | number | boolean | readonly (string | number)[];

async function execute(operation: string, input: unknown): Promise<ThemeExecuteOutput> {
  const operationIsKnown = themeOperationRegistry.some((definition) => definition.id === operation);
  if (!operationIsKnown) throw new Error(`Unknown theme operation: ${operation}`);
  const body = themeExecuteInputSchema.parse({ operation, input });
  const response = await apiFetch(`${API}/tokens/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Theme settings request failed (${response.status})`);
  return parseApiResponse(response) as Promise<ThemeExecuteOutput>;
}

function readPath(settings: ResolvedThemeSettings, path: EditablePath): Primitive | undefined {
  let value: unknown = settings;
  for (const segment of path.split(".")) {
    if (typeof value !== "object" || value === null) return undefined;
    value = Reflect.get(value, segment);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number")) return value;
  return undefined;
}
function SelectField({
  label,
  path,
  value,
  options,
  onChange,
}: {
  label: string;
  path: EditablePath;
  value: Primitive | undefined;
  options: readonly string[];
  onChange: (path: EditablePath, value: Primitive) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span>{label}</span>
      <select value={String(value ?? "")} onChange={(event) => onChange(path, event.target.value)}>
        {options.map((option) => <option value={option} key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextField({
  label,
  path,
  value,
  onChange,
}: {
  label: string;
  path: EditablePath;
  value: Primitive | undefined;
  onChange: (path: EditablePath, value: Primitive) => void;
}) {
  return (
    <label style={{ display: "grid", gap: "0.35rem" }}>
      <span>{label}</span>
      <input value={String(value ?? "")} onChange={(event) => onChange(path, event.target.value)} />
    </label>
  );
}

function ToggleField({
  label,
  path,
  value,
  onChange,
}: {
  label: string;
  path: EditablePath;
  value: Primitive | undefined;
  onChange: (path: EditablePath, value: Primitive) => void;
}) {
  return (
    <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <input type="checkbox" checked={value === true} onChange={(event) => onChange(path, event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ display: "grid", gap: "0.75rem", padding: "1rem" }}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}

function ThemeSettingsPage() {
  const [settings, setSettings] = React.useState<ResolvedThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await execute("theme.settings.get", {});
      if (!result.settings) throw new Error("Theme settings response was incomplete");
      setSettings(result.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load theme settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { void load(); }, [load]);

  function change(path: EditablePath, value: Primitive): void {
    try {
      const result = applyThemePatch(settings, { [path]: value });
      setSettings(result.settings);
      setError(null);
      setMessage(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid theme setting.");
    }
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const patch: Record<string, unknown> = {};
      const flatten = (value: unknown, prefix: string): void => {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          if (prefix !== "version") patch[prefix.replace(/^tokens\./, "")] = value;
          return;
        }
        for (const [key, nested] of Object.entries(value)) flatten(nested, prefix ? `${prefix}.${key}` : key);
      };
      flatten(settings, "");
      const result = await execute("theme.settings.update", { patch });
      if (result.settings) setSettings(result.settings);
      setMessage(`Saved ${result.changes.length} normalized changes.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save theme settings.");
    } finally {
      setSaving(false);
    }
  }

  async function reset(): Promise<void> {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await execute("theme.settings.reset", {});
      if (!result.settings) throw new Error("Theme reset response was incomplete");
      setSettings(result.settings);
      setMessage(`Reset ${result.changes.length} normalized changes.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset theme settings.");
    } finally {
      setSaving(false);
    }
  }

  const fontIds = FONT_REGISTRY.map((font) => font.id);
  const colorPaths = ["brand", "brandHover", "accent", "text", "muted", "surface", "surfaceAlt", "border", "success", "danger"] as const;
  const roleNames = ["display", "heading", "body", "ui"] as const;
  const token = (path: string) => readPath(settings, `tokens.${path}`);
  const typography = (path: string) => readPath(settings, `typography.${path}`);

  if (loading) return <main><h1>Theme Settings</h1><p>Loading settings…</p></main>;
  return (
    <main style={{ display: "grid", gap: "1rem", maxWidth: "60rem" }}>
      <header>
        <h1>Theme Settings</h1>
        <p>Validated design tokens shared by the storefront and MCP tools.</p>
      </header>
      {error && <p role="alert" style={{ color: "crimson" }}>{error}</p>}
      {message && <p role="status">{message}</p>}
      <Group title="Color">
        {colorPaths.map((name) => <TextField key={name} label={name} path={`tokens.color.${name}`} value={token(`color.${name}`)} onChange={change} />)}
      </Group>
      <Group title="Typography">
        {roleNames.map((role) => (
          <React.Fragment key={role}>
            <SelectField label={`${role} font`} path={`typography.${role}.font`} value={typography(`${role}.font`)} options={fontIds} onChange={change} />
            <TextField label={`${role} weight`} path={`typography.${role}.weight`} value={typography(`${role}.weight`)} onChange={(path, value) => change(path, Number(value))} />
          </React.Fragment>
        ))}
        <SelectField label="Type scale" path="typography.scale" value={typography("scale")} options={["compact", "comfortable", "spacious"]} onChange={change} />
        <TextField label="Body line height" path="typography.bodyLineHeight" value={typography("bodyLineHeight")} onChange={change} />
        <TextField label="Heading tracking" path="typography.headingTracking" value={typography("headingTracking")} onChange={change} />
      </Group>
      <Group title="Google Fonts delivery">
        <TextField label="Weights (comma separated)" path="typography.google.weights" value={typography("google.weights")} onChange={(path, value) => change(path, String(value).split(",").map((weight) => Number(weight.trim())))} />
        <SelectField label="Delivery" path="typography.google.delivery" value={typography("google.delivery")} options={["preview", "self-hosted"]} onChange={change} />
      </Group>
      <Group title="Layout">
        {([["contentWidth", "Content width"], ["narrowWidth", "Narrow width"], ["sectionSpacing", "Section spacing"], ["gridGap", "Grid gap"], ["componentSpacing", "Component spacing"]] as const).map(([name, label]) => <TextField key={name} label={label} path={`tokens.layout.${name}`} value={token(`layout.${name}`)} onChange={change} />)}
</Group>
      <Group title="Shape and elevation">
        {([["radiusSmall", "Small radius"], ["radiusMedium", "Medium radius"], ["radiusLarge", "Large radius"]] as const).map(([name, label]) => <TextField key={name} label={label} path={`tokens.shape.${name}`} value={token(`shape.${name}`)} onChange={change} />)}
        <SelectField label="Card shadow" path="tokens.elevation.card" value={token("elevation.card")} options={["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"]} onChange={change} />
        <SelectField label="Floating shadow" path="tokens.elevation.floating" value={token("elevation.floating")} options={["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"]} onChange={change} />
      </Group>
      <Group title="Motion">
        <ToggleField label="Enable motion" path="motion.enabled" value={readPath(settings, "motion.enabled")} onChange={change} />
        <SelectField label="Intensity" path="motion.intensity" value={readPath(settings, "motion.intensity")} options={["none", "subtle", "expressive"]} onChange={change} />
        <SelectField label="Hover" path="motion.hover" value={readPath(settings, "motion.hover")} options={["none", "lift", "soft-scale"]} onChange={change} />
        <SelectField label="Reveal" path="motion.reveal" value={readPath(settings, "motion.reveal")} options={["none", "fade", "fade-up"]} onChange={change} />
        <SelectField label="Duration" path="motion.durationScale" value={readPath(settings, "motion.durationScale")} options={["instant", "fast", "standard", "slow"]} onChange={change} />
        <SelectField label="Easing" path="motion.easing" value={readPath(settings, "motion.easing")} options={["standard", "snappy", "smooth"]} onChange={change} />
      </Group>
      <Group title="Variants">
        <SelectField label="Header" path="variants.header" value={readPath(settings, "variants.header")} options={["standard", "compact"]} onChange={change} />
        <SelectField label="Hero" path="variants.hero" value={readPath(settings, "variants.hero")} options={["split", "centered", "minimal"]} onChange={change} />
        <SelectField label="Button" path="variants.button" value={readPath(settings, "variants.button")} options={["solid", "outline", "soft"]} onChange={change} />
        <SelectField label="Card" path="variants.card" value={readPath(settings, "variants.card")} options={["elevated", "flat", "bordered"]} onChange={change} />
        <SelectField label="Footer" path="variants.footer" value={readPath(settings, "variants.footer")} options={["standard", "minimal"]} onChange={change} />
      </Group>
      <footer style={{ display: "flex", gap: "0.75rem" }}>
        <button type="button" onClick={() => void save()} disabled={saving}>Save settings</button>
        <button type="button" onClick={() => void reset()} disabled={saving}>Reset defaults</button>
      </footer>
    </main>
  );
}

export const pages: PluginAdminExports["pages"] = { "/": ThemeSettingsPage };
export { ThemeSettingsPage };
