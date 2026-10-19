
import './App.css'
import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircle as faCircleRegular } from '@fortawesome/free-regular-svg-icons';
import {
  faMinus, faU, faChevronDown, faPlus, faArrowRight, faArrowLeft, faPenToSquare, faRightLeft,
  faFloppyDisk, faDownload, faPlusCircle,
  faMinusCircle
} from '@fortawesome/free-solid-svg-icons';



import type { Dancer, FormationControl, Frame, Point } from './types'
import {
  updateDancer, swapDancers, cloneDancersToNewFrame
} from './dancerHelpers'
import { updateFrame, addFrameAfter, shiftFrames, addDancer, deleteDancer } from './frameHelpers'
import { interpolateFrames, getHandles, moveHandles, rotatePoint } from './pathHelpers'
import { saveToLocal, loadFromLocal, importFromFile, exportToFile } from './persistence'
import {
  svgHeight, svgWidth, spacingX, spacingY, centerX, centerY, radius, standardFrameGap, standardFrameLength, rotateHandleOffset,
  selectBoxColor, selectBoxOpacity, selectBoxStroke, selectBoxStrokeWidth, rectangleThreshold
} from './constants'
import { computeFormationDancers, getMidpointOffsetY, getRotateHandleReach, updateFormationFromDrag } from './formationHelpers';

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

  const [theme, setTheme] = useState<'afterhours' | 'spotlight'>('afterhours');

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // used to control if currently, the swap option is selected
  const [swapping, setSwapping] = useState<boolean>(false);

  const [draggedHandle, setDraggedHandle] = useState<{ dancerId: string, which: 'start' | 'end' } | null>(null);

  const [draggingFormationHandle, setDraggingFormationHandle] = useState<'move' | 'resize' | 'resizeX' | 'resizeY' | 'rotate' | null>(null);

  const [activeFormation, setActiveFormation] = useState<FormationControl | null>(null);

  const [rectangleStartCoordinates, setRectangleStartCoordinates] = useState<Point | null>(null)
  const [rectangleEndCoordinates, setRectangleEndCoordinates] = useState<Point | null>(null)

  const svgRef = useRef<SVGSVGElement>(null); // useref gives a box that holds values between re-renders, unlike usestate


  const centerIndex = (currentFrame.dancers.length - 1) / 2;

  const selectedDancer = selectedIds.length === 1 ? currentFrame.dancers.find((d) => d.id === selectedIds[0]) : undefined// returns the dancer object
  const selectedTarget = selectedIds.length === 1 ? nextFrame?.dancers.find((d) => d.id === selectedIds[0]) : undefined;
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

      <div className='side-spacer'>
        <button onClick={() => {
          const next = theme === 'afterhours' ? 'spotlight' : 'afterhours';
          setTheme(next);
          document.documentElement.setAttribute('data-theme', next);
        }}>
          {theme}
        </button>

        <select onChange={(e) =>{
          document.documentElement.style.setProperty('--sans', e.target.value)
        }}>
          <option value="'Space Grotesk'"> Space Grotesk</option>
          <option value="'Inter Tight'"> Inter Tight</option>
          <option value="'Bricolage Grotesque'"> Bricolage Grotesque</option>
          <option value="'Roboto Condensed'"> Roboto Condensed</option>
        </select>
      </div>

      <div className='stage-wrapper'>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ height: '100vh', aspectRatio: '4/3', border: '1px solid #ccc' }}
          ref={svgRef}

          onPointerDown={(e) => {
            setRectangleStartCoordinates(getSvgCoords(e))
          }}

          onPointerMove={(e) => {
            const { x, y } = getSvgCoords(e);
            if (rectangleStartCoordinates != null) {
              setRectangleEndCoordinates(getSvgCoords(e));
            }
            if (draggedHandle != null) {
              const dancer = currentFrame.dancers.find((d) => d.id === draggedHandle.dancerId)!;
              const target = nextFrame.dancers.find((d) => d.id === draggedHandle.dancerId);

              if (target) {
                const handles = getHandles(dancer, target);
                updateCurrentFrameDancers(updateDancer(currentFrame.dancers, draggedHandle.dancerId,
                  {
                    pathToNext: moveHandles(handles, draggedHandle.which, { x, y })
                  }
                ))
              }

              return;
            }

            if (draggedId != null) {
              updateCurrentFrameDancers(updateDancer(currentFrame.dancers, draggedId, { x, y }));
            }

            if (draggingFormationHandle && activeFormation) {
              const updatedFormation = updateFormationFromDrag(activeFormation, draggingFormationHandle, { x, y }, centerIndex);
              setActiveFormation(updatedFormation);
              updateCurrentFrameDancers(computeFormationDancers(currentFrame.dancers, updatedFormation));
              return;
            }
          }
          }

          onPointerUp={(e) => {
            setDraggedId(null);
            setDraggedHandle(null);
            setDraggingFormationHandle(null);
            const endCoords = getSvgCoords(e); // using setRectangleEndCoordinates here wouldnt update, so passing the coords onto a local variable allows me to use them

            if (rectangleStartCoordinates && endCoords) {
              const startX = Math.min(rectangleStartCoordinates.x, endCoords.x)
              const startY = Math.min(rectangleStartCoordinates.y, endCoords.y)
              const endX = Math.max(rectangleStartCoordinates.x, endCoords.x)
              const endY = Math.max(rectangleStartCoordinates.y, endCoords.y)
              const width = Math.abs(rectangleStartCoordinates.x - endCoords.x)
              const height = Math.abs(rectangleStartCoordinates.y - endCoords.y)
              if ((width < rectangleThreshold) || (height < rectangleThreshold)) {
                setSwapping(false);
                setSelectedIds([]);
              }
              else {
                const selectedDancers = currentFrame.dancers.filter((d) => (d.x > startX && d.x < endX && d.y > startY && d.y < endY))
                setSelectedIds(selectedDancers.map((d) => d.id))
              }
            }
            setRectangleStartCoordinates(null);
            setRectangleEndCoordinates(null);
          }}
        >
          {/* a && b returns a if a is false, otherwise, returns b */}
          {/* render the dancers' future places */}

          {nextFrame && nextFrame.dancers.map((dancer) => (
            <circle
              className='dancer-ghost'
              key={dancer.id}
              cx={dancer.x}
              cy={dancer.y}
              r={10}
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
                className='next-frame-path'
                key={dancer.id}
                d={`M ${dancer.x} ${dancer.y} C ${startHandle.x} ${startHandle.y}, ${endHandle.x} ${endHandle.y}, ${target.x} ${target.y}`}
              />
            )
          })}
          {displayedDancers.map((dancer) =>
          (
            <React.Fragment key={dancer.id} /* Fragment is a React element that groups multiple elements into a  single one */ >
              <circle
                className={selectedIds.includes(dancer.id) ? 'dancer-selected' : 'dancer'}
                cx={dancer.x} cy={dancer.y} r={10}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (swapping && selectedIds != null && dancer.id != selectedIds[0]) {
                    updateCurrentFrameDancers(swapDancers(currentFrame.dancers, selectedIds[0], dancer.id));
                    setSwapping(false);
                    setSelectedIds([]);
                    return;
                  }
                  setDraggedId(dancer.id);
                  if (e.shiftKey) {
                    let updatedIds = selectedIds;

                    if (selectedIds.includes(dancer.id)) {
                      updatedIds = selectedIds.filter((id) => id !== dancer.id)
                    }
                    else {
                      const selectedId = dancer.id;
                      updatedIds = [...selectedIds, selectedId]
                    }

                    setSelectedIds(updatedIds)
                  }
                  else { setSelectedIds([dancer.id]) }
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
                  className='dancer-label'
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
                <circle cx={handle.x} cy={handle.y} r={draggedHandle?.which === which ? 6 : 3} fill="steelblue" opacity={0.8}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggedHandle({ dancerId: selectedDancer.id, which })
                  }
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
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingFormationHandle('move')
                }}
              />

              {activeFormation && (activeFormation.type === 'circle' || activeFormation.type === 'halfCircle') &&
                <circle
                  cx={activeFormation.centerX + activeFormation.radius!}
                  cy={activeFormation.centerY}
                  r={6}
                  fill="orange"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingFormationHandle('resize')
                  }}
                />}

              {rotateHandlePos &&
                <circle
                  cx={rotateHandlePos.x}
                  cy={rotateHandlePos.y}
                  r={6}
                  fill="orange"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingFormationHandle('rotate')
                  }}
                />}

              {spacingXHandlePos && (
                <circle cx={spacingXHandlePos.x} cy={spacingXHandlePos.y} r={6} fill='orange'
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingFormationHandle('resizeX')
                  }} />
              )}

              {spacingYHandlePos && (
                <circle cx={spacingYHandlePos.x} cy={spacingYHandlePos.y} r={6} fill='orange'
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggingFormationHandle('resizeY')
                  }} />

              )}
            </React.Fragment>
          )}

          {rectangleStartCoordinates && rectangleEndCoordinates && (
            <rect
              x={Math.min(rectangleStartCoordinates.x, rectangleEndCoordinates.x)}
              y={Math.min(rectangleStartCoordinates.y, rectangleEndCoordinates.y)}
              width={Math.abs(rectangleStartCoordinates.x - rectangleEndCoordinates.x)}
              height={Math.abs(rectangleStartCoordinates.y - rectangleEndCoordinates.y)}
              fill={selectBoxColor}
              opacity={selectBoxOpacity}
              stroke={selectBoxStroke}
              strokeWidth={selectBoxStrokeWidth}
            >
            </rect>
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

        <div className='button-row'>
          <button className='tool-button' title='Add Dancer' onClick={() =>
            setFrames(addDancer(frames, { id: crypto.randomUUID(), x: centerX, y: centerY, label: `Dancer ${currentFrame.dancers.length + 1}` }))}>
            <FontAwesomeIcon icon={faPlusCircle} />
          </button>
          <button className='tool-button' title='Remove Dancer' disabled={selectedIds.length !== 1}
            onClick={() => setFrames(deleteDancer(frames, selectedIds[0]))}>
            <FontAwesomeIcon icon={faMinusCircle} />
          </button>
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
            const formation: FormationControl = { type: 'line', centerX, centerY, spacingX }
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
            const formation: FormationControl = { type: 'halfCircle', centerX, centerY, radius };
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
          <button className='tool-button' title="Edit Dancer" disabled={selectedIds.length !== 1}
            onClick={() => setEditingDancerId(selectedIds[0])}>
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>

          <button className='tool-button' title="Swap Dancers" disabled={selectedIds.length > 2}
            onClick={() => {
              if (selectedIds.length == 1) {
                setSwapping(true)
              }
              else {
                updateCurrentFrameDancers(swapDancers(currentFrame.dancers, selectedIds[0], selectedIds[1]))
                setSelectedIds([]);
              }
            }
            }>
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