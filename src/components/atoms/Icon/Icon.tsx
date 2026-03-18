import styles from './Icon.module.css'

export type IconName = 'plus'

const PATHS: Record<IconName, React.ReactNode> = {
  plus: (
    <>
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="6"  y1="12" x2="18" y2="12" />
    </>
  ),
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
  'aria-label'?: string
}

export default function Icon({ name, size = 24, className, 'aria-label': label }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`${styles.icon} ${className ?? ''}`}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {PATHS[name]}
    </svg>
  )
}
