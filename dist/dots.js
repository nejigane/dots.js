(function(window, document, parseInt) {
  var DOTS = {};

;var DOTS = {};

DOTS.Layer = function(gl, width, height) {
  this.gl = gl;

  var vertexShader = this.createShader(gl.VERTEX_SHADER,
                                       this.shaderSource.vertex);
  var fragmentShader = this.createShader(gl.FRAGMENT_SHADER, 
                                         this.shaderSource.fragment);
  this.program = this.createProgram(vertexShader, fragmentShader);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  this.locations = {
    data: gl.getUniformLocation(this.program, 'data'),
    position: gl.getAttribLocation(this.program, 'position'),
    uv: gl.getAttribLocation(this.program, 'uv')
  };

  var vertices = new Float32Array([
    -1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0
  ]);
  this.vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  var uvs = new Float32Array([
    0, 0, 1, 0, 0, 1, 1, 1
  ]);
  this.uvBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

  var indices = this.indices = new Uint8Array([
    0, 1, 2, 1, 3, 2
  ]);
  this.indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  this.size = { width: width, height: height };
  this.texture = gl.createTexture();
  this.data = new Uint8Array(4 * width * height);
  for (var i = 0; i < this.data.length; i += 4) {
    this.data[i + i % 3] = 255;
    this.data[i + 3] = 255;    
  }
};

DOTS.Layer.prototype = {
  createShader: function(type, source) {
    var gl = this.gl;
    var shader = gl.createShader(type); 
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
    return shader;    
  },
  createProgram: function(vertexShader, fragmentShader) {
    var gl = this.gl;
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
      console.error(gl.getProgramInfoLog(program));
    }
    return program;
  },
  render: function() {
    var gl = this.gl;
    gl.useProgram(this.program);

    gl.uniform1i(this.locations.data, 0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.size.width, this.size.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.data);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
    gl.enableVertexAttribArray(this.locations.uv);
    gl.vertexAttribPointer(this.locations.uv, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_BYTE, 0);
  },
  shaderSource: {
    vertex: [
      "precision highp float;",
      "precision highp int;",
      "attribute vec3 position;",
      "attribute vec2 uv;",
      "varying vec2 vUv;",
      "void main() {",
      "  vUv = uv;",
      "  gl_Position = vec4(position, 1.0);",
      "}"
    ].join("\n"),
    fragment: [
      "precision highp float;",
      "precision highp int;",
      "uniform sampler2D data;",
      "varying vec2 vUv;",
      "void main() {",
      "  gl_FragColor = texture2D(data, vUv);",
      "}"
    ].join("\n")
  }
};

DOTS.Canvas = function(width, height) {
  this.size = { width: width, height: height };
  this.domElement = document.createElement('canvas');
  this.layers = [];

  var gl = this.gl = this.domElement.getContext('webgl', { antialias: false });

  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);
  gl.clearStencil(0);

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  gl.enable(gl.CULL_FACE);
  gl.frontFace(gl.CCW);
  gl.cullFace(gl.BACK);

  gl.enable(gl.BLEND);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  this.setScale(1.0);

  if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT) &&
      gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)) {
    this.precision = 'highp';
  } else if (gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT) &&
             gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT)) {
    this.precision = 'mediump';
  } else {
    this.precision = 'lowp';
  }
};

DOTS.Canvas.prototype = {
  createLayer: function() {
    var layer = new DOTS.Layer(this.gl, this.size.width, this.size.height);
    this.layers.push(layer);
    return layer;
  },
  setScale: function(scale) {
    this.scale = scale;
    this.domElement.width = scale * this.size.width;
    this.domElement.height = scale * this.size.height;
    this.gl.viewport(0, 0, scale * this.size.width, scale * this.size.height);
  },
  render: function() {
    this.layers.forEach(function(layer) {
      layer.render();
    });
  }
};
;  window.DOTS = DOTS;
})(this, this.document, this.parseInt);