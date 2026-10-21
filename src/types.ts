/* interfaces are "rules" that the TS compiler will check to guarantee that everything is
   right, to catch mistakes before the code runs
*/

export interface SaveFile {
  version: number,
  frames: Frame[]
}

export interface Frame {
  id: string;
  dancers: Dancer[];
  startTime: number;
  endTime: number;
}

export interface Dancer {
  id: string;
  x: number;
  y: number;
  label?: string;
  pathToNext?: { startHandle: Point, endHandle: Point }
}

export interface Point {
  x: number;
  y: number;
}

export interface FormationControl{
  type: 'circle' | 'halfCircle' | 'vee' | 'line' | 'selection';
  dancerIds: string[];
  centerX: number;
  centerY: number;
  radius?: number; // circle and half circle
  spacingX?: number; // line and v
  spacingY?: number; // v
  baseAngle?: number;
  // selection
  offsets?: {id: string, dx: number, dy: number}[] 
  scale?: number;
  scaleX?: number;
  scaleY?: number;
}