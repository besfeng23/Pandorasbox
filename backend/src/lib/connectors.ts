import { BookOpen, Building2, Globe, Database } from 'lucide-react';
import type { ComponentType } from 'react';

export interface StaticConnector {
  id: string;
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  type: 'oauth' | 'url' | 'config';
  availability: 'available' | 'coming_soon';
}

export const staticConnectors: StaticConnector[] = [
  {
    id: 'public-website',
    name: 'Public Website',
    description: 'Index any public website to enhance your knowledge base.',
    icon: Globe,
    type: 'url',
    availability: 'available',
  },
];
