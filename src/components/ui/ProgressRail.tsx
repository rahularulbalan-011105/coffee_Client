import { forwardRef, type Ref, type RefObject } from 'react'
import { CHAPTERS } from '../../animation/journey'

export const RAIL_GROUPS = ['Origin', 'Process', 'Brew', 'Serve', 'Order'] as const

/** Where each rail group starts, in chapter units. */
export const RAIL_STARTS = RAIL_GROUPS.map((g) => CHAPTERS.findIndex((c) => c.stage === g))

interface ProgressRailProps {
  fillRef: Ref<HTMLDivElement>
  dotRefs: RefObject<(HTMLLIElement | null)[]>
}

/**
 * Quiet vertical indicator of where the reader is in the journey. It is updated
 * imperatively by the parent, so scrolling never triggers React renders.
 */
const ProgressRail = forwardRef<HTMLDivElement, ProgressRailProps>(function ProgressRail({ fillRef, dotRefs }, ref) {
  return (
    <div
      ref={ref}
      className="pointer-events-none fixed right-8 top-1/2 z-30 hidden -translate-y-1/2 transition-opacity duration-700 lg:block"
      aria-hidden="true"
    >
      <div className="relative">
        <div className="absolute bottom-2 right-[5px] top-2 w-px bg-cream/15">
          <div
            ref={fillRef}
            className="absolute inset-0 origin-top bg-gradient-to-b from-sage via-gold-soft to-gold"
            style={{ transform: 'scaleY(0)' }}
          />
        </div>
        <ol className="relative flex flex-col gap-9">
          {RAIL_GROUPS.map((g, i) => (
            <li
              key={g}
              ref={(el) => {
                if (dotRefs.current) dotRefs.current[i] = el
              }}
              data-active={i === 0}
              className="group flex items-center justify-end gap-4"
            >
              <span className="eyebrow text-[0.58rem] text-cream/35 transition-colors duration-700 group-data-[active=true]:text-gold-soft">
                {g}
              </span>
              <span className="block h-[11px] w-[11px] rounded-full border border-cream/30 bg-espresso transition-all duration-700 group-data-[active=true]:border-gold-soft group-data-[active=true]:bg-gold-soft group-data-[active=true]:shadow-[0_0_12px_rgba(227,199,142,0.6)]" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
})

export default ProgressRail
