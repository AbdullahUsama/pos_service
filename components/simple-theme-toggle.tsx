"use client";

import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const SimpleThemeToggle = () => {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const ICON_SIZE = 16;

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleTheme}
      className="h-8 w-8 p-0 border-2 dark:border-[3px]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun
          size={ICON_SIZE}
          className="text-foreground"
        />
      ) : (
        <Moon
          size={ICON_SIZE}
          className="text-foreground"
        />
      )}
    </Button>
  );
};

export { SimpleThemeToggle };