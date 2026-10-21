import { baseAngle } from "./constants";
import { mergeDancersById } from "./dancerHelpers";
import { rotatePoint } from "./pathHelpers";
import type { Dancer, FormationControl, Point } from "./types";


export function applyCircleFormation(dancers: Dancer[], radius: number, centerX: number, centerY: number): Dancer[] {
  const pi = Math.PI;
  // for each dancer, position them at an angle (2*pi/count) * dancer index
  return dancers.map((dancer, i) => {
    const angle = ((2 * pi) / dancers.length) * i;

    return {
      ...dancer,
      x: Math.cos(angle) * radius + centerX,
      y: Math.sin(angle) * radius + centerY
    }
  })
}

export function applyLineFormation(dancers: Dancer[], spacing: number, startX: number, startY: number): Dancer[] {
  return dancers.map((dancer, i) => {
    return {
      ...dancer,
      x: startX + spacing * i,
      y: startY
    }
  })
}

export function applyVeeFormation(dancers: Dancer[], spacingX: number, spacingY: number, centerX: number, centerY: number): Dancer[] {
  return dancers.map((dancer, i) => {
    const centerIndex = (dancers.length - 1) / 2; // odd formation: whole number, even: fractioned
    return {
      ...dancer,
      x: centerX - spacingX * (i - centerIndex),
      y: centerY - spacingY * Math.abs(i - centerIndex)
    }
  })
}

export function applyHalfCircleFormation(dancers: Dancer[], radius: number, centerX: number, centerY: number, baseAngle: number): Dancer[] {
  const pi = Math.PI;
  const step = dancers.length === 1 ? 1 : pi / (dancers.length - 1);
  return dancers.map((dancer, i) => {
    const centerIndex = (dancers.length - 1) / 2; // odd formation: whole number, even: fractioned
    const angle = baseAngle + (i - centerIndex) * step
    return {
      ...dancer,
      x: Math.cos(angle) * radius + centerX,
      y: Math.sin(angle) * radius + centerY
    }
  })
}
export function computeFormationDancers(dancers: Dancer[], formation: FormationControl): Dancer[]
{
  let positioned: Dancer[];
  const targetDancers = dancers.filter((d) => formation.dancerIds.includes(d.id))

  if (formation.type === 'circle')
  {
    positioned = applyCircleFormation(targetDancers, formation.radius!, formation.centerX, formation.centerY);
  }
  else if (formation.type === 'vee')
  {
    positioned = applyVeeFormation(targetDancers, formation.spacingX!, formation.spacingY!, formation.centerX, formation.centerY);
  }
  else if (formation.type === 'halfCircle')
  {
    positioned = applyHalfCircleFormation(targetDancers, formation.radius!, formation.centerX, formation.centerY, baseAngle)
  }

  else if (formation.type === 'line')
  {
    positioned = applyLineFormation(targetDancers, formation.spacingX!, formation.centerX - formation.spacingX! * (targetDancers.length - 1)/2, formation.centerY)
  }
  else if (formation.type === 'selection'){
    positioned = targetDancers.map((d) => {
      const offset = formation.offsets!.find((o) => o.id === d.id)!;
      return {...d,
        x: formation.centerX + offset.dx * (formation.scale ?? 1) *(formation.scaleX ?? 1), 
        y: formation.centerY + offset.dy * (formation.scale ?? 1) *(formation.scaleY ?? 1)}
    })
  }
  

  else {throw new Error(`computeFormationsDancers: unsupported formation type ${formation.type}`)}

  const rotated = positioned.map((d) => 
  ({
    ...d,
    ...rotatePoint({x: d.x, y: d.y}, {x: formation.centerX, y: formation.centerY}, formation.baseAngle ?? 0)
  }));
  return mergeDancersById(dancers, rotated);
}

export function getMidpointOffsetY(formation: FormationControl, centerIndex: number): number{
  if (formation.type === 'vee')
  {
    return (formation.spacingY! * centerIndex) / 2;
  }

  else return 0;
}

export function getRotateHandleReach(formation: FormationControl, centerIndex: number): number{
  if (formation.type === 'circle' || formation.type === 'halfCircle')
  {
    return formation.radius!;
  }

  else if (formation.type === 'vee')
  {
    return formation.spacingY! * centerIndex;
  }

  else if (formation.type === 'line')
  {
    return formation.spacingX! * centerIndex;
  }

  else if (formation.type === 'selection')
  {
    let furthestUp = 0
    const offsets = formation.offsets!.map((o) => {return o.dy})
    furthestUp = Math.min(...offsets)
    return -furthestUp
  }

  return 0;
}

export function getScaleHandleReach(formation: FormationControl): number {
  const distances = formation.offsets!.map((o) => Math.hypot(o.dx, o.dy))
  return Math.max(...distances)
}

export function updateFormationFromDrag(
  formation: FormationControl,
  handle: 'move' | 'resize' | 'resizeX' | 'resizeY' | 'rotate' | 'scale' | 'scaleX' | 'scaleY',
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

  if (handle === 'scale'){
    const pointerDistance = Math.hypot(pointer.x - formation.centerX, pointer.y - formation.centerY)
    return {...formation, scale: pointerDistance/getScaleHandleReach(formation)}
  }

  if (handle === 'scaleX'){
    const xReach = Math.max(...formation.offsets!.map((o) => o.dx));
    return {...formation, scaleX: (localPointer.x - formation.centerX)/xReach}
  }

  if (handle === 'scaleY'){
    const yReach = -Math.min(...formation.offsets!.map((o) => o.dy));
    return {...formation, scaleY: (formation.centerY - localPointer.y)/yReach}
  }
  const pointerAngle = Math.atan2(pointer.y - formation.centerY, pointer.x - formation.centerX);
  return{...formation, baseAngle: pointerAngle + Math.PI / 2}
}