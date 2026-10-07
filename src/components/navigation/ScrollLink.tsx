import type { ReactNode } from 'react'

// Scroll without changing the route, including in GitHub Pages hash mode.
export function ScrollLink({ target, className, children, focus = false }: { target: string; className?: string; children: ReactNode; focus?: boolean }) {
  return <a href={`#${target}`} className={className} onClick={event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const element = document.getElementById(target)
    if (!element) return
    event.preventDefault()
    element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    if (focus) element.focus({ preventScroll: true })
  }}>{children}</a>
}
