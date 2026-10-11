export interface ContactMethod {
  id: 'linkedin' | 'email' | 'phone'
  label: 'LinkedIn' | 'Email' | 'Phone'
  displayValue: string
  href: string
  external: boolean
}

export const contact = {
  linkedin: {
    id: 'linkedin',
    label: 'LinkedIn',
    displayValue: 'linkedin.com/in/ivan-vashchenko',
    href: 'https://www.linkedin.com/in/ivan-vashchenko',
    external: true,
  },
  email: {
    id: 'email',
    label: 'Email',
    displayValue: 'ivanvashchenko1756@gmail.com',
    href: 'mailto:ivanvashchenko1756@gmail.com',
    external: false,
  },
  phone: {
    id: 'phone',
    label: 'Phone',
    displayValue: '+1 (727) 236-7217',
    href: 'tel:+17272367217',
    external: false,
  },
} as const satisfies Record<string, ContactMethod>

export const contactDirectory = [contact.email, contact.phone] as const

export const linkedinProfile = {
  name: 'Ivan Vashchenko',
  headline: 'Engineering Automation | Mechanical Engineering + Computer Science | WTI Pure Air | ACMC Founder | Technical Strategy & AI Systems',
  organization: 'WTI - Pure Air Control Services',
  college: 'Principia College',
  banner: 'media/editorial/linkedin/banner.webp',
  profile: 'media/editorial/linkedin/profile.webp',
} as const
