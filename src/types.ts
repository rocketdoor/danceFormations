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
  type: 'circle' | 'halfCircle' | 'vee' | 'line';
  centerX: number;
  centerY: number;
  radius?: number;
  spacingX?: number;
  spacingY?: number;
  baseAngle?: number;
}