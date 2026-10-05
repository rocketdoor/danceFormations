import { baseAngle } from "./constants";
import { rotatePoint } from "./pathHelpers";
import type { Dancer, FormationControl } from "./types";


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

  if (formation.type === 'circle')
  {
    positioned = applyCircleFormation(dancers, formation.radius!, formation.centerX, formation.centerY);
  }
  else if (formation.type === 'vee')
  {
    positioned = applyVeeFormation(dancers, formation.spacingX!, formation.spacingY!, formation.centerX, formation.centerY);
  }
  else if (formation.type === 'halfCircle')
  {
    positioned = applyHalfCircleFormation(dancers, formation.radius!, formation.centerX, formation.centerY, baseAngle)
  }

  else if (formation.type === 'line')
  {
    positioned = applyLineFormation(dancers, formation.spacingX!, formation.centerX - formation.spacingX! * (dancers.length - 1)/2, formation.centerY)
  }
  

  else {throw new Error(`computeFormationsDancers: unsupported formation type ${formation.type}`)}

  return positioned.map((d) => 
  ({
    ...d,
    ...rotatePoint({x: d.x, y: d.y}, {x: formation.centerX, y: formation.centerY}, formation.baseAngle ?? 0)
  }))
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

  return 0;
}