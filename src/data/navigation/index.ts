import { categories, type ProjectCategory } from './categories'
export interface NavigationItem { id: string; label: string; fullLabel: string; href: string; category?: ProjectCategory }
export const navigation: NavigationItem[] = [
  ...categories.map(item => ({ ...item, category: item.id })),
  { id: 'leadership', label: 'Leadership', fullLabel: 'Leadership', href: '/leadership' },
]

export interface SocialLink { label: string; href: string | null }

// Add verified personal URLs here. Empty destinations are deliberately not links.
export const socialLinks: SocialLink[] = [
  { label: 'LinkedIn', href: null },
  { label: 'GitHub', href: null },
  { label: 'Email', href: null },
]
