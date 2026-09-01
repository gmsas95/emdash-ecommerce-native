import { emitThemeCss, resolveThemeSettings } from "@emdash-cms/theme-tokens";

export function renderThemeCss(raw: unknown): string {
  return emitThemeCss(resolveThemeSettings(raw));
}
