import { useState } from 'react'
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
  const [testPrefix, setTestPrefix] = useState('/')
  const [testLabel, setTestLabel] = useState('explore')
  const [testSuffix, setTestSuffix] = useState('→')

  return (
    <section id="atoms" className={styles.section}>
      <h2 className={styles.sectionTitle}>Atoms</h2>

      <ComponentPreview title="ButtonPrompt — click to expand">
        <ButtonPrompt label="explore" prefix="/" suffix="→" />
        <ButtonPrompt label="search" prefix="⌘" suffix="K" />
        <ButtonPrompt label="active" prefix="/" suffix="→" isActive />
        <ButtonPrompt label="starts open" prefix="~" suffix="*" defaultExpanded />
      </ComponentPreview>

      <ComponentPreview title="ButtonPrompt — live editor">
        <div className={atomStyles.liveEditor}>
          <div className={atomStyles.liveFields}>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>prefix</span>
              <input
                className={atomStyles.fieldInput}
                value={testPrefix}
                onChange={e => setTestPrefix(e.target.value)}
                placeholder="/"
              />
            </label>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>label</span>
              <input
                className={atomStyles.fieldInput}
                value={testLabel}
                onChange={e => setTestLabel(e.target.value)}
                placeholder="button"
              />
            </label>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>suffix</span>
              <input
                className={atomStyles.fieldInput}
                value={testSuffix}
                onChange={e => setTestSuffix(e.target.value)}
                placeholder="→"
              />
            </label>
          </div>
          <ButtonPrompt
            label={testLabel}
            prefix={testPrefix || undefined}
            suffix={testSuffix || undefined}
          />
        </div>
      </ComponentPreview>
    </section>
  )
}
