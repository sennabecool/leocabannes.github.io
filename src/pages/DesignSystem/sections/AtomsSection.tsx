import { useState } from 'react'
import { ButtonPrompt } from '@components/atoms/ButtonPrompt'
import styles from './sections.module.css'
import atomStyles from './AtomsSection.module.css'

export default function AtomsSection() {
  const [testPrefix, setTestPrefix] = useState('Tell me more')
  const [testLabel, setTestLabel] = useState('about')
  const [testSuffix, setTestSuffix] = useState('yourself')

  return (
    <section id="atoms" className={styles.section}>
      <h2 className={styles.sectionTitle}>Atoms</h2>

      <div className={styles.preview}>
        <h3 className={styles.previewTitle}>ButtonPrompt</h3>

        {/* Static variants */}
        <div className={styles.previewStage}>
          <ButtonPrompt label="explore" prefix="/" suffix="→" />
          <ButtonPrompt label="search" prefix="⌘" suffix="K" />
          <ButtonPrompt label="active" prefix="/" suffix="→" isActive />
          <ButtonPrompt label="starts open" prefix="~" suffix="*" defaultExpanded />
        </div>

        {/* Live editor */}
        <div className={atomStyles.liveEditor}>
          <div className={atomStyles.liveFields}>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>prefix</span>
              <input
                className={atomStyles.fieldInput}
                value={testPrefix}
                onChange={e => setTestPrefix(e.target.value)}
                placeholder="prefix"
              />
            </label>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>label</span>
              <input
                className={atomStyles.fieldInput}
                value={testLabel}
                onChange={e => setTestLabel(e.target.value)}
                placeholder="label"
              />
            </label>
            <label className={atomStyles.field}>
              <span className={atomStyles.fieldLabel}>suffix</span>
              <input
                className={atomStyles.fieldInput}
                value={testSuffix}
                onChange={e => setTestSuffix(e.target.value)}
                placeholder="suffix"
              />
            </label>
          </div>
          <div className={styles.previewStage}>
            <ButtonPrompt
              label={testLabel}
              prefix={testPrefix || undefined}
              suffix={testSuffix || undefined}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
