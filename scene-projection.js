// A single ground plane, measured in metres. Viewport panning/zooming happens later.
export function createGroundProjection({horizonY=260,centreX=836,cameraHeight=4,focalLength=1000}={}){
 if(!(cameraHeight>0&&focalLength>0))throw new RangeError('Invalid camera');
 function pixelsPerMetre(groundY){if(!Number.isFinite(groundY)||groundY<=horizonY)throw new RangeError('Ground must be below horizon');return(groundY-horizonY)/cameraHeight;}
 function place({centre,groundY,heightMetres,sourceSize,elevationMetres=0}){
  if(!(heightMetres>0&&sourceSize?.[0]>0&&sourceSize?.[1]>0))throw new RangeError('Invalid object size');
  const scale=pixelsPerMetre(groundY),height=heightMetres*scale,width=height*sourceSize[0]/sourceSize[1];
  return{x:centre-width/2,y:groundY-elevationMetres*scale-height,width,height,groundY};
 }
 function project({x,z,height=0}){if(!(z>0))throw new RangeError('Depth must be positive');return{x:centreX+focalLength*x/z,y:horizonY+focalLength*(cameraHeight-height)/z};}
 function unprojectGround({x,y}){const ppm=pixelsPerMetre(y);return{x:(x-centreX)/ppm,z:focalLength/ppm};}
 return{pixelsPerMetre,place,project,unprojectGround,camera:{horizonY,centreX,cameraHeight,focalLength}};
}
