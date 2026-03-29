"use client";

import { ThemeName } from "@/lib/types";
import { useAppStore } from "@/providers/app-store";

const themes: Array<{
  key: ThemeName;
  title: string;
  subtitle: string;
  swatchClass: string;
}> = [
  {
    key: "midnight",
    title: "Midnight Signal",
    subtitle: "Deep navy with restrained blue accents for the default dark mode.",
    swatchClass: "theme-midnight",
  },
  {
    key: "light",
    title: "Clean Daylight",
    subtitle: "Soft off-white surfaces, slate text, and a single sharp blue accent.",
    swatchClass: "theme-light",
  },
  {
    key: "grove",
    title: "Grove Terminal",
    subtitle: "Forest slate palette with mint and gold contrast.",
    swatchClass: "theme-grove",
  },
];

export function ThemePicker() {
  const { state, setTheme } = useAppStore();

  return (
    <div className="theme-grid">
      {themes.map((theme) => (
        <button
          key={theme.key}
          className={`theme-option${state.theme === theme.key ? " is-selected" : ""}`}
          type="button"
          onClick={() => setTheme(theme.key)}
        >
          <span className={`theme-swatch ${theme.swatchClass}`}></span>
          <strong>{theme.title}</strong>
          <small>{theme.subtitle}</small>
        </button>
      ))}
    </div>
  );
}
