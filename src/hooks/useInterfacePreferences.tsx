import { useState, useEffect } from 'react';

export type ViewType = 'csm' | 'cs-churn' | 'cs-metricas' | 'cs-nps' | 'cs-csat' | 'cs-cancelamento' | 'gestao-cancelamentos' | 'projetos-operacao' | 'gestao-projetos' | 'gestao-contratos' | 'performance' | 'aprovacao' | 'copy' | 'analise-bench' | 'users' | 'profile' | 'preferencias-interface';

export interface InterfacePreferences {
  theme: 'light' | 'dark' | 'system';
  keyboardShortcutsEnabled: boolean;
  defaultPage: ViewType;
  sidebarMenuOrder: {
    cs_submenu: string[]; // ['cs-churn', 'cs-metricas', 'cs-nps', 'cs-csat', 'cs-cancelamento', 'gestao-cancelamentos']
    criacao_submenu: string[]; // ['aprovacao', 'copy', 'analise-bench']
    main_menu: string[]; // ['csm', 'projetos-operacao', 'gestao-projetos', 'gestao-contratos', 'performance']
  };
}

const DEFAULT_PREFERENCES: InterfacePreferences = {
  theme: 'system',
  keyboardShortcutsEnabled: false,
  defaultPage: 'csm',
  sidebarMenuOrder: {
    cs_submenu: ['cs-churn', 'cs-metricas', 'cs-nps', 'cs-csat', 'cs-cancelamento', 'gestao-cancelamentos'],
    criacao_submenu: ['aprovacao', 'copy', 'analise-bench'],
    main_menu: ['csm', 'projetos-operacao', 'gestao-projetos', 'gestao-contratos', 'performance']
  }
};

export const useInterfacePreferences = () => {
  const [preferences, setPreferences] = useState<InterfacePreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    
    const stored = localStorage.getItem('interface-preferences');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Deep merge para garantir que todos os campos existam
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          sidebarMenuOrder: {
            ...DEFAULT_PREFERENCES.sidebarMenuOrder,
            ...(parsed.sidebarMenuOrder || {}),
          }
        };
      } catch {
        return DEFAULT_PREFERENCES;
      }
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    localStorage.setItem('interface-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreference = <K extends keyof InterfacePreferences>(
    key: K,
    value: InterfacePreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.setItem('interface-preferences', JSON.stringify(DEFAULT_PREFERENCES));
  };

  return {
    preferences,
    updatePreference,
    resetPreferences,
    DEFAULT_PREFERENCES
  };
};
