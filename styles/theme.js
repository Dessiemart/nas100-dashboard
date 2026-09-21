/**
 * Shared design tokens - "black velvet with violet neon". Pure black
 * canvas, hairline graphite borders, a tight violet accent reserved
 * for status/data/links (never on primary buttons, per spec), a serif
 * display face for headlines, and a monospace face carrying data/code
 * identity throughout.
 *
 * NOTE: Domaine and Commit Mono (the original reference fonts) are
 * paid/licensed fonts, not freely available. Substituted here with
 * Fraunces (a similarly elegant, high-contrast serif) and JetBrains
 * Mono (free, geometric, same spirit as Commit Mono) - both loaded via
 * Google Fonts in pages/_app.js.
 */

export const theme = {
  color: {
    bg: "#000000",
    bgElevated: "#0d0d0d",
    border: "#1f1f1f",
    borderStrong: "#2a2a2a",
    text: "#f5f5f5",
    textMuted: "#8a8a8a",
    textFaint: "#555555",
    violet: "#9281f7",
    violetDim: "rgba(146, 129, 247, 0.14)",
    success: "#22c55e",
    danger: "#ef4444",
    warning: "#eab308",
  },
  font: {
    serif: '"Fraunces", Georgia, serif',
    sans: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  radius: {
    sm: 6,
    lg: 16,
  },
};
