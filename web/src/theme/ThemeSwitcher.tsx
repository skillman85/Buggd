import { useTheme } from "./ThemeProvider";
import { themes } from "./preferences";
import { useId } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const group = useId();
  return (
    <fieldset className="theme-switcher">
      <legend className="sr-only">Colour theme</legend>
      {themes.map((option) => (
        <label key={option}>
          <input
            type="radio"
            name={`theme-${group}`}
            value={option}
            checked={theme === option}
            onChange={() => setTheme(option)}
          />
          <span>{option[0].toUpperCase() + option.slice(1)}</span>
        </label>
      ))}
    </fieldset>
  );
}
