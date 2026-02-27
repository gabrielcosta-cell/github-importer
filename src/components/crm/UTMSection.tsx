import React from 'react';
import { BarChart3 } from 'lucide-react';
import { EditableField } from './EditableField';
import { CSMCard } from '@/types/kanban';

interface UTMSectionProps {
  card: CSMCard;
  onUpdate: (field: string, value: string | number) => Promise<void>;
  loading: boolean;
}

export const UTMSection: React.FC<UTMSectionProps> = ({ card, onUpdate, loading }) => {
  return (
    <div className="space-y-4">
      <div className="bg-secondary/20 p-4 rounded-lg space-y-4">
          {/* UTM URL */}
          <EditableField
            value={card.utm_url}
            onSave={(value) => onUpdate('utm_url', value)}
            label="UTM URL"
            icon={<BarChart3 className="h-4 w-4 text-blue-600" />}
          />

          {/* UTM Source */}
          <EditableField
            value={card.utm_source}
            onSave={(value) => onUpdate('utm_source', value)}
            label="UTM Source"
            icon={<BarChart3 className="h-4 w-4 text-green-600" />}
          />

          {/* UTM Medium */}
          <EditableField
            value={card.utm_medium}
            onSave={(value) => onUpdate('utm_medium', value)}
            label="UTM Medium"
            icon={<BarChart3 className="h-4 w-4 text-orange-600" />}
          />

          {/* UTM Campaign */}
          <EditableField
            value={card.utm_campaign}
            onSave={(value) => onUpdate('utm_campaign', value)}
            label="UTM Campaign"
            icon={<BarChart3 className="h-4 w-4 text-purple-600" />}
          />

          {/* UTM Term */}
          <EditableField
            value={card.utm_term}
            onSave={(value) => onUpdate('utm_term', value)}
            label="UTM Term"
            icon={<BarChart3 className="h-4 w-4 text-indigo-600" />}
          />

          {/* UTM Content */}
          <EditableField
            value={card.utm_content}
            onSave={(value) => onUpdate('utm_content', value)}
            label="UTM Content"
            icon={<BarChart3 className="h-4 w-4 text-pink-600" />}
          />
        </div>
    </div>
  );
};