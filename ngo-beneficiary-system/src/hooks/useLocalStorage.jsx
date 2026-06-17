import { useEffect, useState } from "react";

export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    } catch (error) {
      console.error("Failed to read localStorage key", key, error);
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to localStorage", key, error);
    }
  }, [key, value]);

  return [value, setValue];
}
