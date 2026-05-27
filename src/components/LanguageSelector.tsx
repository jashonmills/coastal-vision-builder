import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/i18n";

interface Props {
  variant?: "header" | "footer" | "drawer";
}

export function LanguageSelector({ variant = "header" }: Props) {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || "en";

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    i18n.changeLanguage(e.target.value);
  }

  const base =
    variant === "footer"
      ? "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/30"
      : variant === "drawer"
        ? "bg-background text-foreground border-border"
        : "bg-transparent text-foreground border-border hover:border-primary/40";

  return (
    <label className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${base}`}>
      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">{t("language")}</span>
      <select
        value={current}
        onChange={onChange}
        className="bg-transparent text-xs outline-none cursor-pointer"
        aria-label={t("language")}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code} className="text-foreground bg-background">
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
