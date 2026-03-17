import styles from './sections.module.css'

export default function AtomsSection() {
  return (
    <section id="atoms" className={styles.section}>
      <h2 className={styles.sectionTitle}>Atoms</h2>
      <p className={styles.placeholder}>
        Atom components will appear here as they are built from Figma designs.
      </p>
    </section>
  )
}
