import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export type ShortcutAction = 'search' | 'nav-dashboard' | 'nav-crm' | 'nav-csm';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: ShortcutAction;
}

const shortcuts: KeyboardShortcut[] = [
  { key: 'k', ctrlKey: true, action: 'search' },
  { key: '1', ctrlKey: true, action: 'nav-dashboard' },
  { key: '2', ctrlKey: true, action: 'nav-crm' },
  { key: '3', ctrlKey: true, action: 'nav-csm' },
];

export const useKeyboardShortcuts = (
  enabled: boolean,
  onSearch?: () => void,
  onNavigate?: (view: string) => void
) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = shortcuts.find(
        (s) =>
          s.key === event.key.toLowerCase() &&
          (s.ctrlKey === undefined || s.ctrlKey === (event.ctrlKey || event.metaKey)) &&
          (s.shiftKey === undefined || s.shiftKey === event.shiftKey) &&
          (s.altKey === undefined || s.altKey === event.altKey)
      );

      if (!shortcut) return;

      event.preventDefault();

      switch (shortcut.action) {
        case 'search':
          onSearch?.();
          break;
        case 'nav-dashboard':
          onNavigate?.('dashboard');
          break;
        case 'nav-crm':
          onNavigate?.('crm');
          break;
        case 'nav-csm':
          onNavigate?.('csm');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSearch, onNavigate, navigate]);

  return { shortcuts };
};
