import { NavLink } from 'react-router'
import { navigation } from '../../data/navigation/index'
import { Arrow } from '../ui/Arrow'

export function Navigation({ hero = false }: { hero?: boolean }) {
  return <nav className={hero ? 'navigation hero-navigation' : 'navigation'} aria-label={hero ? 'Explore disciplines' : 'Primary'}>
    {navigation.map(item => <NavLink key={item.id} to={item.href} title={item.fullLabel}><span>{item.label}</span><Arrow diagonal /></NavLink>)}
  </nav>
}
