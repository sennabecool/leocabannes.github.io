import { Link } from 'react-router-dom'
import ColorSection from './sections/ColorSection'
import TypographySection from './sections/TypographySection'
import SpacingSection from './sections/SpacingSection'
import AtomsSection from './sections/AtomsSection'
import MoleculesSection from './sections/MoleculesSection'
import OrganismsSection from './sections/OrganismsSection'
import styles from './DesignSystem.module.css'

const NAV_ITEMS = [
  { href: '#colors',     label: 'Colors' },
  { href: '#typography', label: 'Typography' },
  { href: '#spacing',    label: 'Spacing' },
  { href: '#atoms',      label: 'Atoms' },
  { href: '#molecules',  label: 'Molecules' },
  { href: '#organisms',  label: 'Organisms' },
]

export default function DesignSystem() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarInner}>
          <div className={styles.sidebarHeader}>
            <Link to="/" className={styles.backLink}>← Back</Link>
            <h1 className={styles.sidebarTitle}>Design System</h1>
          </div>
          <nav>
            <ul className={styles.navList}>
              {NAV_ITEMS.map(item => (
                <li key={item.href}>
                  <a href={item.href} className={styles.navItem}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </aside>
      <main className={styles.content}>
        <ColorSection />
        <TypographySection />
        <SpacingSection />
        <AtomsSection />
        <MoleculesSection />
        <OrganismsSection />
      </main>
    </div>
  )
}
