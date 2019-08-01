//
//  ShotMapGlPlugin
//

(function () {
    'use strict';

    var replaceSubstring = function (template, params) {
        return template.replace(/{[^{}]+}/g, function (key) {
            return params[key.replace(/[{}]+/g, "")] || "";
        });
    };

    var TEMPLATE =
        '<div class="shm-title">Количество съемок с детальностью 0.5-0.3 м/пк в 2018 г.</div>\
         <div class="shm-line">\
           <select type = "number" id = "shotMapMin">\
             <option value="0" selected>0</options>\
             <option value="100">100</options>\
             <option value="200">200</options>\
             <option value="300">300</options>\
             <option value="400">400</options>\
             <option value="500">500</options>\
             <option value="600">600</options>\
           </select>\
           <div class="shm-pal">{palette}</div>\
         </div>\
         <div class="shm-line"><a class="shm-about" href="" target="_blank">О проекте</a></div>';

    var CELL_TEMPLATE =
        '<div class="shm-cell">\
          <div class="shm-color" style="background-color:{color}"></div>\
          <div class="shm-label">{label}</div>\
        </div>';


    var PALETTE = [
        { num: 0, color: [255, 255, 255, 255] },
        { num: 1, color: [123, 179, 235, 255] },
        { num: 6, color: [27, 131, 235, 255] },
        { num: 11, color: [0, 89, 27, 255] },
        { num: 31, color: [224, 146, 28, 255] },
        { num: 51, color: [254, 0, 165, 255] },
        { num: 101, color: [195, 0, 0, 255] },
        { num: 201, color: [47, 0, 0, 255] }
    ];

    var pluginName = 'ShotMapGlPlugin',
        serverBase = window.serverBase || '//maps.kosmosnimki.ru/';

    window.nsGmx = window.nsGmx || {};

    var TileRender = function (params) {

        params = params || {};

        this._handler = null;
        this._sourceTexture = null;
        this._paletteTexture = null;
        this._frameVertBuffer = null;
        this._width = params.width || 256;
        this._height = params.height || 256;

        this._queue = [];

        this._minMax = [0, 1000];

        this._radius = 0;
    };

    TileRender.prototype = {

        getMin: function () {
            return this._minMax[0];
        },

        setMinMax: function (min, max) {
            this._minMax = [min, max || this._minMax[1]];
        },

        setRadius: function (radius) {
            this._radius = radius;
        },

        initPalette: function () {

            function getColor(c) {
                for (var i = PALETTE.length - 1; i >= 0; i--) {
                    if (c >= PALETTE[i].num) {
                        return PALETTE[i].color;
                    }
                }
                return [0, 0, 0, 0];
            };

            var palCanvas = document.createElement('canvas');
            palCanvas.width = 256;
            palCanvas.height = 256;
            var palData = new Uint8Array(256 * 256 * 4);

            for (var i = 0; i < 256; i++) {
                for (var j = 0; j < 256; j++) {

                    var i4 = (i * 256 + j) * 4;

                    var c = getColor(i * 256 + j);

                    palData[i4] = c[0];
                    palData[i4 + 1] = c[1];
                    palData[i4 + 2] = c[2];
                    palData[i4 + 3] = c[3];
                }
            }

            var context = palCanvas.getContext('2d');
            var imageData = context.createImageData(palCanvas.width, palCanvas.height);
            imageData.data.set(palData);
            context.putImageData(imageData, 0, 0);

            this._paletteTexture = this._handler.createTexture_n(palCanvas);
        },

        getPaletteHTML() {
            var res = "";

            //{ num: 0, color: [255, 255, 255, 255] }

            for (var i = 0; i < PALETTE.length; i++) {
                var pli = PALETTE[i];
                var lbl = pli.num.toString();
                if (i === PALETTE.length - 1) {
                    lbl += '<div class="shm-lbl-max">650</div>';
                }
                res += replaceSubstring(CELL_TEMPLATE, {
                    color: "rgba(" + pli.color[0] + "," + pli.color[1] + "," + pli.color[2] + "," + pli.color[3] + ")",
                    label: lbl
                });
            }

            return res;
        },

        initialize: function () {

            this._handler = new og.Handler(null, {
                width: this._width,
                height: this._height,
                context: {
                    alpha: true,
                    depth: false
                }
            });
            this._handler.initialize();
            this._handler.deactivateFaceCulling();
            this._handler.deactivateDepthTest();

            this._framebuffer = new og.Framebuffer(this._handler, {
                width: this._width,
                height: this._height,
                useDepth: false
            });

            this._framebuffer.init();

            this._frameVertBuffer = this._handler.createArrayBuffer(new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1]), 2, 4);

            this._texturePASS = new Array(2);
            this._texturePASS[0] = this._handler.createEmptyTexture_n(256, 256);
            this._texturePASS[1] = this._handler.createEmptyTexture_n(256, 256);

            this._handler.addProgram(new og.Program("filter_PASS0", {
                uniforms: {
                    srcTexture: { type: 'sampler2d' },
                    minMax: 'vec2'
                },
                attributes: {
                    frameVert: { type: 'vec2' }
                },
                vertexShader: "attribute vec2 frameVert;\n\
							varying vec2 uv;\n\
							void main(){\n\
								uv = (frameVert * vec2(1.0,1.0) + 1.0) * 0.5;\n\
								gl_Position.xy = frameVert;\n\
								gl_Position.zw = vec2(0.0, 1.0);\n\
							}",
                fragmentShader:
                    "precision highp float;\n\
							uniform sampler2D srcTexture;\n\
                			uniform vec2 minMax;\n\
							varying vec2 uv;\n\
							void main(){\n\
								vec4 srcPix = texture2D(srcTexture, uv);\n\
                                float n = srcPix.r * 255.0 * 256.0 + srcPix.g * 255.0;\n\
                                if(n >= minMax.x && n <= minMax.y) {\n\
                                    gl_FragColor = srcPix; \n\
                                } else {\n\
                                    /*gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);*/discard;\n\
                                }\n\
							}"
            }));

            this._handler.addProgram(new og.Program("dilation_PASS1", {
                uniforms: {
                    srcTexture: { type: 'sampler2d' },
                    minMax: 'vec2'
                },
                attributes: {
                    frameVert: { type: 'vec2' }
                },
                vertexShader: "attribute vec2 frameVert;\n\
							varying vec2 uv;\n\
							void main(){\n\
								uv = (frameVert * vec2(1.0,1.0) + 1.0) * 0.5;\n\
								gl_Position.xy = frameVert;\n\
								gl_Position.zw = vec2(0.0, 1.0);\n\
							}",
                fragmentShader:
                    "precision highp float;\
                    \
                    uniform sampler2D srcTexture;\
                    uniform vec2 minMax;\n\
					varying vec2 uv;\
                    \
                    void main() {\
                        vec4 c = texture2D(srcTexture, uv);\
                        vec4 dc = c;\
                    \
                        vec4 cc;\
                    \
                        for(int i = -1; i <= 1; ++i)\
                        {\
                            for (int j = -1; j <= 1; ++j)\
                            {\
                                vec2 coord = uv.xy + vec2(float(i), float(j)) * vec2(1.0 / 256.0);\
                                cc = texture2D(srcTexture, coord);\
                    \
                                float n = cc.r * 255.0 * 256.0 + cc.g * 255.0;\
                                if(n >= minMax.x && n <= minMax.y) {\
                                    dc = max(cc, dc);\
                                }\
                            }\
                        }\
                    \
                        gl_FragColor = dc;\
                    }"
            }));

            this._handler.addProgram(new og.Program("palette_PASS2", {
                uniforms: {
                    srcTexture: { type: 'sampler2d' },
                    palTexture: { type: 'sampler2d' }
                },
                attributes: {
                    frameVert: { type: 'vec2' }
                },
                vertexShader: "attribute vec2 frameVert;\
							varying vec2 uv;\
							void main(){\
								uv = (frameVert * vec2(1.0,1.0) + 1.0) * 0.5;\
								gl_Position.xy = frameVert;\
								gl_Position.zw = vec2(0.0, 1.0);\
							}",
                fragmentShader:
                    "precision highp float;\
						uniform sampler2D srcTexture;\
						uniform sampler2D palTexture;\
						varying vec2 uv;\
						void main(){\
							vec4 srcPix = texture2D(srcTexture, uv);\
							vec4 color = texture2D(palTexture, vec2(srcPix.g, srcPix.r));\
                            gl_FragColor = vec4(color.rgb, srcPix.a); \
                        }"
            }));

            this._paletteTexture = this._handler.createEmptyTexture_n(2, 2);
        },

        render: function (srcImage, data) {

            var h = this._handler,
                gl = h.gl;

            gl.deleteTexture(this._sourceTexture);

            this._sourceTexture = h.createTexture_n(srcImage);

            h.programs.filter_PASS0.activate();
            var sh = h.programs.filter_PASS0._program;
            var sha = sh.attributes,
                shu = sh.uniforms;

            this._framebuffer.activate();

            //PASS 0
            this._framebuffer.bindOutputTexture(this._texturePASS[0]);

            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            gl.uniform2fv(shu.minMax, this._minMax);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this._sourceTexture);
            gl.uniform1i(shu.srcTexture, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this._frameVertBuffer);
            gl.vertexAttribPointer(sha.frameVert, this._frameVertBuffer.itemSize, gl.FLOAT, false, 0, 0);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);


            if (this._radius) {
                //PASS 1
                h.programs.dilation_PASS1.activate();
                var sh = h.programs.dilation_PASS1._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;

                gl.uniform2fv(shu.minMax, this._minMax);

                for (var i = 0; i < this._radius; i++) {

                    this._framebuffer.bindOutputTexture(this._texturePASS[(i + 1) % 2]);

                    gl.clearColor(0.0, 0.0, 0.0, 0.0);
                    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this._texturePASS[i % 2]);
                    gl.uniform1i(shu.srcTexture, 0);

                    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                }

                h.programs.palette_PASS2.activate();
                var sh = h.programs.palette_PASS2._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;

                this._framebuffer.bindOutputTexture(this._texturePASS[i % 2]);

                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this._texturePASS[(i + 1) % 2]);
                gl.uniform1i(shu.srcTexture, 0);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this._paletteTexture);
                gl.uniform1i(shu.palTexture, 1);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            } else {

                h.programs.palette_PASS2.activate();
                var sh = h.programs.palette_PASS2._program;
                var sha = sh.attributes,
                    shu = sh.uniforms;

                this._framebuffer.bindOutputTexture(this._texturePASS[1]);

                gl.clearColor(0.0, 0.0, 0.0, 0.0);
                gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, this._texturePASS[0]);
                gl.uniform1i(shu.srcTexture, 0);

                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, this._paletteTexture);
                gl.uniform1i(shu.palTexture, 1);

                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }

            this._framebuffer.deactivate();

            this._framebuffer.readAllPixels(data);
        }
    };

    function createPermalink(map, point) {

        var c = L.CRS.EPSG3857.project(map.getCenter());

        var content = {
            searchMode: true,
            activeLayer: "heatmap2018",
            activeTabId: "search",
            lang: "rus",
            cadastre: {},
            cart: [],
            items: [],
            drawingObjects: [
                {
                    area: 0,
                    id: "_3",
                    name: "Точка",
                    visible: true,
                    geoJSON: {
                        type: "Feature",
                        properties: {
                            attribution: null,
                            bubblingMouseEvents: true,
                            className: "",
                            editable: false,
                            endTooltip: "",
                            iconUrl: "",
                            pane: "overlayPane",
                            smoothFactor: 0,
                            type: "Point",
                            uuid: "_4",
                            options: {
                                altKey: false,
                                attribution: null,
                                autoPan: false,
                                autoPanPadding: [50, 50],
                                autoPanSpeed: 10,
                                bubblingMouseEvents: false,
                                contextmenu: false,
                                contextmenuInheritItems: true,
                                contextmenuItems: [],
                                ctrlKey: false,
                                draggable: true,
                                interactive: true,
                                pane: "markerPane",
                                shiftKey: false,
                                title: "",
                                icon: {
                                    iconRetinaUrl: "marker-icon-2x.png",
                                    iconUrl: "marker-icon.png",
                                    shadowUrl: "marker-shadow.png",
                                    tooltipAnchor: [16, -28],
                                    interactive: true,
                                    pane: "markerPane",
                                    shiftKey: false,
                                    title: ""
                                }
                            }
                        },
                        geometry: {
                            coordinates: [point.lng, point.lat],
                            type: "Point"
                        }
                    }
                }
            ],
            position: { x: c.x, y: c.y, z: 17 - map.getZoom() },
            bounds: map.getBounds(),
            searchCriteria: {
                angle: [0, 80],
                annually: false,
                clouds: [0, 100],
                date: ["2017-12-31T21:00:00.000Z", "2018-12-30T21:00:00.000Z"],
                resolution: [0.3, 20],
                stereo: false,
                satellites: {
                    ms: ["WV04", "WV03", "WV02", "WV01", "GE01", "PHR", "KOMPSAT3A", "SV1"],
                    pc: []
                }
            }
        };

        var url = "//maps.kosmosnimki.ru/TinyReference/Create.ashx";
        let formData = new FormData();
        formData.append('content', JSON.stringify(content));

        return fetch(url, {
            credentials: 'include',
            method: 'POST',
            body: formData
        })
            .then(function (r) {
                if (r.ok)
                    return r.text();
                else
                    throw new Error(`${r.status}:${r.statusText} ${r.url}`);
            }).then(function (r) {
                var d = JSON.parse(r.substring(r.indexOf('{'), r.lastIndexOf('}') + 1));
                return d.Result;
            });
    };

    var publicInterface = {
        pluginName: pluginName,
        afterViewer: function (params) {
            this.load();
        },
        load: function (map, layer) {

            map = map || nsGmx.leafletMap;

            var pickingTemplate = '<div style="display:inline-block; width:100%; font-size: 14px;">\
                                     <div style = "padding: 5px 0 5px 0;"><b>Кол-во:</b> {number}</div>\
                                     <div class="sh-url">{permalinkHTML}</div>\
                                  </div>';

            var _pickingPopup = new L.Popup();

            var _showPopup = function (latlng, rgba) {

                _pickingPopup.setLatLng(latlng).setContent(replaceSubstring(pickingTemplate, {
                    'number': (rgba[0] * 256 + rgba[1]) || 0,
                    'permalinkHTML': "Загрузка пермалинка..."
                })).openOn(map);

                createPermalink(map, latlng).then(function (pUrl) {
                    _pickingPopup.getElement().querySelector(".sh-url").innerHTML = '<a href="//search.kosmosnimki.ru/?link=' + pUrl + '" target="_blank">Открыть в Каталоге</a>';
                });
            };

            var layerId = '9B67BA1F171A41E99BFDA824011ADB25';

            var path = publicInterface.path || "./shotMapGl/";

            Promise.all([
                path + 'shotMapGl.css',
                path + 'og.webgl.js',
                serverBase + 'api/plugins/agro_plugins_api_v2/themesModule/shared.js',
                path + 'pickingControl.js'
            ].map(L.gmxUtil.requestLink)).then(function () {

                var tileRender = new TileRender();
                tileRender.initialize();
                tileRender.initPalette();

                var gmxLayer = layer || nsGmx.gmxMap.layersByID[layerId.trim()];

                if (gmxLayer) {

                    var _pickingControl = new PickingControl(map, [gmxLayer], 7, _showPopup);

                    var el = document.createElement("div");
                    el.classList.add("shm-pane");
                    el.innerHTML = replaceSubstring(TEMPLATE, {
                        palette: tileRender.getPaletteHTML()
                    });

                    /*
                    zoom 3 - 4: width = 2 * (offset / 100) + 1
                    zoom 5: width = 2 * (offset / 100)
                    zoom 6 - 7:
                        width = (offset / 100)
                    zomm 8 -...: with = 0
                        offset = 100 - 600
                    */

                    function _redraw() {

                        var z = map.getZoom(),
                            r = 0,
                            min = tileRender.getMin();

                        if (z === 3 || z === 4) {
                            r = 2 * (min / 100) + 1;
                        } else if (z === 5) {
                            r = 2 * (min / 100);
                        } else if (z === 6 || z === 7) {
                            r = min / 100;
                        }

                        tileRender.setRadius(r);

                        gmxLayer.repaint();
                    }

                    el.querySelector("#shotMapMin").addEventListener("change", function () {
                        tileRender.setMinMax(parseInt(this.value));
                        _redraw();
                    });

                    map.on("zoomend", function () {
                        _redraw();
                    });

                    document.body.appendChild(el);


                    gmxLayer.setRasterHook(function (dstCanvas, srcImage, sx, sy, sw, sh, dx, dy, dw, dh, info) {
                        if (srcImage) {

                            if (info.zKey === "346:166:9") {
                                debugger;
                            }

                            var data = new Uint8Array(256 * 256 * 4);
                            tileRender.render(srcImage, data);

                            var srcCanvas = document.createElement('canvas');
                            srcCanvas.width = 256;
                            srcCanvas.height = 256;
                            var context = srcCanvas.getContext('2d');
                            var imageData = context.createImageData(dstCanvas.width, dstCanvas.height);
                            imageData.data.set(data);

                            context.putImageData(imageData, 0, 0);

                            //context.clearRect(0, 0, 256, 256);

                            var dstContext = dstCanvas.getContext('2d');
                            dstContext.drawImage(srcCanvas, sx, sy, sw, sh, dx, dy, dw, dh);

                            return dstCanvas;
                        }
                    });
                }
            });
        }
    };

    if (window.gmxCore) {
        publicInterface.path = gmxCore.getModulePath(pluginName);
        window.gmxCore.addModule(pluginName, publicInterface, {});
    } else {
        window.nsGmx[pluginName] = publicInterface;
        L.Map.addInitHook(function () {
            this.on('layeradd', function (ev) {
                var it = ev.layer,
                    layerID = it.options.layerID || (it.getGmxProperties && it.getGmxProperties().LayerID);
                if (layerID === "9B67BA1F171A41E99BFDA824011ADB25") {
                    publicInterface.load(this, it);
                }
            }, this);
        });
    }

})();
