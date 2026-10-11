import { categories, type ProjectCategory } from './categories'
export interface NavigationItem { id: string; label: string; fullLabel: string; href: string; category?: ProjectCategory }
export const navigation: NavigationItem[] = [
  ...categories.map(item => ({ ...item, category: item.id })),
  { id: 'contact', label: 'Contact', fullLabel: 'Contact', href: '/contact' },
]
