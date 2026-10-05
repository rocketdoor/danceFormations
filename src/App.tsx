
import './App.css'
import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as faCircleRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faMinus, faU, faChevronDown, faPlus, faArrowRight, faArrowLeft, faPenToSquare, faRightLeft,
  faFloppyDisk, faDownload
} from '@fortawesome/free-solid-svg-icons';



import type { Dancer, FormationControl, Frame } from './types'
import {
  updateDancer, swapDancers, cloneDancersToNewFrame
} from './dancerHelpers'
import { updateFrame, addFrameAfter, shiftFrames, updateFormationFromDrag } from './frameHelpers'
import { interpolateFrames, getHandles, moveHandles, rotatePoint } from './pathHelpers'
import { saveToLocal, loadFromLocal, importFromFile, exportToFile } from './persistence'
import { svgHeight, svgWidth, spacingX, spacingY, centerX, centerY, radius, standardFrameGap, standardFrameLength, rotateHandleOffset } from './constants'
import { computeFormationDancers, getMidpointOffsetY, getRotateHandleReach } from './formationHelpers';

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(value, max))
}

export default function App() {
  const [frames, setFrames] = useState<Frame[]>(() => loadFromLocal() ?? [
    {
      id: "frame-1",
      dancers: [
        { id: '1', x: 100, y: 100, label: "Dancer 1" },
        { id: '2', x: 150, y: 100, label: "Dancer 2" },
        { id: '3', x: 200, y: 100, label: "Dancer 3" },
        { id: '4', x: 250, y: 100, label: "Dancer 4" },
        { id: '5', x: 300, y: 100, label: "Dancer 5" },
        { id: '6', x: 350, y: 100, label: "Dancer 6" },
        { id: '7', x: 400, y: 100, label: "Dancer 7" }
      ],
      startTime: 0,
      endTime: 10,
    },
  ]);

  const [currentFrameId, setCurrentFrameId] = useState<string>("frame-1");

  const [interpolationTime, setInterpolationTime] = useState<number>(0);

  const currentFrame = frames.find((f) => f.id === currentFrameId)!; // every time after updating currentFrameId, it finds which is the frame, then derives the dancers positions from it
  const currentFrameIndex = frames.findIndex((f) => f.id === currentFrameId);
  const nextFrameIndex = currentFrameIndex + 1;
  const nextFrame = frames[nextFrameIndex];
  const prevFrame = frames[currentFrameIndex - 1]

  const displayedDancers = nextFrame ? interpolateFrames(currentFrame, nextFrame, interpolationTime) : currentFrame.dancers;
  const [editingDancerId, setEditingDancerId] = useState<string | null>(null);

  // variables used to control which dancer is being dragged
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // used to control which dancer is currently selected
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // used to control if currently, the swap option is selected
  const [swapping, setSwapping] = useState<boolean>(false);

  const [draggedHandle, setDraggedHandle] = useState<'start' | 'end' | null>(null);

  const [draggingFormationHandle, setDraggingFormationHandle] = useState<'move' | 'resize' | 'resizeX' | 'resizeY' | 'rotate' | null>(null);

  const [activeFormation, setActiveFormation] = useState<FormationControl | null>(null);

  const svgRef = useRef<SVGSVGElement>(null); // useref gives a box that holds values between re-renders, unlike usestate

  
  const centerIndex = (currentFrame.dancers.length - 1) / 2;

  const selectedDancer = currentFrame.dancers.find((d) => d.id === selectedId); // returns the dancer object
  const selectedTarget = nextFrame?.dancers.find((d) => d.id === selectedId);
  const selectedHandles = selectedDancer && selectedTarget ? getHandles(selectedDancer, selectedTarget) : null;
  const rotateHandlePos = activeFormation ? rotatePoint(
    { x: activeFormation.centerX, y: activeFormation.centerY - (getRotateHandleReach(activeFormation, centerIndex) + rotateHandleOffset) },
    { x: activeFormation.centerX, y: activeFormation.centerY },
    activeFormation.baseAngle ?? 0
  ) : null;
  const midPointLocal = activeFormation ?
    {
      x: activeFormation?.centerX,
      y: activeFormation?.centerY - getMidpointOffsetY(activeFormation, centerIndex)
    }
    : null
  const movePos = activeFormation && midPointLocal
    ? rotatePoint(midPointLocal, { x: activeFormation.centerX, y: activeFormation.centerY }, activeFormation.baseAngle ?? 0) : null

  const spacingXHandlePos = activeFormation && (activeFormation.type === 'vee' || activeFormation.type === 'line') ? rotatePoint
    ({ x: activeFormation.centerX + activeFormation.spacingX! * centerIndex, y: activeFormation.centerY - getMidpointOffsetY(activeFormation, centerIndex) },
      { x: activeFormation.centerX, y: activeFormation.centerY },
      activeFormation.baseAngle ?? 0
    ) : null
  const spacingYHandlePos = activeFormation && activeFormation.type === 'vee' ? rotatePoint
    ({ x: activeFormation.centerX, y: activeFormation.centerY - activeFormation.spacingY! * centerIndex },
      { x: activeFormation.centerX, y: activeFormation.centerY },
      activeFormation.baseAngle ?? 0
    ) : null



  function getSvgCoords(e: React.PointerEvent<SVGSVGElement>): { x: number, y: number } {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = px * (svgWidth / rect.width);
    const y = py * (svgHeight / rect.height);
    return { x, y };
  }

  function updateCurrentFrameDancers(newDancers: Dancer[]) {
    setFrames(updateFrame(frames, currentFrameId, { dancers: newDancers }));
  }

  function renameDancer(dancer: Dancer, newLabel: string) {
    // passes through each dancer on the current frame, finds the one that has the new name (newLabel) 
    // and doesnt have the same id as the dancer im editing
    const collidingDancer = currentFrame.dancers.find((d) => d.label === newLabel && d.id !== dancer.id)

    if (collidingDancer) {
      updateCurrentFrameDancers(swapDancers([collidingDancer, dancer], collidingDancer.id, dancer.id))
    }
    else {
      updateCurrentFrameDancers(updateDancer(currentFrame.dancers, dancer.id, { label: newLabel }))
    }

    setEditingDancerId(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center' }}>

      <div className='side-spacer'></div>

      <div className='stage-wrapper'>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ height: '100vh', aspectRatio: '4/3', border: '1px solid #ccc' }}
          ref={svgRef}
          onPointerMove={(e) => {
            const { x, y } = getSvgCoords(e);

            if (draggedHandle != null && selectedHandles && selectedId != null) {
              updateCurrentFrameDancers(updateDancer(currentFrame.dancers, selectedId, {
                pathToNext: moveHandles(selectedHandles, draggedHandle, { x, y })
              }))

              return;
            }

            if (draggedId != null) {
              updateCurrentFrameDancers(updateDancer(currentFrame.dancers, draggedId, { x, y }));
            }

            if (draggingFormationHandle && activeFormation){
              const updatedFormation = updateFormationFromDrag(activeFormation, draggingFormationHandle, {x,y}, centerIndex);
              setActiveFormation(updatedFormation);
              updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, updatedFormation));
              return; 
            }
          }
          }
          onPointerUp={() => { setDraggedId(null); setDraggedHandle(null); setDraggingFormationHandle(null) }}
        >
          {/* a && b returns a if a is false, otherwise, returns b */}
          {/* render the dancers' future places */}

          {nextFrame && nextFrame.dancers.map((dancer) => (
            <circle
              key={dancer.id}
              cx={dancer.x}
              cy={dancer.y}
              r={10}
              fill={'steelblue'}
              opacity={0.3}
            />
          ))}


          {nextFrame && currentFrame.dancers.map((dancer) => {
            const target = nextFrame.dancers.find((d) => d.id === dancer.id)!;
            const { startHandle, endHandle } = getHandles(dancer, target)
            return (
              // path is a generic SVG shape object
              // d is the attribute that defines a path to be drawn
              // M x y moves the cursor to said coordinates, C x1 y1, x2 y2, x y draws a bezier Curve to xy, with control points on x1y1 and x2y2
              // other commands are L x y for a line, H x for horizontal line, V y for vertical and Z to close the path with a straight line back to last M
              // S x2 y2 x y is a smooth bezier curve, Q x1 x2 x y is a quadratic bezier, T x y smooth quadratic, A for arcs 
              // uppercase commands give absolute coordinates, lowercase, relative   
              <path
                key={dancer.id}
                d={`M ${dancer.x} ${dancer.y} C ${startHandle.x} ${startHandle.y}, ${endHandle.x} ${endHandle.y}, ${target.x} ${target.y}`}
                fill="none" stroke="black" opacity={0.5} strokeDasharray="6 4"
              />
            )
          })}
          {displayedDancers.map((dancer) =>
          (
            <React.Fragment key={dancer.id} /* Fragment is a React element that groups multiple elements into a  single one */ >
              <circle
                cx={dancer.x} cy={dancer.y} r={10}
                fill={dancer.id === selectedId ? 'orange' : "steelblue"}
                onPointerDown={() => {
                  if (swapping && selectedId != null && dancer.id != selectedId) {
                    updateCurrentFrameDancers(swapDancers(currentFrame.dancers, selectedId, dancer.id));
                    setSwapping(false);
                    setSelectedId(null);
                    return;
                  }
                  setDraggedId(dancer.id);
                  setSelectedId(dancer.id);
                }}
              />
              {/* HERE TO EDIT THE DANCER NAME */}
              {dancer.id === editingDancerId ? (
                <foreignObject x={dancer.x - 30} y={dancer.y - 30} width={60} height={20}>
                  <input
                    defaultValue={dancer.label}
                    onBlur={(e) => {
                      renameDancer(dancer, e.target.value)
                    }}
                  />
                </foreignObject>
              ) : (
                <text x={dancer.x} y={dancer.y - 15} /* offsets the text 15px up from the center of the dancer */
                  textAnchor="middle" fontSize={12}
                  onDoubleClick={() => setEditingDancerId(dancer.id)}>
                  {dancer.label}
                </text>)}
            </React.Fragment>
          ))}

          {selectedDancer && selectedTarget && selectedHandles && (
            [{ handle: selectedHandles.startHandle, anchor: selectedDancer, which: 'start' as const },
            { handle: selectedHandles.endHandle, anchor: selectedTarget, which: 'end' as const }
            ].map(({ handle, anchor, which }, i) =>
              <React.Fragment key={i}>
                <line x1={handle.x} y1={handle.y} x2={anchor.x} y2={anchor.y} stroke="steelblue" opacity={0.8} />
                <circle cx={handle.x} cy={handle.y} r={draggedHandle === which ? 6 : 3} fill="steelblue" opacity={0.8}
                  onPointerDown={() =>
                    setDraggedHandle(which)
                  }
                />
              </React.Fragment>
            )

          )}

          {activeFormation && movePos && (
            <React.Fragment>
              <circle
                cx={movePos.x}
                cy={movePos.y}
                r={6}
                fill="red"
                onPointerDown={() => setDraggingFormationHandle('move')}
              />

              {activeFormation && (activeFormation.type === 'circle' || activeFormation.type === 'halfCircle') &&
                <circle
                cx={activeFormation.centerX + activeFormation.radius!}
                cy={activeFormation.centerY}
                r={6}
                fill="orange"
                onPointerDown={() => setDraggingFormationHandle('resize')}
              />}

              {rotateHandlePos &&
                <circle
                  cx={rotateHandlePos.x}
                  cy={rotateHandlePos.y}
                  r={6}
                  fill="orange"
                  onPointerDown={() => setDraggingFormationHandle('rotate')}
                />}

              {spacingXHandlePos && (
                <circle cx={spacingXHandlePos.x} cy={spacingXHandlePos.y} r={6} fill='orange' onPointerDown={() => setDraggingFormationHandle('resizeX')} />
              )}

              {spacingYHandlePos && (
                <circle cx={spacingYHandlePos.x} cy={spacingYHandlePos.y} r={6} fill='orange' onPointerDown={() => setDraggingFormationHandle('resizeY')} />

              )}
            </React.Fragment>
          )}
        </svg>

      </div>

      {/* BUTTONS */}
      {/* flexDirection: decides what the axis will be (row/column), justifyContent: will work ON that axis */}
      <div className='side-panel'>

        <div className='button-row'>
          <button className='tool-button' title="Save" onClick={() => saveToLocal(frames)}>
            <FontAwesomeIcon icon={faFloppyDisk} />
          </button>
          <button className='tool-button' title="Download" onClick={() => exportToFile(frames)}>
            <FontAwesomeIcon icon={faDownload} />
          </button>
          <input
            type="file"
            accept=".json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                importFromFile(file, setFrames);
              }
            }}
          ></input>
        </div>

        {/* FORMATIONS */}
        <div className='button-row'>
          <button className='tool-button' title="Circle" onClick={() => {
            const formation: FormationControl = { type: 'circle', centerX, centerY, radius };
            setActiveFormation(formation);
            updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, formation))
          }}>
            <FontAwesomeIcon icon={faCircleRegular} />
          </button>
          <button className='tool-button' title="Line" onClick={() => {
            const formation: FormationControl = {type: 'line', centerX, centerY, spacingX}
            setActiveFormation(formation);
            updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, formation))
          }}>
            <FontAwesomeIcon icon={faMinus} />
          </button>
          <button className='tool-button' title="V" onClick={() => {
            const formation: FormationControl = { type: 'vee', centerX, centerY, spacingX, spacingY };
            setActiveFormation(formation);
            updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, formation))
          }}>
            <FontAwesomeIcon icon={faChevronDown} />
          </button>
          <button className='tool-button' title="Half-Circle" onClick={() => {
            const formation: FormationControl = {type: 'halfCircle', centerX, centerY, radius};
            setActiveFormation(formation);
            updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, formation))
          }}>
            <FontAwesomeIcon icon={faU} />
          </button>
        </div>

        <div className='button-row'>
          <button className='tool-button' title="Add Frame" onClick={() => {
            const newId = crypto.randomUUID();
            const newDancers = cloneDancersToNewFrame(currentFrame.dancers);
            let framesToInsertInto = updateFrame(frames, currentFrameId, { dancers: newDancers });
            const nextFrame = frames[currentFrameIndex + 1];
            if (nextFrame) {
              const shortfall = nextFrame.startTime - (currentFrame.endTime + standardFrameLength + standardFrameGap);
              if (shortfall <= 0) {
                framesToInsertInto = shiftFrames(framesToInsertInto, currentFrameIndex + 1, -shortfall)
              }
            }
            setFrames(addFrameAfter(framesToInsertInto, currentFrameIndex, { "id": newId, dancers: newDancers, startTime: currentFrame.endTime + standardFrameGap, endTime: currentFrame.endTime + standardFrameLength + standardFrameGap }));
            setCurrentFrameId(newId);
          }}>
            <FontAwesomeIcon icon={faPlus} />

          </button>
          <button className='tool-button' title="Next Frame" onClick={() => {
            const nextFrameIndex = currentFrameIndex + 1;
            if (currentFrameIndex < frames.length - 1) {
              setCurrentFrameId(frames[nextFrameIndex].id);
            }
          }
          }>
            <FontAwesomeIcon icon={faArrowRight} />

          </button>
          <button className='tool-button' title="Previous Frame" onClick={() => {
            const prevFrameIndex = currentFrameIndex - 1;
            if (currentFrameIndex > 0) {
              setCurrentFrameId(frames[prevFrameIndex].id);
            }
          }
          }>
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        </div>


        <div className='button-row'>
          <h2>
            Frame {currentFrameIndex} <br />
          </h2>
        </div>

        <div className='button-row'>
          <button className='tool-button' title="Edit Dancer" disabled={selectedId == null}
            onClick={() => setEditingDancerId(selectedId)}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>

          <button className='tool-button' title="Swap Dancers" disabled={selectedId == null}
            onClick={() => setSwapping(true)}>
            <FontAwesomeIcon icon={faRightLeft} />
          </button>
        </div>

        <div className='button-row'>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={interpolationTime}
            onChange={(e) => setInterpolationTime(Number(e.target.value))}
          />

          <input type="number" value={currentFrame.startTime} onChange={(e) => {
            const clamped = clamp(prevFrame?.endTime ?? 0, currentFrame.endTime, Number(e.target.value))
            setFrames(updateFrame(frames, currentFrameId, { startTime: clamped }))
          }}
          />
          <input type="number" value={currentFrame.endTime} onChange={(e) => {
            const clamped = clamp(currentFrame.startTime, nextFrame?.startTime ?? Infinity, Number(e.target.value))
            setFrames(updateFrame(frames, currentFrameId, { endTime: clamped }))
          }} />

        </div>
      </div>
    </div>
  );
}