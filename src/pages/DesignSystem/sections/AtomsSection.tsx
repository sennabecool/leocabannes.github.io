import { ButtonPrompt } from '@components/atoms/ButtonPrompt'
import styles from './sections.module.css'

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

      <ComponentPreview title="ButtonPrompt — Small">
        <ButtonPrompt size="sm" label="button" />
        <ButtonPrompt size="sm" label="active" isActive />
      </ComponentPreview>

      <ComponentPreview title="ButtonPrompt — Big">
        <ButtonPrompt size="big" label="button" prefix="prefix" suffix="suffix" />
        <ButtonPrompt size="big" label="button" prefix="prefix" suffix="suffix" isActive />
        <ButtonPrompt size="big" label="button" />
      </ComponentPreview>
    </section>
  )
}
