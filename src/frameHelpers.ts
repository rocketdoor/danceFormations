import type { Dancer, Frame } from './types'

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

export function addDancer(frames: Frame[], newDancer: Dancer): Frame[] {
  return frames.map((f) => { return { ...f, dancers: [...f.dancers, newDancer] } })
}

export function deleteDancer(frames: Frame[], id: string): Frame[] {
  return frames.map((f) => { return { ...f, dancers: f.dancers.filter((d) => d.id !== id) } })
}

export function getCurrentFrame(frames: Frame[], currentTime: number): Frame {
  // think about here if there is a way to have a choreo with no frames
  let latestFrame = frames[0];
  frames.forEach((f) => {
    if(f.startTime <= currentTime)
    {
      latestFrame = f;
    }
  })
  return latestFrame;
}