export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return <img src="/LOGO.svg" alt="" aria-hidden="true" className={className} />
}

export function Logo({ className = 'h-7' }: { className?: string }) {
  return <img src="/spark-logo.png" alt="Spark" className={`w-auto ${className}`} />
}
