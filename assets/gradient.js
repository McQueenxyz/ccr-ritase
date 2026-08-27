/* ============================================================
   AnimatedGradient — port vanilla dari komponen React "animated-gradient".
   Shader WebGL2 dipertahankan apa adanya; hanya lapisan React (hooks/JSX)
   yang diganti API biasa: AnimatedGradient.mount(el, opts) / .destroy(el)

   Catatan kinerja: aplikasi ini dipakai di HP lapangan, jadi:
   - devicePixelRatio dibatasi 1.5 (hemat GPU/baterai)
   - animasi berhenti saat tab tidak terlihat & saat elemen dilepas
   - hormati prefers-reduced-motion (render 1 frame statis)
   - kalau WebGL2 tak tersedia → diam-diam tidak melakukan apa-apa
     sehingga latar CSS biasa tetap dipakai (tidak ada layar kosong).
   ============================================================ */
(function () {
  "use strict";

  var SHAPES = { Checks: 0, Stripes: 1, Edge: 2 };

  var PRESETS = {
    Prism:  { color1: "#050505", color2: "#66B3FF", color3: "#FFFFFF", rotation: -50, proportion: 1,   scale: 0.01, speed: 30, distortion: 0,  swirl: 50,  swirlIterations: 16, softness: 47,  offset: -299, shape: "Checks",  shapeSize: 45 },
    Lava:   { color1: "#FF9F21", color2: "#FF0303", color3: "#000000", rotation: 114, proportion: 100, scale: 0.52, speed: 30, distortion: 7,  swirl: 18,  swirlIterations: 20, softness: 100, offset: 717,  shape: "Edge",    shapeSize: 12 },
    Plasma: { color1: "#B566FF", color2: "#000000", color3: "#000000", rotation: 0,   proportion: 63,  scale: 0.75, speed: 30, distortion: 5,  swirl: 61,  swirlIterations: 5,  softness: 100, offset: -168, shape: "Checks",  shapeSize: 28 },
    Pulse:  { color1: "#66FF85", color2: "#000000", color3: "#000000", rotation: -167, proportion: 92, scale: 0,    speed: 20, distortion: 54, swirl: 75,  swirlIterations: 3,  softness: 28,  offset: -813, shape: "Checks",  shapeSize: 79 },
    Vortex: { color1: "#000000", color2: "#FFFFFF", color3: "#000000", rotation: 50,  proportion: 41,  scale: 0.4,  speed: 20, distortion: 0,  swirl: 100, swirlIterations: 3,  softness: 5,   offset: -744, shape: "Stripes", shapeSize: 80 },
    Mist:   { color1: "#050505", color2: "#FF66B8", color3: "#050505", rotation: 0,   proportion: 33,  scale: 0.48, speed: 39, distortion: 4,  swirl: 65,  swirlIterations: 5,  softness: 100, offset: -235, shape: "Edge",    shapeSize: 48 }
  };

  var NOISE_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwBAMAAAClLOS0AAAAElBMVEUAAAAAAAAAAAAAAAAAAAAAAADgKxmiAAAABnRSTlMCCgkGBAVJOAVJAAAASklEQVQ4y2NgGAWjYBSMglEwCgY/YGRgZBQUYmJiZGQEkYwMjIyMgoKCjIyMIJKBgRFIMjIyAklGRkYGRkFBYEcwMDIyMjAOUQAA1I4HwVwZAkYAAAAASUVORK5CYII=";

  function hslToRgb(h, s, l) {
    var r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
      var hue2rgb = function (p, q, t) {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
  }

  function hexToRgba(hex) {
    var r = 0, g = 0, b = 0, a = 1, parts, c;
    if (hex.indexOf("rgba(") === 0) {
      parts = hex.slice(5, -1).split(",");
      r = parseInt(parts[0], 10) / 255; g = parseInt(parts[1], 10) / 255; b = parseInt(parts[2], 10) / 255; a = parseFloat(parts[3]);
    } else if (hex.indexOf("rgb(") === 0) {
      parts = hex.slice(4, -1).split(",");
      r = parseInt(parts[0], 10) / 255; g = parseInt(parts[1], 10) / 255; b = parseInt(parts[2], 10) / 255;
    } else if (hex.indexOf("hsla(") === 0 || hex.indexOf("hsl(") === 0) {
      var isHsla = hex.indexOf("hsla(") === 0;
      parts = hex.slice(isHsla ? 5 : 4, -1).split(",");
      var rgb = hslToRgb(parseFloat(parts[0]) / 360, parseFloat(parts[1]) / 100, parseFloat(parts[2]) / 100);
      r = rgb[0]; g = rgb[1]; b = rgb[2]; a = isHsla ? parseFloat(parts[3]) : 1;
    } else if (hex.charAt(0) === "#") {
      c = hex.slice(1);
      if (c.length === 3) {
        r = parseInt(c[0] + c[0], 16) / 255; g = parseInt(c[1] + c[1], 16) / 255; b = parseInt(c[2] + c[2], 16) / 255;
      } else if (c.length >= 6) {
        r = parseInt(c.slice(0, 2), 16) / 255; g = parseInt(c.slice(2, 4), 16) / 255; b = parseInt(c.slice(4, 6), 16) / 255;
        if (c.length === 8) a = parseInt(c.slice(6, 8), 16) / 255;
      }
    }
    return [r, g, b, a];
  }

  var VERT = "#version 300 es\nin vec4 a_position;\nvoid main(){ gl_Position = a_position; }";

  var FRAG = "#version 300 es\n\
precision highp float;\n\
uniform float u_time; uniform float u_pixelRatio; uniform vec2 u_resolution;\n\
uniform float u_scale; uniform float u_rotation;\n\
uniform vec4 u_color1; uniform vec4 u_color2; uniform vec4 u_color3;\n\
uniform float u_proportion; uniform float u_softness; uniform float u_shape;\n\
uniform float u_shapeScale; uniform float u_distortion; uniform float u_swirl; uniform float u_swirlIterations;\n\
out vec4 fragColor;\n\
#define TWO_PI 6.28318530718\n\
#define PI 3.14159265358979323846\n\
vec2 rotate(vec2 uv, float th){ return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv; }\n\
float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }\n\
float noise(vec2 st){\n\
  vec2 i = floor(st); vec2 f = fract(st);\n\
  float a = random(i); float b = random(i + vec2(1.0,0.0));\n\
  float c = random(i + vec2(0.0,1.0)); float d = random(i + vec2(1.0,1.0));\n\
  vec2 u = f * f * (3.0 - 2.0 * f);\n\
  float x1 = mix(a,b,u.x); float x2 = mix(c,d,u.x);\n\
  return mix(x1,x2,u.y);\n\
}\n\
vec4 blend_colors(vec4 c1, vec4 c2, vec4 c3, float mixer, float edgesWidth, float edge_blur){\n\
  vec3 color1 = c1.rgb * c1.a; vec3 color2 = c2.rgb * c2.a; vec3 color3 = c3.rgb * c3.a;\n\
  float r1 = smoothstep(.0 + .35*edgesWidth, .7 - .35*edgesWidth + .5*edge_blur, mixer);\n\
  float r2 = smoothstep(.3 + .35*edgesWidth, 1. - .35*edgesWidth + edge_blur, mixer);\n\
  vec3 blended_color_2 = mix(color1, color2, r1);\n\
  float blended_opacity_2 = mix(c1.a, c2.a, r1);\n\
  vec3 c = mix(blended_color_2, color3, r2);\n\
  float o = mix(blended_opacity_2, c3.a, r2);\n\
  return vec4(c, o);\n\
}\n\
void main(){\n\
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;\n\
  float t = .5 * u_time;\n\
  float noise_scale = .0005 + .006 * u_scale;\n\
  uv -= .5; uv *= (noise_scale * u_resolution); uv = rotate(uv, u_rotation * .5 * PI); uv /= u_pixelRatio; uv += .5;\n\
  float n1 = noise(uv * 1. + t); float n2 = noise(uv * 2. - t);\n\
  float angle = n1 * TWO_PI;\n\
  uv.x += 4. * u_distortion * n2 * cos(angle);\n\
  uv.y += 4. * u_distortion * n2 * sin(angle);\n\
  float iterations_number = ceil(clamp(u_swirlIterations, 1., 30.));\n\
  for (float i = 1.; i <= iterations_number; i++){\n\
    uv.x += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1.5 * uv.y);\n\
    uv.y += clamp(u_swirl, 0., 2.) / i * cos(t + i * 1. * uv.x);\n\
  }\n\
  float proportion = clamp(u_proportion, 0., 1.);\n\
  float shape = 0.; float mixer = 0.;\n\
  if (u_shape < .5){\n\
    vec2 checks_shape_uv = uv * (.5 + 3.5 * u_shapeScale);\n\
    shape = .5 + .5 * sin(checks_shape_uv.x) * cos(checks_shape_uv.y);\n\
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);\n\
  } else if (u_shape < 1.5){\n\
    vec2 stripes_shape_uv = uv * (.25 + 3. * u_shapeScale);\n\
    float f = fract(stripes_shape_uv.y);\n\
    shape = smoothstep(.0, .55, f) * smoothstep(1., .45, f);\n\
    mixer = shape + .48 * sign(proportion - .5) * pow(abs(proportion - .5), .5);\n\
  } else {\n\
    float sh = 1. - uv.y; sh -= .5; sh /= (noise_scale * u_resolution.y); sh += .5;\n\
    float shape_scaling = .2 * (1. - u_shapeScale);\n\
    shape = smoothstep(.45 - shape_scaling, .55 + shape_scaling, sh + .3 * (proportion - .5));\n\
    mixer = shape;\n\
  }\n\
  vec4 color_mix = blend_colors(u_color1, u_color2, u_color3, mixer, 1. - clamp(u_softness, 0., 1.), .01 + .01 * u_scale);\n\
  fragColor = vec4(color_mix.rgb, color_mix.a);\n\
}";

  var instances = [];

  function resolveParams(config) {
    config = config || { preset: "Prism" };
    if (config.preset === "custom") {
      return {
        color1: config.color1, color2: config.color2, color3: config.color3,
        rotation: config.rotation != null ? config.rotation : 0,
        proportion: config.proportion != null ? config.proportion : 35,
        scale: config.scale != null ? config.scale : 1,
        speed: config.speed != null ? config.speed : 25,
        distortion: config.distortion != null ? config.distortion : 12,
        swirl: config.swirl != null ? config.swirl : 80,
        swirlIterations: config.swirlIterations != null ? config.swirlIterations : 10,
        softness: config.softness != null ? config.softness : 100,
        offset: config.offset != null ? config.offset : 0,
        shape: config.shape || "Checks",
        shapeSize: config.shapeSize != null ? config.shapeSize : 10
      };
    }
    var p = PRESETS[config.preset] || PRESETS.Prism, out = {};
    for (var k in p) out[k] = p[k];
    if (config.speed != null) out.speed = config.speed;
    return out;
  }

  function mount(container, opts) {
    if (!container) return null;
    opts = opts || {};
    var params = resolveParams(opts.config);

    var host = document.createElement("div");
    host.className = "agrad" + (opts.className ? " " + opts.className : "");
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    var gl = null;
    try {
      gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true });
    } catch (e) { gl = null; }
    if (!gl) return null; // tanpa WebGL2 → biarkan latar CSS biasa

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERT); gl.compileShader(vs);
    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FRAG); gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    var posLoc = gl.getAttribLocation(prog, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ["u_time", "u_resolution", "u_pixelRatio", "u_scale", "u_rotation", "u_color1", "u_color2", "u_color3",
      "u_proportion", "u_softness", "u_shape", "u_shapeScale", "u_distortion", "u_swirl", "u_swirlIterations"
    ].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    // batasi DPR agar hemat GPU di HP
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    function resize() {
      var w = container.clientWidth || window.innerWidth;
      var h = container.clientHeight || window.innerHeight;
      canvas.width = Math.max(1, Math.round(w * DPR));
      canvas.height = Math.max(1, Math.round(h * DPR));
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    if (opts.noise && opts.noise.opacity > 0) {
      var nz = document.createElement("div");
      nz.className = "agrad-noise";
      nz.style.backgroundImage = 'url("' + NOISE_PNG + '")';
      nz.style.backgroundSize = ((opts.noise.scale != null ? opts.noise.scale : 1) * 200) + "px";
      nz.style.opacity = String(opts.noise.opacity / 2);
      host.appendChild(nz);
    }
    if (opts.radius) host.style.borderRadius = opts.radius;
    container.insertBefore(host, container.firstChild);
    resize();

    var ro = null;
    if (window.ResizeObserver) { ro = new ResizeObserver(resize); ro.observe(container); }
    else window.addEventListener("resize", resize);

    var c1 = hexToRgba(params.color1), c2 = hexToRgba(params.color2), c3 = hexToRgba(params.color3);
    function draw(elapsed) {
      var speed = (params.speed / 100) * 5;
      gl.uniform1f(U.u_time, elapsed * speed + params.offset * 0.01);
      gl.uniform2f(U.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(U.u_pixelRatio, DPR);
      gl.uniform1f(U.u_scale, params.scale);
      gl.uniform1f(U.u_rotation, (params.rotation * Math.PI) / 180);
      gl.uniform4f(U.u_color1, c1[0], c1[1], c1[2], c1[3]);
      gl.uniform4f(U.u_color2, c2[0], c2[1], c2[2], c2[3]);
      gl.uniform4f(U.u_color3, c3[0], c3[1], c3[2], c3[3]);
      gl.uniform1f(U.u_proportion, params.proportion / 100);
      gl.uniform1f(U.u_softness, params.softness / 100);
      gl.uniform1f(U.u_shape, SHAPES[params.shape] || 0);
      gl.uniform1f(U.u_shapeScale, params.shapeSize / 100);
      gl.uniform1f(U.u_distortion, params.distortion / 50);
      gl.uniform1f(U.u_swirl, params.swirl / 100);
      gl.uniform1f(U.u_swirlIterations, params.swirl === 0 ? 0 : params.swirlIterations);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var raf = 0, t0 = performance.now(), stopped = false;
    function loop(now) {
      if (stopped) return;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!stopped && !raf && !reduce) { t0 = performance.now() - 0; raf = requestAnimationFrame(loop); } }
    function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function onVis() { if (document.hidden) pause(); else start(); }
    document.addEventListener("visibilitychange", onVis);

    if (reduce) draw(0); else start();

    var inst = {
      container: container,
      destroy: function () {
        stopped = true; pause();
        document.removeEventListener("visibilitychange", onVis);
        if (ro) ro.disconnect(); else window.removeEventListener("resize", resize);
        try {
          gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); gl.deleteBuffer(buf);
          var lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
        } catch (e) {}
        if (host.parentNode) host.parentNode.removeChild(host);
        instances = instances.filter(function (x) { return x !== inst; });
      }
    };
    instances.push(inst);
    return inst;
  }

  function destroyAll() { instances.slice().forEach(function (i) { i.destroy(); }); }

  window.AnimatedGradient = { mount: mount, destroyAll: destroyAll, presets: Object.keys(PRESETS) };
})();
