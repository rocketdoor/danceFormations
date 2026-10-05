import type {Dancer, Frame, Point} from './types'

function bezierPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  }
}

export function getHandles(from: Dancer, to: Dancer): { startHandle: Point, endHandle: Point } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (from.pathToNext)
    return from.pathToNext
  else
    return { startHandle: { x: (from.x + dx / 3), y: (from.y + dy / 3) }, endHandle: { x: (from.x + dx * 2 / 3), y: (from.y + dy * 2 / 3) } }
}

export function interpolateFrames(frameA: Frame, frameB: Frame, t: number): Dancer[] {
  return frameA.dancers.map((dancer) => {
    const frameBDancer = frameB.dancers.find((d) => d.id === dancer.id)!;
    const p0 = { x: dancer.x, y: dancer.y }
    const p3 = { x: frameBDancer.x, y: frameBDancer.y }
    const { startHandle: p1, endHandle: p2 } = getHandles(dancer, frameBDancer)
    return {
      ...dancer,
      ...bezierPoint(p0, p1, p2, p3, t)
    }
  }
  )
}

export function moveHandles(handles: { startHandle: Point, endHandle: Point }, which: 'start' | 'end', to: Point): { startHandle: Point, endHandle: Point } {
  return which === 'start'
    ? { ...handles, startHandle: to }
    : { ...handles, endHandle: to }
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return{
    x: center.x + dx*Math.cos(angle) - dy*Math.sin(angle),
    y: center.y + dx*Math.sin(angle) + dy*Math.cos(angle)
  }
}

