import { getMidpointOffsetY } from './formationHelpers';
import type {FormationControl, Frame, Point} from './types'
import { rotatePoint } from './pathHelpers';

export function updateFrame(frames: Frame[], frameId: string, changes: Partial<Frame>): Frame[] {
  return frames.map((f) => (f.id === frameId ? { ...f, ...changes } : f));
}

export function addFrameAfter(frames: Frame[], index: number, newFrame: Frame): Frame[] {
  return [
    ...frames.slice(0, index + 1)
    , newFrame,
    ...frames.slice(index + 1)
  ];
}

export function shiftFrames(frames: Frame[], fromIndex: number, amount: number): Frame[] {
  return frames.map((f, i) => {
    if (i >= fromIndex) {
      return { ...f, startTime: f.startTime + amount, endTime: f.endTime + amount }
    }
    else return f;
  })
}

export function updateFormationFromDrag(
  formation: FormationControl,
  handle: 'move' | 'resize' | 'resizeX' | 'resizeY' | 'rotate',
  pointer: Point,
  centerIndex: number
): FormationControl {
  const center = {x: formation.centerX, y: formation.centerY};
  const localPointer = rotatePoint(pointer, center, -(formation.baseAngle ?? 0));

  if (handle == 'move')
    return {...formation, centerX: localPointer.x, centerY: localPointer.y + getMidpointOffsetY(formation, centerIndex)}

  if (handle === 'resize')
    return {...formation, radius: Math.hypot(pointer.x - formation.centerX, pointer.y - formation.centerY)}

  if (handle === 'resizeX')
    return {...formation, spacingX: centerIndex === 0 ? formation.spacingX! : (localPointer.x - formation.centerX)/centerIndex}

  if (handle === 'resizeY')
    return {...formation, spacingY: centerIndex === 0 ? formation.spacingY! : (formation.centerY - localPointer.y)/centerIndex}

  const pointerAngle = Math.atan2(pointer.y - formation.centerY, pointer.x - formation.centerX);
  return{...formation, baseAngle: pointerAngle + Math.PI / 2}
}