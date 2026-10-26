import * as LucideIcons from 'lucide-react-native';
import {
  FileText,
  Folder,
  type LucideIcon,
} from 'lucide-react-native';

const icons = LucideIcons as unknown as Record<string, unknown>;
const iconNames = Object.keys(icons);
const cache = new Map<string, LucideIcon | null>();

function resolveIcon(name: string): LucideIcon | null {
  const normalized = name.replace(/[-_\s]/g, '').toLowerCase();
  if (cache.has(normalized)) return cache.get(normalized) ?? null;

  const key = iconNames.find((candidate) => candidate.toLowerCase() === normalized);
  const icon = key ? icons[key] : null;
  const isComponent = typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && '$$typeof' in icon);
  const resolved = isComponent ? icon as LucideIcon : null;
  cache.set(normalized, resolved);
  return resolved;
}

export function optionIcon(name: string, isMenu: boolean): LucideIcon {
  return resolveIcon(name) ?? (isMenu ? Folder : FileText);
}
