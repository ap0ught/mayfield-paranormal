import React, {useEffect, useRef, useState} from 'react';
import {Park3DRenderer} from './park-3d-scene.js';

/**
 * This is a true WebGL perspective scene. The camera is FIXED for each zone.
 * The actor data comes from the very same simulation as Detail 1 and Detail 2.
 */
export function ParkLive3D({zoneId,actors,lightsOn,trapActive=false,playing=true}) {
  const canvasRef=useRef(null);
  const rendererRef=useRef(null);
  const stateRef=useRef({zoneId,actors,lightsOn,trapActive,playing});
  const frameRef=useRef(0);
  const [error,setError]=useState(null);
  stateRef.current={zoneId,actors,lightsOn,trapActive,playing};
  useEffect(()=>{
    const canvas=canvasRef.current;
    let renderer;
    try {renderer=new Park3DRenderer(canvas);rendererRef.current=renderer;}
    catch(e){setError(e.message);return;}
    let mounted=true,req=0,last=0;
    const draw=timestamp=>{
      if(!mounted)return;
      const state=stateRef.current;
      if(state.playing){
        frameRef.current+=(last?Math.min(.05,(timestamp-last)/1000):0);
      }
      last=timestamp;
      try {
        const bounds=canvas.getBoundingClientRect();
        renderer.render({...state,time:frameRef.current,width:bounds.width,height:bounds.height});
      } catch(e){setError(e.message);mounted=false;return;}
      req=requestAnimationFrame(draw);
    };
    req=requestAnimationFrame(draw);
    return ()=>{mounted=false;cancelAnimationFrame(req);rendererRef.current=null;renderer.dispose();};
  },[]);
  return <div className="park-3d-stage" data-detail="3" data-rendering="3d-webgl" data-camera="fixed" data-zone={zoneId}>
    <canvas ref={canvasRef} aria-label={`Fixed-camera 3D view of ${zoneId}`} />
    {error&&<div className="park3d-error">3D renderer unavailable: {error}</div>}
    <span className="park-stage-badge">3D · FIXED CAMERA</span>
  </div>;
}

/**
 * Detail 2 is not a second hand-painted room. It takes a rasterized, low-res
 * STILL of precisely the same 3D geometry and same camera as Detail 3.
 * Only the caller's 1.3-second snapshot actor state updates this image.
 */
export function Park2DSnapshot({zoneId,actors,lightsOn,snapshotFrame=0}) {
  const rendererRef=useRef(null);
  const sourceCanvasRef=useRef(null);
  const [shot,setShot]=useState(null);
  const [error,setError]=useState(null);
  useEffect(()=>{
    const canvas=document.createElement('canvas');
    canvas.width=320;
    canvas.height=196;
    sourceCanvasRef.current=canvas;
    try{rendererRef.current=new Park3DRenderer(canvas,{preserveDrawingBuffer:true});}
    catch(e){setError(e.message);}
    return()=>{rendererRef.current?.dispose();rendererRef.current=null;sourceCanvasRef.current=null;};
  },[]);
  useEffect(()=>{
    const renderer=rendererRef.current;
    if(!renderer)return;
    try {
      renderer.render({zoneId,actors,lightsOn,trapActive:false,time:snapshotFrame*.13,width:320,height:196});
      // This data URL is a standard 2D PNG, NOT a WebGL/video stream.
      setShot(sourceCanvasRef.current.toDataURL('image/png'));
    }catch(e){setError(e.message);}
  },[zoneId,actors,lightsOn,snapshotFrame]);
  return <div className="park-2d-stage" data-detail="2" data-rendering="3d-to-2d-snapshot" data-zone={zoneId}>
    {shot ? <img src={shot} alt={`2D stop-motion still from ${zoneId} fixed 3D camera`}/> : <div className="park-snapshot-loading">{error?'Camera unavailable':'Converting 3D scene to 2D…'}</div>}
    <span className="park-snapshot-badge">2D · SNAPSHOT</span>
  </div>;
}
