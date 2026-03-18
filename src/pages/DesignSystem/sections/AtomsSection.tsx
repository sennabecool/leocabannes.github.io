import { ButtonPrompt } from '@components/atoms/ButtonPrompt'
import styles from './sections.module.css'
import atomStyles from './AtomsSection.module.css'

function ComponentPreview({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.preview}>
      <h3 className={styles.previewTitle}>{title}</h3>
      <div className={styles.previewStage}>{children}</div>
    </div>
  )
}

export default function AtomsSection() {
  return (
    <section id="atoms" className={styles.section}>
      <h2 className={styles.sectionTitle}>Atoms</h2>

      <ComponentPreview title="ButtonPrompt — click to expand">
        <ButtonPrompt label="explore" prefix="/" suffix="→" />
        <ButtonPrompt label="search" prefix="⌘" suffix="K" />
        <ButtonPrompt label="active" prefix="/" suffix="→" isActive />
        <ButtonPrompt label="starts open" prefix="~" suffix="*" defaultExpanded />
      </ComponentPreview>

      <ComponentPreview title="ButtonPrompt — transition animation test">
        <div className={atomStyles.animTestRow}>
          <ButtonPrompt
            label="click me"
            prefix="prefix"
            suffix="suffix"
            className={atomStyles.animTestButton}
          />
          <p className={atomStyles.animTestHint}>← click to expand / collapse</p>
        </div>
      </ComponentPreview>
    </section>
  )
}
