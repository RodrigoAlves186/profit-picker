import en from "./locales/en.json" with { type: "json" };
import ptBR from "./locales/pt-BR.json" with { type: "json" };

const LOCALES = { en, "pt-BR": ptBR };

function pickLocale(acceptLanguage) {
  if (!acceptLanguage) return "en";
  const lower = acceptLanguage.toLowerCase();
  if (lower.includes("pt-br") || lower.includes("pt_br") || lower.startsWith("pt")) {
    return "pt-BR";
  }
  return "en";
}

function get(obj, path) {
  return path.split(".").reduce((acc, k) => (acc && acc[k] !== undefined ? acc[k] : undefined), obj);
}

function interpolate(str, vars) {
  if (typeof str !== "string" || !vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

export function getI18n(request) {
  const url = new URL(request.url);
  const localeParam = url.searchParams.get("locale");
  const accept = request.headers.get("accept-language") || "";
  const locale = (localeParam && LOCALES[localeParam]) ? localeParam : pickLocale(accept);
  const dict = LOCALES[locale] || LOCALES.en;

  const t = (key, vars) => {
    const value = get(dict, key);
    if (value === undefined) return key;
    if (typeof value === "string") return interpolate(value, vars);
    return value;
  };

  return { locale, t, dict };
}