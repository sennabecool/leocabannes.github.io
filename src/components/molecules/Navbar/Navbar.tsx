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

        {/* ── Single set of buttons: row when closed, column when open ── */}
        <div className={`${styles.chips} ${open ? styles.chipsOpen : ''}`}>
          {PROMPTS.map(p => (
            <ButtonPrompt
              key={p.label}
              prefix={p.prefix}
              label={p.label}
              suffix={p.suffix || undefined}
              expanded={open}
              onClick={stopProp}
            />
          ))}
          {!open && <div className={styles.chipsFade} aria-hidden />}
        </div>

        {/* ── Menu button — always below the chips ── */}
        <div className={styles.bar}>
          <ButtonMenu open={open} />
        </div>

      </div>
    </div>
  )
}
