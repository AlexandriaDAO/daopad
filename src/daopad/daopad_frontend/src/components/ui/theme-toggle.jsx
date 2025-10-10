import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './button';

export function ThemeToggle() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Load saved theme with validation
    const saved = localStorage.getItem('theme');
    const validTheme = (saved === 'light' || saved === 'dark') ? saved : 'dark';
    setTheme(validTheme);
    document.documentElement.classList.toggle('dark', validTheme === 'dark');
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
      className="w-9 h-9"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-primary" />
      ) : (
        <Moon className="h-5 w-5 text-primary" />
      )}
    </Button>
  );
}
