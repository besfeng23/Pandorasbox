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
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Connect your Google Drive to index documents and files.',
    icon: BookOpen,
    type: 'oauth',
    availability: 'available',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Sync your Notion workspace for seamless knowledge access.',
    icon: Building2,
    type: 'oauth',
    availability: 'available',
  },
  {
    id: 'public-website',
    name: 'Public Website',
    description: 'Index any public website to enhance your knowledge base.',
    icon: Globe,
    type: 'url',
    availability: 'available',
  },
  {
    id: 'database',
    name: 'Database',
    description: 'Connect to your database for structured data access.',
    icon: Database,
    type: 'config',
    availability: 'coming_soon',
  },
];
