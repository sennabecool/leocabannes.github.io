import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { Icon } from '../Icon'
import styles from './ButtonMenu.module.css'

const LABEL      = 'close'
const ERASE_MS   = 20
const WRITE_MS   = 20
const CORRECT_MS = 40

const LEET: Record<string, string> = {
  a: '@', b: '8', c: '₵', d: '₫', e: '3', f: 'f', g: '9', h: '#',
  i: '!', j: 'j', k: '₭', l: '1', m: 'm', n: '₦', o: '0', p: '₱',
  q: 'q', r: 'r', s: '5', t: '7', u: 'u', v: 'v', w: '₩', x: 'x',
  y: '¥', z: '2',
}
const GLITCH_POOL = '#%&*?@!'

function nextGlitchChar(char: string): string {
  const leet = LEET[char.toLowerCase()]
  if (leet && Math.random() > 0.3) return leet
  return GLITCH_POOL[Math.floor(Math.random() * GLITCH_POOL.length)]
}

export interface ButtonMenuProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  defaultOpen?: boolean
  /** Controlled open state. When provided, overrides internal toggle. */
  open?: boolean
}

export function ButtonMenu({
  defaultOpen = false,
  open: openProp,
  className,
  onClick,
  ...rest
}: ButtonMenuProps) {
  const isControlled = openProp !== undefined
  const [internalOpen, setInternalOpen] = useState(
    isControlled ? openProp! : defaultOpen
  )
  const open = isControlled ? openProp! : internalOpen

  const [displayedLabel, setDisplayedLabel] = useState(open ? LABEL : '')
  const prevOpen = useRef(open)

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
        }, ERASE_MS)
        return () => clearInterval(id)
      }
      setDisplayedLabel('')
      return
    }

    if (wasOpen) {
      setDisplayedLabel(LABEL)
      return
    }

    const glitches = Array.from(LABEL, nextGlitchChar)
    let writePos = 0
    let correctPos = 0

    function render() {
      const wp = Math.min(writePos, LABEL.length)
      const cp = Math.min(correctPos, LABEL.length)
      setDisplayedLabel(LABEL.slice(0, cp) + glitches.slice(cp, wp).join(''))
    }

    const writeId = setInterval(() => {
      if (writePos < LABEL.length) { writePos++; render() }
      else clearInterval(writeId)
    }, WRITE_MS)

    const correctId = setInterval(() => {
      if (correctPos < LABEL.length) { correctPos++; render() }
      else clearInterval(correctId)
    }, CORRECT_MS)

    return () => { clearInterval(writeId); clearInterval(correctId) }
  }, [open])

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isControlled) setInternalOpen(v => !v)
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
