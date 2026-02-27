import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Clock, 
  Wallet,
  TrendingDown,
  DollarSign,
  Star,
  FolderKanban,
  BarChart3,
  CheckSquare,
  PenTool,
  Search
} from "lucide-react";
import { ViewType } from '@/hooks/useInterfacePreferences';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (view: ViewType) => void;
}

export const CommandPalette = ({ open, onOpenChange, onNavigate }: CommandPaletteProps) => {
  const navigate = useNavigate();

  const pages = [
    { value: 'dashboard', label: 'Quadro de vendas', icon: LayoutDashboard },
    { value: 'crm', label: 'CRM', icon: DollarSign },
    { value: 'csm', label: 'CSM', icon: MessageSquare },
    { value: 'lista-espera', label: 'Lista de espera', icon: Clock },
    { value: 'wallet', label: 'Wallet', icon: Wallet },
    { value: 'cs-churn', label: 'CS - Churn', icon: TrendingDown },
    { value: 'cs-metricas', label: 'CS - Métricas Financeiras', icon: DollarSign },
    { value: 'cs-nps', label: 'CS - NPS', icon: Star },
    { value: 'projetos-operacao', label: 'Projetos', icon: FolderKanban },
    { value: 'performance', label: 'Performance', icon: BarChart3 },
    { value: 'aprovacao', label: 'Aprovação', icon: CheckSquare },
    { value: 'copy', label: 'Copy', icon: PenTool },
    { value: 'analise-bench', label: 'Análise e Bench', icon: Search },
  ];

  const handleSelect = (value: string) => {
    onNavigate(value as ViewType);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        <CommandGroup heading="Páginas">
          {pages.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.value}
                value={page.value}
                onSelect={handleSelect}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{page.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
