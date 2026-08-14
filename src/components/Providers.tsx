"use client";

import { MockDataProvider, useMockStore } from "@/lib/mock/mockStore";
import { useEffect, type ReactNode } from "react";

function ThemeSync({ children }: { children: ReactNode }) {
  const { theme } = useMockStore();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.dataset.theme = theme;
  }, [theme]);

  return children;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MockDataProvider>
      <ThemeSync>{children}</ThemeSync>
    </MockDataProvider>
  );
}
