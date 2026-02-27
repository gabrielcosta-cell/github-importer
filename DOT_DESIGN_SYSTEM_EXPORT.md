# 🎨 DOT Design System - Pacote de Exportação Completo

## 📋 Índice
1. [Paleta de Cores](#paleta-de-cores)
2. [Tipografia](#tipografia)
3. [Tokens de Design](#tokens-de-design)
4. [Configuração Tailwind](#configuração-tailwind)
5. [CSS Completo](#css-completo)
6. [Componentes UI](#componentes-ui)
7. [Componentes Customizados](#componentes-customizados)
8. [Theme Provider](#theme-provider)
9. [Assets e Imagens](#assets-e-imagens)
10. [Instruções de Implementação](#instruções-de-implementação)

---

## 🎨 Paleta de Cores

### Cores Principais (Brand Colors)
```css
/* Light Mode */
--primary: 0 75% 55%;              /* Vermelho DOT RGB(220, 55, 55) */
--primary-foreground: 0 0% 100%;
--primary-glow: 0 75% 70%;

--secondary: 227 47% 15%;          /* Azul Escuro RGB(21, 28, 58) */
--secondary-foreground: 0 0% 100%;

/* Dark Mode */
--primary: 0 75% 55%;              /* Vermelho DOT (mesma cor) */
--secondary: 227 47% 20%;          /* Azul Escuro mais claro */
```

### Cores de Sistema
```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 225 15% 20%;
--card: 0 0% 100%;
--card-foreground: 225 15% 20%;
--popover: 0 0% 100%;
--popover-foreground: 225 15% 20%;
--muted: 220 13% 96%;
--muted-foreground: 215 25% 50%;
--accent: 220 13% 96%;
--accent-foreground: 225 15% 20%;
--destructive: 0 84% 60%;
--destructive-foreground: 0 0% 100%;
--border: 220 13% 91%;
--input: 220 13% 91%;
--ring: 0 75% 55%;

/* Dark Mode */
--background: 225 25% 8%;
--foreground: 0 0% 98%;
--card: 225 25% 10%;
--card-foreground: 0 0% 98%;
--popover: 225 25% 10%;
--popover-foreground: 0 0% 98%;
--muted: 225 25% 15%;
--muted-foreground: 215 15% 65%;
--accent: 225 25% 15%;
--accent-foreground: 0 0% 98%;
--destructive: 0 75% 55%;
--destructive-foreground: 0 0% 100%;
--border: 225 25% 18%;
--input: 225 25% 18%;
--ring: 0 75% 55%;
```

### Cores do Sidebar
```css
/* Light Mode */
--sidebar-background: 227 45% 15%;      /* #151C38 */
--sidebar-foreground: 0 0% 98%;
--sidebar-primary: 0 75% 55%;           /* Vermelho DOT */
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 227 45% 20%;
--sidebar-accent-foreground: 0 0% 98%;
--sidebar-border: 227 45% 20%;
--sidebar-ring: 0 75% 55%;

/* Dark Mode */
--sidebar-background: 227 22% 8%;       /* #101219 */
--sidebar-foreground: 0 0% 98%;
--sidebar-primary: 0 75% 55%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 227 22% 12%;
--sidebar-accent-foreground: 0 0% 98%;
--sidebar-border: 227 22% 15%;
--sidebar-ring: 0 75% 55%;
```

---

## 📝 Tipografia

### Fonte Principal
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");
```

### Escala Tipográfica Fluida
```css
--text-xs: clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
--text-base: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
--text-lg: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
--text-xl: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
--text-2xl: clamp(1.25rem, 1rem + 1.2vw, 1.75rem);
--text-3xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
--text-4xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);
```

### Classes Utilitárias
```css
.text-fluid-xs { font-size: var(--text-xs); }
.text-fluid-sm { font-size: var(--text-sm); }
.text-fluid-base { font-size: var(--text-base); }
.text-fluid-lg { font-size: var(--text-lg); }
.text-fluid-xl { font-size: var(--text-xl); }
.text-fluid-2xl { font-size: var(--text-2xl); }
.text-fluid-3xl { font-size: var(--text-3xl); }
.text-fluid-4xl { font-size: var(--text-4xl); }
```

---

## 🔧 Tokens de Design

### Espaçamento
```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
```

### Container
```css
--container-max-width: 1240px;
--container-padding-mobile: 1rem;
--container-padding-desktop: 1.5rem;
```

### Gradientes
```css
--gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
--gradient-secondary: linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)));
--gradient-hero: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
```

### Sombras
```css
/* Light Mode */
--shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.2);
--shadow-card: 0 4px 20px -4px hsl(220 13% 80% / 0.4);

/* Dark Mode */
--shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
--shadow-card: 0 4px 20px -4px hsl(0 0% 0% / 0.4);
```

### Transições
```css
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

### Border Radius
```css
--radius: 0.5rem;
```

---

## ⚙️ Configuração Tailwind

### tailwind.config.ts
```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1rem", 
        md: "1.5rem",
        lg: "1.5rem",
        xl: "1.5rem",
        "2xl": "1.5rem",
      },
      screens: {
        xs: "360px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    screens: {
      xs: "360px",
      sm: "640px",
      md: "768px", 
      lg: "1024px",
      xl: "1280px",
      "2xl": "1440px",
    },
    extend: {
      spacing: {
        'safe-top': 'max(1rem, env(safe-area-inset-top))',
        'safe-bottom': 'max(1rem, env(safe-area-inset-bottom))',
        'safe-left': 'max(1rem, env(safe-area-inset-left))',
        'safe-right': 'max(1rem, env(safe-area-inset-right))',
      },
      maxWidth: {
        'container': 'var(--container-max-width)',
      },
      fontSize: {
        'fluid-xs': 'var(--text-xs)',
        'fluid-sm': 'var(--text-sm)',
        'fluid-base': 'var(--text-base)',
        'fluid-lg': 'var(--text-lg)',
        'fluid-xl': 'var(--text-xl)',
        'fluid-2xl': 'var(--text-2xl)',
        'fluid-3xl': 'var(--text-3xl)',
        'fluid-4xl': 'var(--text-4xl)',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(0.98)' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🎨 CSS Completo

### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");

/* Definition of the design system. All colors, gradients, fonts, etc should be defined here. 
All colors MUST be HSL.
*/

@layer base {
  :root {
    /* Container and spacing system */
    --container-max-width: 1240px;
    --container-padding-mobile: 1rem;
    --container-padding-desktop: 1.5rem;
    
    /* Fluid spacing scale (rem) */
    --space-1: 0.25rem;   /* 4px */
    --space-2: 0.5rem;    /* 8px */
    --space-3: 0.75rem;   /* 12px */
    --space-4: 1rem;      /* 16px */
    --space-6: 1.5rem;    /* 24px */
    --space-8: 2rem;      /* 32px */
    --space-12: 3rem;     /* 48px */
    
    /* Safe area insets for mobile */
    --safe-area-inset-top: env(safe-area-inset-top);
    --safe-area-inset-right: env(safe-area-inset-right);
    --safe-area-inset-bottom: env(safe-area-inset-bottom);
    --safe-area-inset-left: env(safe-area-inset-left);
    
    /* Fluid typography scale */
    --text-xs: clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem);
    --text-sm: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
    --text-base: clamp(0.875rem, 0.8rem + 0.4vw, 1rem);
    --text-lg: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
    --text-xl: clamp(1.125rem, 1rem + 0.625vw, 1.25rem);
    --text-2xl: clamp(1.25rem, 1rem + 1.2vw, 1.75rem);
    --text-3xl: clamp(1.5rem, 1.2rem + 1.5vw, 2rem);
    --text-4xl: clamp(1.875rem, 1.5rem + 1.875vw, 2.5rem);

    --background: 0 0% 100%;
    --foreground: 225 15% 20%;

    --card: 0 0% 100%;
    --card-foreground: 225 15% 20%;

    --popover: 0 0% 100%;
    --popover-foreground: 225 15% 20%;

    /* DOT Brand Colors */
    --primary: 0 75% 55%; /* Vermelho DOT RGB(220, 55, 55) */
    --primary-foreground: 0 0% 100%;
    --primary-glow: 0 75% 70%;

    --secondary: 227 47% 15%; /* Azul Escuro RGB(21, 28, 58) */
    --secondary-foreground: 0 0% 100%;

    --muted: 220 13% 96%;
    --muted-foreground: 215 25% 50%;

    --accent: 220 13% 96%;
    --accent-foreground: 225 15% 20%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 13% 91%;
    --input: 220 13% 91%;
    --ring: 0 75% 55%;

    /* Custom DOT Design Tokens */
    --gradient-primary: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
    --gradient-secondary: linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--primary)));
    --gradient-hero: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)));
    --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.2);
    --shadow-card: 0 4px 20px -4px hsl(220 13% 80% / 0.4);
    --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    --radius: 0.5rem;

    /* Sidebar tema claro */
    --sidebar-background: 227 45% 15%; /* #151C38 */
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 0 75% 55%; /* Vermelho DOT */
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 227 45% 20%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 227 45% 20%;
    --sidebar-ring: 0 75% 55%;
  }

  .dark {
    --background: 225 25% 8%;
    --foreground: 0 0% 98%;

    --card: 225 25% 10%;
    --card-foreground: 0 0% 98%;

    --popover: 225 25% 10%;
    --popover-foreground: 0 0% 98%;

    /* DOT Brand Colors - Dark Mode */
    --primary: 0 75% 55%; /* Vermelho DOT RGB(220, 55, 55) */
    --primary-foreground: 0 0% 100%;
    --primary-glow: 0 75% 70%;

    --secondary: 227 47% 20%; /* Azul Escuro mais claro para dark mode */
    --secondary-foreground: 0 0% 100%;

    --muted: 225 25% 15%;
    --muted-foreground: 215 15% 65%;

    --accent: 225 25% 15%;
    --accent-foreground: 0 0% 98%;

    --destructive: 0 75% 55%;
    --destructive-foreground: 0 0% 100%;

    --border: 225 25% 18%;
    --input: 225 25% 18%;
    --ring: 0 75% 55%;

    /* Dark Mode Shadows */
    --shadow-elegant: 0 10px 30px -10px hsl(var(--primary) / 0.3);
    --shadow-card: 0 4px 20px -4px hsl(0 0% 0% / 0.4);
    
    /* Sidebar tema escuro */
    --sidebar-background: 227 22% 8%; /* #101219 */
    --sidebar-foreground: 0 0% 98%;
    --sidebar-primary: 0 75% 55%; /* Vermelho DOT */
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 227 22% 12%;
    --sidebar-accent-foreground: 0 0% 98%;
    --sidebar-border: 227 22% 15%;
    --sidebar-ring: 0 75% 55%;
  }
}

@layer base {
  html {
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    font-size: var(--text-base);
    /* Safe area padding for mobile devices */
    padding-left: max(var(--container-padding-mobile), var(--safe-area-inset-left));
    padding-right: max(var(--container-padding-mobile), var(--safe-area-inset-right));
    padding-top: max(0px, var(--safe-area-inset-top));
    padding-bottom: max(0px, var(--safe-area-inset-bottom));
  }

  @media (min-width: 768px) {
    body {
      padding-left: max(var(--container-padding-desktop), var(--safe-area-inset-left));
      padding-right: max(var(--container-padding-desktop), var(--safe-area-inset-right));
    }
  }

  /* Container utility classes */
  .container {
    width: 100%;
    max-width: var(--container-max-width);
    margin-left: auto;
    margin-right: auto;
    padding-left: var(--container-padding-mobile);
    padding-right: var(--container-padding-mobile);
  }

  @media (min-width: 768px) {
    .container {
      padding-left: var(--container-padding-desktop);
      padding-right: var(--container-padding-desktop);
    }
  }

  /* Fluid typography classes */
  .text-fluid-xs { font-size: var(--text-xs); }
  .text-fluid-sm { font-size: var(--text-sm); }
  .text-fluid-base { font-size: var(--text-base); }
  .text-fluid-lg { font-size: var(--text-lg); }
  .text-fluid-xl { font-size: var(--text-xl); }
  .text-fluid-2xl { font-size: var(--text-2xl); }
  .text-fluid-3xl { font-size: var(--text-3xl); }
  .text-fluid-4xl { font-size: var(--text-4xl); }

  /* Responsive touch targets */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  @media (min-width: 768px) {
    .touch-target {
      min-height: 40px;
      min-width: 40px;
    }
  }

  /* Spacing utilities */
  .space-safe {
    padding-left: max(var(--space-4), var(--safe-area-inset-left));
    padding-right: max(var(--space-4), var(--safe-area-inset-right));
  }

  /* Focus styles for accessibility */
  :focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  button:focus-visible,
  a:focus-visible,
  [role="button"]:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 2px;
  }

  /* Custom scrollbar styles */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    background: hsl(var(--muted) / 0.3);
    border-radius: 10px;
  }

  ::-webkit-scrollbar-thumb {
    background: hsl(var(--secondary) / 0.6);
    border-radius: 10px;
    transition: var(--transition-smooth);
  }

  ::-webkit-scrollbar-thumb:hover {
    background: hsl(var(--secondary) / 0.8);
  }

  /* Firefox scrollbar */
  * {
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--secondary) / 0.6) hsl(var(--muted) / 0.3);
  }
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-100vh) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}

/* Custom Scrollbar Styles */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: hsl(var(--border)) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: hsl(var(--border));
  border-radius: 4px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: hsl(var(--muted-foreground) / 0.5);
}
```

---

## 🧩 Componentes UI

### Lista Completa de Componentes Shadcn/UI
Todos os componentes estão na pasta `src/components/ui/`:

1. **accordion.tsx** - Acordeões expansíveis
2. **alert-dialog.tsx** - Diálogos de alerta
3. **alert.tsx** - Alertas informativos
4. **aspect-ratio.tsx** - Controle de proporção de elementos
5. **avatar.tsx** - Avatares de usuário
6. **badge.tsx** - Badges/etiquetas
7. **breadcrumb.tsx** - Navegação breadcrumb
8. **button.tsx** - Botões com variantes
9. **calendar.tsx** - Componente de calendário
10. **card.tsx** - Cards de conteúdo
11. **carousel.tsx** - Carrossel de imagens
12. **chart.tsx** - Gráficos
13. **checkbox.tsx** - Checkboxes
14. **collapsible.tsx** - Conteúdo recolhível
15. **command.tsx** - Command palette
16. **context-menu.tsx** - Menu de contexto
17. **dialog.tsx** - Diálogos modais
18. **drawer.tsx** - Gavetas laterais
19. **dropdown-menu.tsx** - Menus dropdown
20. **form.tsx** - Formulários
21. **hover-card.tsx** - Cards ao passar o mouse
22. **input-otp.tsx** - Input para códigos OTP
23. **input.tsx** - Inputs de texto
24. **label.tsx** - Labels de formulário
25. **menubar.tsx** - Barra de menu
26. **morphing-light.tsx** - Efeito de luz morphing
27. **navigation-menu.tsx** - Menu de navegação
28. **pagination.tsx** - Paginação
29. **popover.tsx** - Popovers
30. **progress.tsx** - Barras de progresso
31. **radio-group.tsx** - Grupos de radio buttons
32. **resizable.tsx** - Painéis redimensionáveis
33. **scroll-area.tsx** - Áreas com scroll customizado
34. **select.tsx** - Seletores dropdown
35. **separator.tsx** - Separadores visuais
36. **sheet.tsx** - Painéis laterais
37. **sidebar.tsx** - Sidebar de navegação
38. **skeleton.tsx** - Esqueletos de loading
39. **slider.tsx** - Controles deslizantes
40. **sonner.tsx** - Sistema de toasts (Sonner)
41. **sparkles.tsx** - Efeito de sparkles
42. **switch.tsx** - Interruptores toggle
43. **table.tsx** - Tabelas
44. **tabs.tsx** - Abas de navegação
45. **textarea.tsx** - Áreas de texto
46. **theme-provider.tsx** - Provider de tema
47. **theme-toggle.tsx** - Alternador de tema
48. **toast.tsx** - Sistema de toasts
49. **toaster.tsx** - Container de toasts
50. **toggle-group.tsx** - Grupos de toggles
51. **toggle.tsx** - Botões toggle
52. **tooltip.tsx** - Tooltips
53. **use-toast.ts** - Hook para toasts

---

## 🎯 Componentes Customizados

### DotIcon.tsx
```typescript
import { cn } from "@/lib/utils";

interface DotIconProps {
  className?: string;
  size?: number;
}

export const DotIcon = ({ className, size = 16 }: DotIconProps) => {
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Círculo externo */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
        {/* Bolinha interna vermelha */}
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="#ef4444"
        />
      </svg>
    </div>
  );
};
```

### DotLogo.tsx
```typescript
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ui/theme-provider";

interface DotLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export const DotLogo = ({ className, size = 24, animate = false }: DotLogoProps) => {
  const { theme } = useTheme();
  
  // Usa o logo do sidebar que se adapta ao tema
  // Se for 'system', vamos detectar baseado nas preferências do navegador
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const logoSrc = isDark 
    ? "/lovable-uploads/7c396b9b-c7c8-460d-9683-1d9c1a265bd8.png" 
    : "/lovable-uploads/dot-logo-light.png";
  
  return (
    <div className={cn("flex items-center", animate && "animate-pulse-soft", className)}>
      <img 
        src={logoSrc}
        alt="DOT Logo"
        style={{ height: size, width: 'auto' }}
      />
    </div>
  );
};
```

---

## 🌓 Theme Provider

### theme-provider.tsx
```typescript
import React, { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "dot-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Verificação segura para localStorage
    if (typeof window !== "undefined" && window.localStorage) {
      return (localStorage.getItem(storageKey) as Theme) || defaultTheme;
    }
    return defaultTheme;
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(storageKey, theme);
      }
      setTheme(theme);
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
```

---

## 🖼️ Assets e Imagens

### Logos e Ícones
Localizados em `public/lovable-uploads/`:

1. **dot-logo-light.png** - Logo DOT para tema claro
2. **7c396b9b-c7c8-460d-9683-1d9c1a265bd8.png** - Logo DOT para tema escuro
3. **skala-icon.png** - Ícone Skala
4. Outros assets específicos do projeto

### Favicons
Localizados em `public/`:
- **dot-o-icon.png**
- **favicon-dot-o.png**
- **favicon-dot.png**
- **favicon-o-transparent.png**

---

## 📦 Instruções de Implementação

### 1. Criar um Novo Projeto Lovable

### 2. Instalar Dependências Necessárias
```bash
# Shadcn UI components (instalar via Lovable)
# tailwindcss-animate
# class-variance-authority
# clsx
# tailwind-merge
```

### 3. Copiar Arquivos de Configuração
- [ ] Copiar `tailwind.config.ts` completo
- [ ] Copiar `src/index.css` completo
- [ ] Verificar `postcss.config.js` (geralmente já existe)

### 4. Copiar Componentes
- [ ] Criar pasta `src/components/ui/`
- [ ] Copiar todos os componentes listados na seção "Componentes UI"
- [ ] Criar pasta `src/components/` e copiar `DotIcon.tsx` e `DotLogo.tsx`
- [ ] Copiar `theme-provider.tsx` e `theme-toggle.tsx`

### 5. Copiar Assets
- [ ] Criar pasta `public/lovable-uploads/`
- [ ] Fazer upload dos logos:
  - `dot-logo-light.png`
  - `7c396b9b-c7c8-460d-9683-1d9c1a265bd8.png`
- [ ] Copiar favicons para `public/`

### 6. Configurar Provider de Tema
Adicionar no arquivo principal (App.tsx ou main.tsx):
```typescript
import { ThemeProvider } from "@/components/ui/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="dot-ui-theme">
      {/* Seu app aqui */}
    </ThemeProvider>
  );
}
```

### 7. Verificar Importações
Certifique-se de que existe `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 8. Testar o Theme Toggle
Adicionar em algum componente:
```typescript
import { ThemeToggle } from "@/components/ui/theme-toggle";

// Em algum lugar visível
<ThemeToggle />
```

### 9. Verificar Responsividade
- Testar em mobile (360px+)
- Testar em tablet (768px+)
- Testar em desktop (1024px+)
- Verificar safe areas em dispositivos móveis

### 10. Validar Cores e Contraste
- Testar tema claro
- Testar tema escuro
- Verificar contraste de texto
- Validar cores do sidebar

---

## ✅ Checklist Final

- [ ] Todas as cores estão em HSL
- [ ] Tema claro funciona corretamente
- [ ] Tema escuro funciona corretamente
- [ ] Transição entre temas é suave
- [ ] Tipografia fluida responde bem
- [ ] Componentes UI renderizam corretamente
- [ ] Logos aparecem com tema correto
- [ ] Sidebar tem as cores corretas
- [ ] Scrollbars customizados funcionam
- [ ] Touch targets são adequados (44px mobile)
- [ ] Safe areas estão configuradas
- [ ] Animações funcionam suavemente
- [ ] Gradientes aplicam corretamente

---

## 🎯 Notas Importantes

1. **Sempre use tokens HSL**: Nunca use cores diretas como `#fff` ou `rgb()`. Use sempre `hsl(var(--token))`.

2. **Componentes são modulares**: Cada componente UI pode ser usado independentemente.

3. **Tema é automático**: O ThemeProvider gerencia tudo automaticamente.

4. **Responsividade é nativa**: Todos os componentes já são responsivos.

5. **Acessibilidade incluída**: Focus states, ARIA labels e touch targets já configurados.

6. **Gradientes DOT**: Use `bg-gradient-primary` ou `bg-gradient-secondary` para aplicar gradientes da marca.

---

## 📞 Suporte

Para aplicar este design system em outro projeto Lovable:
1. Siga as instruções na ordem
2. Teste cada etapa antes de prosseguir
3. Mantenha a estrutura de pastas consistente
4. Não modifique os tokens de cor (HSL é obrigatório)

---

**Versão**: 1.0
**Última atualização**: 2025
**Marca**: DOT Digital
**Cores principais**: Vermelho DOT (#DC3737) + Azul Escuro (#151C3A)
