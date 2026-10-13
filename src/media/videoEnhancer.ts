// Local edge-limited unsharp masking and mild bilateral noise reduction.
// No remote API, model, generated detail, transcoding or change to stored media.
const vertex=`attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;
export const clarityFragment=`precision mediump float;
uniform sampler2D image;uniform vec2 stepSize;uniform float intensity;varying vec2 uv;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
void main(){
 vec3 c=texture2D(image,uv).rgb;
 vec3 n=texture2D(image,uv+vec2(0.,stepSize.y)).rgb;
 vec3 s=texture2D(image,uv-vec2(0.,stepSize.y)).rgb;
 vec3 e=texture2D(image,uv+vec2(stepSize.x,0.)).rgb;
 vec3 w=texture2D(image,uv-vec2(stepSize.x,0.)).rgb;
 vec3 diagonal=texture2D(image,uv+stepSize).rgb+texture2D(image,uv-stepSize).rgb+texture2D(image,uv+vec2(stepSize.x,-stepSize.y)).rgb+texture2D(image,uv+vec2(-stepSize.x,stepSize.y)).rgb;
 vec3 blur=(n+s+e+w+diagonal+c*4.)/12.;
 float contrast=abs(luma(c)-luma(blur));
 // Leave flat areas mostly untouched to avoid amplifying compression noise.
 float amount=clamp(intensity,0.,1.);
 float gain=4.5*amount*amount;
 float limit=.18*amount;
 vec3 sharp=clamp((c-blur)*gain,vec3(-limit),vec3(limit));
 vec3 outColor=c+sharp*smoothstep(.003,.018,contrast);
 float wn=exp(-abs(luma(n)-luma(c))*35.);
 float ws=exp(-abs(luma(s)-luma(c))*35.);
 float we=exp(-abs(luma(e)-luma(c))*35.);
 float ww=exp(-abs(luma(w)-luma(c))*35.);
 vec3 smoothColor=(c*4.+n*wn+s*ws+e*we+w*ww)/(4.+wn+ws+we+ww);
 outColor=mix(outColor,smoothColor,.22*amount*(1.-smoothstep(.003,.018,contrast)));
 gl_FragColor=vec4(clamp(outColor,0.,1.),1.);
}`;
export function startVideoEnhancer(video:HTMLVideoElement,canvas:HTMLCanvasElement,onReady:()=>void,onFallback:()=>void,getIntensity:()=>number=()=>70){
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
 if(!gl){onFallback();return()=>{};}
 let stopped=false,frame=0,raf=0,slow=0,announced=false;
 const shaders:WebGLShader[]=[];
 const compile=(kind:number,source:string)=>{const s=gl.createShader(kind);if(!s)throw Error('shader');shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('shader');return s;};
 let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,texture:WebGLTexture|null=null;
 function dispose(){if(stopped)return;stopped=true;if(frame)video.cancelVideoFrameCallback?.(frame);if(raf)cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',lost);if(texture)gl!.deleteTexture(texture);if(buffer)gl!.deleteBuffer(buffer);if(program)gl!.deleteProgram(program);shaders.forEach(s=>gl!.deleteShader(s));gl!.getExtension('WEBGL_lose_context')?.loseContext();}
 function fallback(){onFallback();dispose();}
 function lost(){fallback();}
 function schedule(){if(stopped||video.paused||document.hidden)return;if(video.requestVideoFrameCallback)frame=video.requestVideoFrameCallback(draw);else raf=requestAnimationFrame(draw);}
 function draw(){if(stopped||document.hidden||video.readyState<2){schedule();return;}
  try{const start=performance.now(),w=video.videoWidth,h=video.videoHeight;
   // Avoid oversized GPU textures or downsampling an already high resolution source.
   if(!w||!h||w>1920||h>1920){fallback();return;}
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl!.viewport(0,0,w,h);}
   gl!.texImage2D(gl!.TEXTURE_2D,0,gl!.RGB,gl!.RGB,gl!.UNSIGNED_BYTE,video);
   gl!.uniform2f(gl!.getUniformLocation(program!,'stepSize'),1/w,1/h);
   gl!.uniform1f(gl!.getUniformLocation(program!,'intensity'),Math.min(100,Math.max(0,getIntensity()))/100);
   gl!.drawArrays(gl!.TRIANGLE_STRIP,0,4);
   if(gl!.getError()!==gl!.NO_ERROR){fallback();return;}
   if(!announced){announced=true;onReady();}
   slow=performance.now()-start>20?slow+1:Math.max(0,slow-1);if(slow>=8){fallback();return;}
  }catch{fallback();return;}
  schedule();
 }
 try{program=gl.createProgram();if(!program)throw Error('program');gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,clarityFragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('link');gl.useProgram(program);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,1);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(gl.getUniformLocation(program,'image'),0);
  canvas.addEventListener('webglcontextlost',lost);draw();
 }catch{fallback();}
 return dispose;
}
