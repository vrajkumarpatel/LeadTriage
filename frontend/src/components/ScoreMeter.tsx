import { classificationStyle, scoreSegments } from '../lib/badges'
import type { Classification } from '../types'

const TOTAL_SEGMENTS = 10

/** Segmented 0-100 score meter, tinted by classification, digits in mono. */
export function ScoreMeter({ score, classification }: { score: number; classification: Classification }) {
  const filled = scoreSegments(score, TOTAL_SEGMENTS)
  const style = classificationStyle(classification)

  return (
    <div className="flex items-center gap-2">
      <span className="num text-sm font-semibold text-text">{score}</span>
      <div className="flex items-center gap-[3px]" role="img" aria-label={`Score ${score} out of 100`}>
        {Array.from({ length: TOTAL_SEGMENTS }, (_, i) => (
          <span
            key={i}
            className={`h-2.5 w-1 rounded-sm ${i < filled ? style.dotClass : 'bg-border'}`}
          />
        ))}
      </div>
    </div>
  )
}
