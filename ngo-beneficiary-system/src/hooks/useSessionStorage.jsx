import { useEffect, useState } from "react";

export function useSessionStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    } catch (error) {
      console.error("Failed to read sessionStorage key", key, error);
      return typeof defaultValue === "function" ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Failed to save to sessionStorage", key, error);
    }
  }, [key, value]);

  return [value, setValue];
}
