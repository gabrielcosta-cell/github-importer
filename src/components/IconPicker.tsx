import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import * as LucideIcons from 'lucide-react';

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
}

// Lista de ícones populares para squads
const popularIcons = [
  'Users', 'Rocket', 'Mountain', 'Zap', 'Target', 'Trophy', 'Crown', 'Star',
  'Flame', 'Heart', 'Shield', 'Swords', 'Brain', 'Eye', 'Globe', 'Sunrise',
  'Moon', 'Sun', 'Cloud', 'Sparkles', 'Compass', 'Flag', 'Map', 'Navigation',
  'Anchor', 'Award', 'BadgeCheck', 'Gem', 'Hexagon', 'Pentagon', 'Triangle',
  'Circle', 'Square', 'Diamond', 'Pyramid', 'Box', 'Package', 'Gift', 'Briefcase',
  'Code', 'Terminal', 'Database', 'Server', 'Cpu', 'HardDrive', 'Activity',
  'BarChart', 'TrendingUp', 'PieChart', 'Layout', 'Layers', 'Grid', 'List',
];

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const CurrentIcon = (LucideIcons as any)[value] || LucideIcons.Users;

  const filteredIcons = popularIcons.filter(icon =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span>{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Buscar ícone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-2 p-3">
            {filteredIcons.map((iconName) => {
              const IconComponent = (LucideIcons as any)[iconName];
              if (!IconComponent) return null;

              return (
                <Button
                  key={iconName}
                  variant={value === iconName ? 'default' : 'ghost'}
                  size="sm"
                  className="h-10 w-full p-2"
                  onClick={() => {
                    onChange(iconName);
                    setOpen(false);
                  }}
                >
                  <IconComponent className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
