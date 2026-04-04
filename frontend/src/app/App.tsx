import { useEffect } from "react";
import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./contexts/AuthContext";

const THEME_STORAGE_KEY = "theme-preference";

export default function App() {
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const savedPreference = localStorage.getItem(THEME_STORAGE_KEY);

    const applyTheme = (mode: "light" | "dark") => {
      root.classList.toggle("dark", mode === "dark");
    };

    if (savedPreference === "light" || savedPreference === "dark") {
      applyTheme(savedPreference);
      return;
    }

    applyTheme(media.matches ? "dark" : "light");

    const handleChange = (event: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      applyTheme(event.matches ? "dark" : "light");
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
