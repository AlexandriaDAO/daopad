import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

const VALID_THEMES = ['light', 'dark'];
const DEFAULT_THEME = 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState(DEFAULT_THEME);

  useEffect(() => {
    // Load and validate saved theme
    const saved = localStorage.getItem('theme');
    const validatedTheme = VALID_THEMES.includes(saved) ? saved : DEFAULT_THEME;

    setTheme(validatedTheme);
    document.documentElement.classList.toggle('dark', validatedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="w-9 h-9"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-executive-gold" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5 text-executive-gold" aria-hidden="true" />
      )}
    </Button>
  );
}
