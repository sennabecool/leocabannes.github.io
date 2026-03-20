import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './ButtonMenu.module.css'

const LABEL = 'close'
const CHAR_INTERVAL_MS = 40

export interface ButtonMenuProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  defaultOpen?: boolean
}

export function ButtonMenu({
  defaultOpen = false,
  className,
  onClick,
  ...rest
}: ButtonMenuProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [displayedLabel, setDisplayedLabel] = useState(defaultOpen ? LABEL : '')
  const prevOpen = useRef(defaultOpen)

  useEffect(() => {
    const wasOpen = prevOpen.current
    prevOpen.current = open

    if (!open) {
      if (wasOpen) {
        let i = LABEL.length
        const id = setInterval(() => {
          i--
          setDisplayedLabel(LABEL.slice(0, i))
          if (i <= 0) clearInterval(id)
        }, CHAR_INTERVAL_MS)
        return () => clearInterval(id)
      }
      setDisplayedLabel('')
      return
    }

    if (wasOpen) {
      setDisplayedLabel(LABEL)
      return
    }

    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayedLabel(LABEL.slice(0, i))
      if (i >= LABEL.length) clearInterval(id)
    }, CHAR_INTERVAL_MS)
    return () => clearInterval(id)
  }, [open])

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    setOpen(v => !v)
    onClick?.(e)
  }

  return (
    <button
      className={[styles.button, open ? styles.opened : '', className ?? ''].filter(Boolean).join(' ')}
      onClick={handleClick}
      aria-expanded={open}
      {...rest}
    >
      {displayedLabel && (
        <span className={styles.label}>{displayedLabel}</span>
      )}
      <span className={styles.iconWrap}>
        <Icon name="plus" size={24} className={`${styles.icon} ${open ? styles.iconOpen : ''}`} />
      </span>
    </button>
  )
}
