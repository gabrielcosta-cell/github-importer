import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, X, Rocket, Moon, Shield, Flame, ChevronDown, Flag } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { sortTags } from '@/utils/tagSorting';

interface FilterPopoverProps {
  selectedSquad: string;
  selectedPlano: string;
  selectedNiche: string;
  selectedMotivo?: string;
  selectedFlag?: string;
  selectedTags: string[];
  availableNiches: string[];
  availableMotivos?: string[];
  availableTags: Array<{ id: string; name: string; color: string }>;
  showMotivoFilter?: boolean;
  onSquadChange: (value: string) => void;
  onPlanoChange: (value: string) => void;
  onNicheChange: (value: string) => void;
  onMotivoChange?: (value: string) => void;
  onFlagChange?: (value: string) => void;
  onTagsChange: (tagIds: string[]) => void;
  onClearFilters: () => void;
}

const squads = [
  { value: 'Apollo', label: 'Apollo', icon: Rocket },
  { value: 'Artemis', label: 'Artemis', icon: Moon },
  { value: 'Athena', label: 'Athena', icon: Shield },
  { value: 'Ares', label: 'Ares', icon: Flame },
];

const planos = ['Starter', 'Business', 'Pro', 'Conceito', 'Social'];

export const FilterPopover: React.FC<FilterPopoverProps> = ({
  selectedSquad,
  selectedPlano,
  selectedNiche,
  selectedMotivo,
  selectedFlag,
  selectedTags,
  availableNiches,
  availableMotivos = [],
  availableTags,
  showMotivoFilter = false,
  onSquadChange,
  onPlanoChange,
  onNicheChange,
  onMotivoChange,
  onFlagChange,
  onTagsChange,
  onClearFilters,
}) => {
  const activeFiltersCount = [
    selectedSquad !== 'todos',
    selectedPlano !== 'todos',
    selectedNiche !== 'todos',
    selectedMotivo !== 'todos',
    selectedFlag !== 'todos',
    selectedTags.length > 0,
  ].filter(Boolean).length;

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  // Sort tags using the utility function
  const sortedTags = useMemo(() => sortTags(availableTags), [availableTags]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 relative transition-all duration-200 hover:scale-105">
          <Filter className="h-4 w-4 mr-2 transition-transform duration-200" />
          Filtros
          <ChevronDown className="h-4 w-4 ml-2" />
          {activeFiltersCount > 0 && (
            <Badge 
              variant="secondary" 
              className="ml-2 h-5 min-w-5 rounded-full px-1.5 text-xs animate-in zoom-in-50 duration-200"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`${showMotivoFilter ? 'w-[480px]' : 'w-[400px]'} p-0`} align="end">
        <div className="p-4">
          <Tabs defaultValue="squad" className="w-full">
            <TabsList className="flex w-full mb-4 h-auto p-1 gap-1">
              <TabsTrigger value="squad" className="text-xs px-3 py-1.5 flex-1">
                Squads
                {selectedSquad !== 'todos' && (
                  <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                    1
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="plano" className="text-xs px-3 py-1.5 flex-1">
                Planos
                {selectedPlano !== 'todos' && (
                  <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                    1
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="flag" className="text-xs px-3 py-1.5 flex-1">
                Flags
                {selectedFlag !== 'todos' && (
                  <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                    1
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="nicho" className="text-xs px-3 py-1.5 flex-1">
                Nichos
                {selectedNiche !== 'todos' && (
                  <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                    1
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="etiquetas" className="text-xs px-3 py-1.5 flex-1">
                Etiquetas
                {selectedTags.length > 0 && (
                  <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                    {selectedTags.length}
                  </span>
                )}
              </TabsTrigger>
              {showMotivoFilter && (
                <TabsTrigger value="motivos" className="text-xs px-3 py-1.5 flex-1">
                  Motivos
                  {selectedMotivo !== 'todos' && (
                    <span className="ml-1 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-medium">
                      1
                    </span>
                  )}
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="squad" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
              <Button
                variant={selectedSquad === 'todos' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150"
                onClick={() => onSquadChange('todos')}
              >
                Todos os squads
              </Button>
              <Button
                variant={selectedSquad === 'sem_squad' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-muted-foreground"
                onClick={() => onSquadChange('sem_squad')}
              >
                Sem squad
              </Button>
              <Separator />
              {squads.map((squad) => {
                const Icon = squad.icon;
                return (
                  <Button
                    key={squad.value}
                    variant={selectedSquad === squad.value ? 'default' : 'ghost'}
                    size="sm"
                    className="w-full justify-start transition-all duration-150"
                    onClick={() => onSquadChange(squad.value)}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {squad.label}
                  </Button>
                );
              })}
            </TabsContent>
            
            <TabsContent value="plano" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
              <Button
                variant={selectedPlano === 'todos' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150"
                onClick={() => onPlanoChange('todos')}
              >
                Todos os planos
              </Button>
              <Button
                variant={selectedPlano === 'sem_plano' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-muted-foreground"
                onClick={() => onPlanoChange('sem_plano')}
              >
                Sem plano
              </Button>
              <Separator />
              {planos.map((plano) => (
                <Button
                  key={plano}
                  variant={selectedPlano === plano ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start transition-all duration-150"
                  onClick={() => onPlanoChange(plano)}
                >
                  {plano}
                </Button>
              ))}
            </TabsContent>
            
            <TabsContent value="flag" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
              <Button
                variant={selectedFlag === 'todos' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150"
                onClick={() => onFlagChange?.('todos')}
              >
                Todas as flags
              </Button>
              <Button
                variant={selectedFlag === 'sem_flag' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-muted-foreground"
                onClick={() => onFlagChange?.('sem_flag')}
              >
                Sem flag
              </Button>
              <Separator />
              <Button
                variant={selectedFlag === 'verde' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-green-600"
                onClick={() => onFlagChange?.('verde')}
              >
                <Flag className="h-3.5 w-3.5 mr-2" />
                Verde
              </Button>
              <Button
                variant={selectedFlag === 'amarela' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-yellow-600"
                onClick={() => onFlagChange?.('amarela')}
              >
                <Flag className="h-3.5 w-3.5 mr-2" />
                Amarela
              </Button>
              <Button
                variant={selectedFlag === 'vermelha' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-red-600"
                onClick={() => onFlagChange?.('vermelha')}
              >
                <Flag className="h-3.5 w-3.5 mr-2" />
                Vermelha
              </Button>
            </TabsContent>
            
            <TabsContent value="nicho" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
              <Button
                variant={selectedNiche === 'todos' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150"
                onClick={() => onNicheChange('todos')}
              >
                Todos os nichos
              </Button>
              <Button
                variant={selectedNiche === 'sem_nicho' ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start transition-all duration-150 text-muted-foreground"
                onClick={() => onNicheChange('sem_nicho')}
              >
                Sem nicho
              </Button>
              {availableNiches.length > 0 && <Separator />}
              {availableNiches.map((niche) => (
                <Button
                  key={niche}
                  variant={selectedNiche === niche ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start transition-all duration-150"
                  onClick={() => onNicheChange(niche)}
                >
                  {niche}
                </Button>
              ))}
            </TabsContent>
            
            <TabsContent value="etiquetas" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
              {availableTags.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma etiqueta disponível
                </div>
              ) : (
                <>
                  {sortedTags.map((tag) => (
                    <Button
                      key={tag.id}
                      variant={selectedTags.includes(tag.id) ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start transition-all duration-150"
                      onClick={() => handleTagToggle(tag.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span>{tag.name}</span>
                      </div>
                    </Button>
                  ))}
                </>
              )}
            </TabsContent>

            {showMotivoFilter && (
              <TabsContent value="motivos" className="space-y-2 max-h-[300px] overflow-y-auto animate-in fade-in-50 duration-200">
                <Button
                  variant={selectedMotivo === 'todos' ? 'default' : 'ghost'}
                  size="sm"
                  className="w-full justify-start transition-all duration-150"
                  onClick={() => onMotivoChange?.('todos')}
                >
                  Todos os motivos
                </Button>
                {availableMotivos.length > 0 && <Separator />}
                {availableMotivos.map((motivo) => {
                  // Remove "CS" prefix from display name
                  const displayName = motivo.replace(/^CS\s*[-–—:]\s*/i, '').replace(/^CS\s+/i, '');
                  return (
                    <Button
                      key={motivo}
                      variant={selectedMotivo === motivo ? 'default' : 'ghost'}
                      size="sm"
                      className="w-full justify-start transition-all duration-150"
                      onClick={() => onMotivoChange?.(motivo)}
                    >
                      {displayName}
                    </Button>
                  );
                })}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
};
