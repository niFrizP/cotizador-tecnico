import { useEffect, useState } from "react";

function getViewportFlags() {
  if (typeof window === "undefined") {
    return { isPortrait: false, isNarrow: false, isCompact: false };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isPortrait = height >= width;

  return {
    isPortrait,
    isNarrow: width <= 1080,
    isCompact: width <= 760 || (isPortrait && width <= 980),
  };
}

const sameFlags = (a, b) =>
  a.isPortrait === b.isPortrait && a.isNarrow === b.isNarrow && a.isCompact === b.isCompact;

export default function useResponsiveLayout() {
  const [layout, setLayout] = useState(getViewportFlags);

  useEffect(() => {
    // Solo re-renderiza cuando cambia un corte, no en cada píxel de resize.
    const updateLayout = () => {
      const next = getViewportFlags();
      setLayout((prev) => (sameFlags(prev, next) ? prev : next));
    };
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  return layout;
}
