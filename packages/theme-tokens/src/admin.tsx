import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import type { PluginAdminExports } from "emdash";
import * as React from "react";
import { DEFAULT_THEME_SETTINGS } from "./defaults.js";
import { FONT_REGISTRY } from "./fonts.js";
import { applyThemePatch } from "./resolve.js";
import { compatibleGoogleFontWeights, themeExecuteInputSchema, themeOperationRegistry, type ThemeExecuteOutput } from "./operation-registry.js";
import { FONT_SUBSETS, type FontId, type ResolvedThemeSettings } from "./schema.js";
const API = "/_emdash/api/plugins/emdash-theme-tokens";
type EditablePath = string;
type Primitive = string | number | boolean | readonly (string | number)[];

async function execute(operation: string, input: unknown): Promise<ThemeExecuteOutput> {
  if (!themeOperationRegistry.some((definition) => definition.id === operation)) throw new Error(`Unknown theme operation: ${operation}`);
  const body = themeExecuteInputSchema.parse({ operation, input });
  const response = await apiFetch(`${API}/tokens/execute`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Theme settings request failed (${response.status})`);
  return parseApiResponse(response) as Promise<ThemeExecuteOutput>;
}
function readPath(settings: ResolvedThemeSettings, path: EditablePath): Primitive | undefined {
  let value: unknown = settings;
  for (const segment of path.split(".")) { if (typeof value !== "object" || value === null) return undefined; value = Reflect.get(value, segment); }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string" || typeof item === "number")) return value;
  return undefined;
}
function stringifyValue(value: Primitive | undefined): string { return Array.isArray(value) ? value.join(", ") : String(value ?? ""); }

function SelectField({ label, value, options, onChange, disabled = false }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void; disabled?: boolean }) {
  return <label style={{ display: "grid", gap: "0.35rem" }}><span>{label}</span><select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>;
}
function TextField({ label, value, onChange, onBlur, disabled = false }: { label: string; value: string; onChange: (value: string) => void; onBlur?: () => void; disabled?: boolean }) {
  return <label style={{ display: "grid", gap: "0.35rem" }}><span>{label}</span><input disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} /></label>;
}
function ToggleField({ label, value, onChange, disabled = false }: { label: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><input disabled={disabled} type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} /><span>{label}</span></label>;
}
function Group({ title, children, disabled = false }: { title: string; children: React.ReactNode; disabled?: boolean }) { return <fieldset disabled={disabled} style={{ display: "grid", gap: "0.75rem", padding: "1rem" }}><legend>{title}</legend>{children}</fieldset>; }

function ThemeSettingsPage() {
  const [settings, setSettings] = React.useState<ResolvedThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setLoaded(false); setError(null);
    try { const result = await execute("theme.settings.get", {}); if (result.operation !== "theme.settings.get") throw new Error("Unexpected theme settings response"); setSettings(result.settings); setDraft({}); setLoaded(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load theme settings."); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  function parseDraft(path: string, raw: string): Primitive {
    if (path.endsWith(".weight")) return Number(raw);
    if (path.endsWith(".weights")) return raw.split(",").map((part) => Number(part.trim()));
    if (path.endsWith(".subsets")) return raw.split(",").map((part) => part.trim()).filter(Boolean);
    return raw;
  }
  function commit(path: string, raw = draft[path]): void {
    if (raw === undefined) return;
    try { const result = applyThemePatch(settings, { [path]: parseDraft(path, raw) }); setSettings(result.settings); setDraft((current) => { const next = { ...current }; delete next[path]; return next; }); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid theme setting."); }
  }
  function edit(path: string, value: string): void { setDraft((current) => ({ ...current, [path]: value })); setMessage(null); }
  function select(path: string, value: Primitive): void {
    setDraft((current) => ({ ...current, [path]: stringifyValue(value) }));
    try {
      const result = applyThemePatch(settings, { [path]: value });
      setSettings(result.settings);
      setDraft((current) => { const next = { ...current }; delete next[path]; return next; });
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid theme setting."); }
  }
  function selectGoogleFamily(nextFamily: string): void {
    const currentWeights = readPath(settings, "typography.google.weights");
    const weights = Array.isArray(currentWeights) ? currentWeights.filter((weight): weight is number => typeof weight === "number") : [];
    try {
      const result = applyThemePatch(settings, {
        "typography.google.family": nextFamily,
        "typography.google.weights": compatibleGoogleFontWeights(nextFamily as FontId, weights),
      });
      setSettings(result.settings);
      setDraft((current) => { const next = { ...current }; delete next["typography.google.family"]; delete next["typography.google.weights"]; return next; });
      setError(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid Google font selection."); }
  }
  function value(path: string): string { return draft[path] ?? stringifyValue(readPath(settings, path)); }
  function bool(path: string): boolean { return readPath(settings, path) === true; }

  async function save(): Promise<void> {
    if (!loaded) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      let candidate = settings;
      for (const [path, raw] of Object.entries(draft)) candidate = applyThemePatch(candidate, { [path]: parseDraft(path, raw) }).settings;
      const patch: Record<string, unknown> = {};
      const flatten = (item: unknown, prefix: string): void => { if (typeof item !== "object" || item === null || Array.isArray(item)) { if (prefix !== "version") patch[prefix.replace(/^tokens\./, "")] = item; return; } for (const [key, nested] of Object.entries(item)) flatten(nested, prefix ? `${prefix}.${key}` : key); };
      flatten(candidate, "");
      const result = await execute("theme.settings.update", { patch });
      if (result.operation !== "theme.settings.update") throw new Error("Unexpected theme settings response");
      setSettings(result.settings); setDraft({}); setMessage(`Saved ${result.changes.length} normalized changes.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save theme settings."); }
    finally { setSaving(false); }
  }
  async function reset(): Promise<void> {
    if (!loaded) return;
    setSaving(true); setError(null); setMessage(null);
    try { const result = await execute("theme.settings.reset", {}); if (result.operation !== "theme.settings.reset") throw new Error("Unexpected theme reset response"); setSettings(result.settings); setDraft({}); setMessage(`Reset ${result.changes.length} normalized changes.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not reset theme settings."); }
    finally { setSaving(false); }
  }

  const disabled = !loaded || saving;
  const fontIds = FONT_REGISTRY.map((font) => font.id);
  const googleFonts = FONT_REGISTRY.filter((font) => font.provider === "google");
  const googleFamily = value("typography.google.family");
  const googleRecord = googleFonts.find((font) => font.id === googleFamily) ?? googleFonts[0];
  const selectedSubsets = readPath(settings, "typography.google.subsets");
  const subsets = Array.isArray(selectedSubsets) ? selectedSubsets.map(String) : ["latin"];
  const roleNames = ["display", "heading", "body", "ui"] as const;
  const availableSubsets = googleRecord?.subsets ?? FONT_SUBSETS;
  const token = (path: string) => value(`tokens.${path}`);
  const typography = (path: string) => value(`typography.${path}`);
  const text = (path: string, label: string) => <TextField label={label} value={value(path)} onChange={(next) => edit(path, next)} onBlur={() => commit(path)} disabled={disabled} />;

  if (loading) return <main><h1>Theme Settings</h1><p>Loading settings…</p></main>;
  if (!loaded) return <main><h1>Theme Settings</h1><p role="alert">{error ?? "Theme settings could not be loaded."}</p><button type="button" onClick={() => void load()}>Retry</button></main>;
  return <main style={{ display: "grid", gap: "1rem", maxWidth: "60rem" }}>
    <header><h1>Theme Settings</h1><p>Validated design tokens shared by the storefront and MCP tools.</p></header>
    <Group title="Google Fonts delivery" disabled={disabled}><SelectField label="Family" value={googleFamily} options={googleFonts.map((font) => font.id)} onChange={selectGoogleFamily} disabled={disabled} />{text("typography.google.weights", `Weights (${googleRecord?.displayName ?? "font"}, comma separated)`)}<div><span>Subsets</span>{availableSubsets.map((subset) => <label key={subset} style={{ marginInlineStart: "0.75rem" }}><input type="checkbox" checked={subsets.includes(subset)} onChange={(event) => select("typography.google.subsets", event.target.checked ? [...new Set([...subsets, subset])] : subsets.filter((item) => item !== subset))} disabled={disabled} /> {subset}</label>)}</div><SelectField label="Delivery" value={typography("google.delivery")} options={["preview", "self-hosted"]} onChange={(next) => select("typography.google.delivery", next)} disabled={disabled} /></Group>
    <Group title="Color" disabled={disabled}>{(["brand", "brandHover", "accent", "text", "muted", "surface", "surfaceAlt", "border", "success", "danger"] as const).map((name) => text(`tokens.color.${name}`, name))}</Group>
    <Group title="Typography" disabled={disabled}>{roleNames.map((role) => <React.Fragment key={role}><SelectField label={`${role} font`} value={typography(`${role}.font`)} options={fontIds} onChange={(next) => select(`typography.${role}.font`, next)} disabled={disabled} /><TextField label={`${role} weight`} value={typography(`${role}.weight`)} onChange={(next) => edit(`typography.${role}.weight`, next)} onBlur={() => commit(`typography.${role}.weight`)} disabled={disabled} /><SelectField label={`${role} style`} value={typography(`${role}.style`)} options={["normal", "italic"]} onChange={(next) => select(`typography.${role}.style`, next)} disabled={disabled} /></React.Fragment>)}<SelectField label="Type scale" value={typography("scale")} options={["compact", "comfortable", "spacious"]} onChange={(next) => select("typography.scale", next)} disabled={disabled} />{text("typography.bodyLineHeight", "Body line height")}{text("typography.headingTracking", "Heading tracking")}</Group>
    <Group title="Layout" disabled={disabled}>{([ ["contentWidth", "Content width"], ["narrowWidth", "Narrow width"], ["sectionSpacing", "Section spacing"], ["gridGap", "Grid gap"], ["componentSpacing", "Component spacing"] ] as const).map(([name, label]) => text(`tokens.layout.${name}`, label))}</Group>
    <Group title="Shape and elevation" disabled={disabled}>{([ ["radiusSmall", "Small radius"], ["radiusMedium", "Medium radius"], ["radiusLarge", "Large radius"] ] as const).map(([name, label]) => text(`tokens.shape.${name}`, label))}<SelectField label="Card shadow" value={token("elevation.card")} options={["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"]} onChange={(next) => select("tokens.elevation.card", next)} disabled={disabled} /><SelectField label="Floating shadow" value={token("elevation.floating")} options={["none", "0 5px 16px rgba(32,41,52,0.06)", "0 16px 40px rgba(32,41,52,0.12)"]} onChange={(next) => select("tokens.elevation.floating", next)} disabled={disabled} /></Group>
    <Group title="Motion" disabled={disabled}><ToggleField label="Enable motion" value={bool("motion.enabled")} onChange={(next) => select("motion.enabled", next)} disabled={disabled} /><SelectField label="Intensity" value={value("motion.intensity")} options={["none", "subtle", "expressive"]} onChange={(next) => select("motion.intensity", next)} disabled={disabled} /><SelectField label="Hover" value={value("motion.hover")} options={["none", "lift", "soft-scale"]} onChange={(next) => select("motion.hover", next)} disabled={disabled} /><SelectField label="Reveal" value={value("motion.reveal")} options={["none", "fade", "fade-up"]} onChange={(next) => select("motion.reveal", next)} disabled={disabled} /><SelectField label="Duration" value={value("motion.durationScale")} options={["instant", "fast", "standard", "slow"]} onChange={(next) => select("motion.durationScale", next)} disabled={disabled} /><SelectField label="Easing" value={value("motion.easing")} options={["standard", "snappy", "smooth"]} onChange={(next) => select("motion.easing", next)} disabled={disabled} /></Group>
    <Group title="Variants" disabled={disabled}><SelectField label="Header" value={value("variants.header")} options={["standard", "compact"]} onChange={(next) => select("variants.header", next)} disabled={disabled} /><SelectField label="Hero" value={value("variants.hero")} options={["split", "centered", "minimal"]} onChange={(next) => select("variants.hero", next)} disabled={disabled} /><SelectField label="Button" value={value("variants.button")} options={["solid", "outline", "soft"]} onChange={(next) => select("variants.button", next)} disabled={disabled} /><SelectField label="Card" value={value("variants.card")} options={["elevated", "flat", "bordered"]} onChange={(next) => select("variants.card", next)} disabled={disabled} /><SelectField label="Footer" value={value("variants.footer")} options={["standard", "minimal"]} onChange={(next) => select("variants.footer", next)} disabled={disabled} /></Group>
    <footer style={{ display: "flex", gap: "0.75rem" }}><button type="button" onClick={() => void save()} disabled={disabled}>Save settings</button><button type="button" onClick={() => void reset()} disabled={disabled}>Reset defaults</button></footer>
  </main>;
}
export const pages: PluginAdminExports["pages"] = { "/": ThemeSettingsPage };
export { ThemeSettingsPage };
