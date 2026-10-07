export const categories = [
  { id: 'ai', label: 'AI', fullLabel: 'Artificial intelligence', href: '/ai', introduction: 'Intelligence, made observable.' },
  { id: 'me', label: 'ME', fullLabel: 'Mechanical engineering', href: '/me', introduction: 'Ideas, put into motion.' },
] as const
export type ProjectCategory = typeof categories[number]['id']

export const categoryConfig = (id: ProjectCategory) => categories.find(category => category.id === id)!
