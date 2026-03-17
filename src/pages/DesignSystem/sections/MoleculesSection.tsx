import styles from './sections.module.css'

export default function MoleculesSection() {
  return (
    <section id="molecules" className={styles.section}>
      <h2 className={styles.sectionTitle}>Molecules</h2>
      <p className={styles.placeholder}>
        Molecule components will appear here as they are built from Figma designs.
      </p>
    </section>
  )
}
