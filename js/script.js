let dim, fx;

// Ignoren esto, es copy paste de funciones de ruido.
const noiseFunc = `
float rand(vec2 n) { 
  return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u*u*(3.0-2.0*u);
	
  float res = mix(
    mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
    mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
	
  return res*res;
}`;

const frag = `
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform sampler2D tex0;

varying vec2 vTexCoord;

${noiseFunc}

void main() {
  vec2 uv = vTexCoord;

  /**
    Esta idea es que "distorsionen" la imagen final que contiene el texto, algo asi como Photoshop, cuando distorsionan una capa con los graficos que tiene (texto, imagenes, etc.)
    
    En este caso uv con las coordenadas XY donde se dibuja todo lo que contiene el canvas, es decir el texto de PRESUNTO DEPREDADOR.
    
    A una distorsion en X y Y de frequencias de ondas le agregamos un poco de "turbulencia" con el comportamiento de ruido o noise  
  **/
  

  // Pueden explorar aquí:

  // Noise
  float nfreq = 3.0;
  float namp = 10.0;
  float nspeed = 0.25;
  float noi = noise(uv * nfreq + uTime * nspeed) * namp;

  // Agregar onda con ruido a las coordenadas que crean la textura con el texto
  float freq = 10.0;
  float speed = 2.0;
  float amp = 0.025;

  // Dentro de las ondas pueden agregar uMouse.x / uMouse.y (o ambos) para que al mover el mouse cambie el comportamiento. Utilizenlo para modificar frequencias, amplitude, velocidad, lo que les venga a la imaginación :)
  
  uv.x += sin(uv.y * freq + noi + uTime * speed) * amp;
  uv.y += cos(uv.y * freq + noi + uTime * speed) * amp;

  gl_FragColor = texture2D(tex0, uv);
}`;

function setup() {
  createCanvas(400, 400);

  dim = max(width, height);  
  
  fx = createFilterShader(frag);
}

function draw() {
  // Instrucciones para dibujar el texto en el canvas
 // background(0);
  //fill(255);
 // noStroke();
  //textFont('Helvetica');
  //textStyle(BOLD);
  //textAlign(LEFT, CENTER);
//   textSize(dim * 0.12);
//   text('PRESUNTO\nDEPREDADOR', dim * 0.05, height / 2);

  // Crea el filtro (o shader) para el efecto
  fx.setUniform('uTime', millis() / 1000);
  const normalizedMouseX = constrain(mouseX / width, 0, 1);
  const normalizedMouseY = constrain(mouseY / height, 0, 1);
  fx.setUniform('uMouse', [normalizedMouseX, normalizedMouseY]);  
  filter(fx);
}
















