import { Link } from 'react-router-dom'
import ColorSection from './sections/ColorSection'
import TypographySection from './sections/TypographySection'
import SpacingSection from './sections/SpacingSection'
import AtomsSection from './sections/AtomsSection'
import IconsSection from './sections/IconsSection'
import MoleculesSection from './sections/MoleculesSection'
import OrganismsSection from './sections/OrganismsSection'
import styles from './DesignSystem.module.css'

const NAV_ITEMS = [
  { id: 'colors',     label: 'Colors' },
  { id: 'typography', label: 'Typography' },
  { id: 'spacing',    label: 'Spacing' },
  { id: 'atoms',      label: 'Atoms' },
  { id: 'icons',      label: 'Icons' },
  { id: 'molecules',  label: 'Molecules' },
  { id: 'organisms',  label: 'Organisms' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

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
                <li key={item.id}>
                  <button
                    className={styles.navItem}
                    onClick={() => scrollTo(item.id)}
                  >
                    {item.label}
                  </button>
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
        <IconsSection />
        <MoleculesSection />
        <OrganismsSection />
      </main>
    </div>
  )
}
