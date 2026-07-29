import { createContext, useContext, useState, useEffect } from "react";
import { getLocalStorage, setLocalStorage } from "../utils";
import { LOCAL_STORAGE_KEYS } from "../constants";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    return getLocalStorage(LOCAL_STORAGE_KEYS.THEME, "light");
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    setLocalStorage(LOCAL_STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";
  const isLight = theme === "light";

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, isLight }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
