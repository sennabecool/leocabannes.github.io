import { useState, useEffect, useRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import styles from './ButtonPrompt.module.css'

const ERASE_MS          = 20  // collapse erase speed (per char)
const WRITE_MS          = 20  // write head tick speed (per char)
const CORRECT_MS        = 40  // correct head tick speed (per char)

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

export interface ButtonPromptProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string
  prefix?: string
  suffix?: string
  isActive?: boolean
  defaultExpanded?: boolean
  /** Controlled expanded state. When provided, overrides internal toggle. */
  expanded?: boolean
}

export function ButtonPrompt({
  label = 'button',
  prefix,
  suffix,
  isActive = false,
  defaultExpanded = false,
  expanded: expandedProp,
  className,
  onClick,
  ...rest
}: ButtonPromptProps) {
  const isControlled = expandedProp !== undefined
  const [internalExpanded, setInternalExpanded] = useState(
    isControlled ? expandedProp! : defaultExpanded
  )
  const expanded = isControlled ? expandedProp! : internalExpanded

  const [displayedPrefix, setDisplayedPrefix] = useState(
    expanded ? (prefix ?? '') : ''
  )
  const [displayedSuffix, setDisplayedSuffix] = useState(
    expanded ? (suffix ?? '') : ''
  )
  const prevExpanded = useRef(expanded)

  useEffect(() => {
    const wasExpanded = prevExpanded.current
    prevExpanded.current = expanded

    const fullPrefix = prefix ?? ''
    const fullSuffix = suffix ?? ''

    if (!expanded) {
      if (wasExpanded) {
        // Collapsing — erase prefix and suffix simultaneously
        const maxLen = Math.max(fullPrefix.length, fullSuffix.length)
        if (maxLen === 0) return
        let i = maxLen
        const id = setInterval(() => {
          i--
          setDisplayedPrefix(fullPrefix.slice(0, i))
          setDisplayedSuffix(fullSuffix.slice(0, i))
          if (i <= 0) clearInterval(id)
        }, ERASE_MS)
        return () => clearInterval(id)
      }
      setDisplayedPrefix('')
      setDisplayedSuffix('')
      return
    }

    if (wasExpanded) {
      setDisplayedPrefix(fullPrefix)
      setDisplayedSuffix(fullSuffix)
      return
    }

    const totalLen = fullPrefix.length + fullSuffix.length
    if (totalLen === 0) return

    const prefixGlitches = Array.from(fullPrefix, nextGlitchChar)
    const suffixGlitches = Array.from(fullSuffix, nextGlitchChar)

    function buildDisplay(real: string, glitches: string[], from: number, to: number) {
      return real.slice(0, from) + glitches.slice(from, to).join('')
    }

    let writePos = 0
    let correctPos = 0

    function render() {
      const cp = Math.min(correctPos, totalLen)
      const wp = Math.min(writePos, totalLen)
      setDisplayedPrefix(buildDisplay(fullPrefix, prefixGlitches,
        Math.min(cp, fullPrefix.length), Math.min(wp, fullPrefix.length)))
      setDisplayedSuffix(buildDisplay(fullSuffix, suffixGlitches,
        Math.max(0, cp - fullPrefix.length), Math.max(0, wp - fullPrefix.length)))
    }

    const writeId = setInterval(() => {
      if (writePos < totalLen) { writePos++; render() }
      else clearInterval(writeId)
    }, WRITE_MS)

    const correctId = setInterval(() => {
      if (correctPos < totalLen) { correctPos++; render() }
      else clearInterval(correctId)
    }, CORRECT_MS)

    return () => { clearInterval(writeId); clearInterval(correctId) }
  }, [expanded, prefix, suffix])

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isControlled) setInternalExpanded(v => !v)
    onClick?.(e)
  }

  return (
    <button
      className={[
        styles.button,
        expanded ? styles.expanded : '',
        isActive ? styles.active : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      {...rest}
    >
      {prefix && displayedPrefix && (
        <span className={styles.prefixWrap}>
          <span className={styles.prefixInner}>{displayedPrefix}</span>
        </span>
      )}
      <span className={styles.label}>{label}</span>
      {suffix && displayedSuffix && (
        <span className={styles.suffixWrap}>
          <span className={styles.suffixInner}>{displayedSuffix}</span>
        </span>
      )}
    </button>
  )
}
