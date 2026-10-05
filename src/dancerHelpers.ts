import type {Dancer} from './types'

export function updateDancer(dancers: Dancer[], id: string, changes: Partial<Dancer>): Dancer[] {
  return dancers.map((d) => (d.id === id ? { ...d, ...changes } : d));
}

export function swapDancers(dancers: Dancer[], idA: string, idB: string): Dancer[] {
  const dancerA = dancers.find((d) => d.id === idA)!;
  const dancerB = dancers.find((d) => d.id === idB)!;
  return dancers.map((d) => {
    if (d.id == idA) return { ...d, x: dancerB.x, y: dancerB.y };
    else if (d.id == idB) return { ...d, x: dancerA.x, y: dancerA.y };
    else return d;
  })
}

export function cloneDancersToNewFrame(dancers: Dancer[]): Dancer[] {
  return dancers.map((d) => {
    return { ...d, pathToNext: undefined }
  })
}