import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, Tag, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { sortTags } from '@/utils/tagSorting';

interface Tag {
  id: string;
  name: string;
  color: string;
  module_scope: 'crm' | 'csm' | 'both';
}

interface TagFilterProps {
  moduleType: 'crm' | 'csm';
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({ 
  moduleType, 
  selectedTags, 
  onTagsChange 
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchAvailableTags();
  }, [moduleType]);

  const fetchAvailableTags = async () => {
    const { data, error } = await supabase
      .from('csm_tags')
      .select('id, name, color, module_scope')
      .eq('is_active', true)
      .or(`module_scope.eq.${moduleType},module_scope.eq.both`);

    if (!error && data) {
      setAvailableTags(sortTags(data as Tag[]));
    }
  };

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  const handleClearAll = () => {
    onTagsChange([]);
    setOpen(false);
  };

  const selectedTagsData = availableTags.filter(tag => 
    selectedTags.includes(tag.id)
  );

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            Filtrar por Etiquetas
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar etiqueta..." />
            <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {availableTags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  onSelect={() => handleTagToggle(tag.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span>{tag.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedTags.includes(tag.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
            {selectedTags.length > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>

      {selectedTagsData.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTagsData.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="gap-1 cursor-pointer hover:bg-secondary/80"
              onClick={() => handleTagToggle(tag.id)}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
