import { Navbar } from '@components/molecules/Navbar'
import styles from './sections.module.css'
import moleculeStyles from './MoleculesSection.module.css'

export default function MoleculesSection() {
  return (
    <section id="molecules" className={styles.section}>
      <h2 className={styles.sectionTitle}>Molecules</h2>

      <div className={styles.preview}>
        <h3 className={styles.previewTitle}>Navbar</h3>
        <p className={styles.tokenValue} style={{ marginBottom: 'var(--space-3)' }}>
          Click anywhere except a prompt pill to expand / collapse. The input field stays focusable when open.
        </p>

        {/* Collapsed default */}
        <div className={moleculeStyles.navStage}>
          <Navbar />
        </div>

        {/* On a dark background so the frosted glass is visible */}
        <div className={moleculeStyles.navStageDark}>
          <Navbar />
        </div>
      </div>
    </section>
  )
}
