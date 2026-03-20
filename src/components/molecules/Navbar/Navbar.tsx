import { useState } from 'react'
import type { HTMLAttributes } from 'react'
import { ButtonPrompt } from '@components/atoms/ButtonPrompt'
import { ButtonMenu } from '@components/atoms/ButtonMenu'
import styles from './Navbar.module.css'

const PROMPTS = [
  { prefix: 'Tell me more',          label: 'about',     suffix: 'yourself'            },
  { prefix: 'What are your latest',  label: 'work',      suffix: 'projects?'           },
  { prefix: 'Show me what',          label: 'awards',    suffix: "you've got"          },
  { prefix: 'How can I',             label: 'contact',   suffix: 'you?'                },
  { prefix: 'What are your favourite', label: 'places',  suffix: 'in Paris?'           },
  { prefix: 'Which',                 label: 'songs',     suffix: 'do you play on repeat?' },
  { prefix: 'Switch to',             label: 'dark mode', suffix: ''                    },
]

export interface NavbarProps extends HTMLAttributes<HTMLDivElement> {}

export function Navbar({ className, ...rest }: NavbarProps) {
  const [open, setOpen] = useState(false)

  function toggle() {
    setOpen(v => !v)
  }

  function stopProp(e: React.MouseEvent) {
    e.stopPropagation()
  }

  function handleInputClick(e: React.MouseEvent) {
    // When already open: don't close on input click (let user type)
    // When closed: let it bubble so the navbar opens
    if (open) e.stopPropagation()
  }

  return (
    <div
      className={[styles.navbar, open ? styles.open : '', className ?? ''].filter(Boolean).join(' ')}
      onClick={toggle}
      role="search"
      aria-expanded={open}
      {...rest}
    >
      <div className={styles.chatbox}>

        {/* ── Input row ── */}
        <div className={styles.promptRow}>
          <input
            type="text"
            className={styles.input}
            placeholder="Ask Leo Cabannes..."
            onClick={handleInputClick}
          />
        </div>

        {/* ── Expanded prompts — slides in with grid trick ── */}
        <div className={`${styles.expandedSection} ${open ? styles.expandedOpen : ''}`}>
          <div className={styles.expandedInner}>
            {PROMPTS.map(p => (
              <ButtonPrompt
                key={p.label}
                prefix={p.prefix}
                label={p.label}
                suffix={p.suffix || undefined}
                expanded={true}
                onClick={stopProp}
                className={styles.expandedPrompt}
              />
            ))}
          </div>
        </div>

        {/* ── Bottom bar: horizontal chips + menu button ── */}
        <div className={styles.bar}>
          <div className={`${styles.chipsWrap} ${open ? styles.chipsHidden : ''}`}>
            <div className={styles.chipsScroll}>
              {PROMPTS.map(p => (
                <ButtonPrompt
                  key={p.label}
                  label={p.label}
                  expanded={false}
                  onClick={stopProp}
                />
              ))}
            </div>
            <div className={styles.chipsFade} aria-hidden />
          </div>

          {/* ButtonMenu click bubbles up to toggle navbar */}
          <ButtonMenu open={open} />
        </div>

      </div>
    </div>
  )
}
