const storageKey = "ramx-theme";

const themeScript = `
(function () {
  try {
    var item = window.localStorage.getItem("${storageKey}");
    var theme = item ? JSON.parse(item).state.theme : "system";
    var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = theme === "system" ? (systemDark ? "dark" : "light") : theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    document.documentElement.style.colorScheme = resolved;
  } catch (_) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
