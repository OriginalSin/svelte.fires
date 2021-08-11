// Виртуальный слой для пожаров
(function() {

"use strict";

var transHash = {
	rus: {
        "LayerClusterBalloon" :
            "<div style='margin-bottom: 5px;'><b style='color: red;'>Пожар</b></div>" +
            "<b>Кол-во термоточек:</b> [count]<br/>" +
            "<b>Время наблюдения:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "LayerClusterBalloonIndustrial" :
            "<span style='margin-bottom: 5px;'><b style='color: red;'>Пожар</b></span> (вероятный техногенный источник <a target='blank' href='http://fires.kosmosnimki.ru/help.html#techno'>?</a>) <br/>" +
            "<b>Кол-во термоточек:</b> [count]<br/>" +
            "<b>Время наблюдения:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "LayerGeometryBalloon" :
            "<div style='margin-bottom: 5px;'><b style='color: red;'>Контур пожара</b></div>" +
            "<b>Кол-во термоточек:</b> [count]<br/>" +
            "<b>Время наблюдения:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "zoomInMessage": "Приблизьте карту, чтобы увидеть контур"
	},
	eng: {
        "LayerClusterBalloon" :
            "<div style='margin-bottom: 5px;'><b style='color: red;'>Fire</b></div>" +
            "<b>Number of hotspots:</b> [count]<br/>" +
            "<b>Observation period:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "LayerClusterBalloonIndustrial" :
            "<span style='margin-bottom: 5px;'><b style='color: red;'>Fire</b></span> (probable industrial hotspot <a target='_blank' href='http://fires.kosmosnimki.ru/help.html#techno'>?</a>)<br/>" +
            "<b>Number of hotspots:</b> [count]<br/>" +
            "<b>Observation period:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "LayerGeometryBalloon" :
            "<div style='margin-bottom: 5px;'><b style='color: red;'>Fire outline</b></div>" +
            "<b>Number of hotspots:</b> [count]<br/>" +
            "<b>Observation period:</b> [dateRange]<br/>" +
            "<div>[SUMMARY]</div>",
        "zoomInMessage": "Zoom-in to see the outline"
	}
}
var initTranslations = function()
{
    _translationsHash.addtext("rus", { FireVirtualLayer: transHash.rus });
    _translationsHash.addtext("eng", { FireVirtualLayer: transHash.eng });
}

// Lookup table for pixel dimensions based on scan index of the pixel
var ModisPixelDimensions = [];
function buildModisPixelDimensionsTable()
{
    // Don't rebuild the table if it was already built
    if(ModisPixelDimensions.length > 0){
        return;
    }

    var h = 705.0;        // Terra/Aqua orbit altitude [km]
    var p = 1.0;        // nadir pixel resolution [km]
    var EARTH_RADIUS = 6371.0;
    var SAMPLES = 1354;

    var r = EARTH_RADIUS + h;    /* [km] */
    var s = p / h;                  /* [rad] */

    for(var sample = 0;sample<1354;sample++){
        var theta = sample * s + 0.5 * s - (0.5*SAMPLES) * s;
        var cos_theta = Math.cos(theta);

        var temp = Math.pow((EARTH_RADIUS/r),2.0) - Math.pow(Math.sin(theta),2.0);
        var sqrt_temp = Math.sqrt(temp);

        var DS = EARTH_RADIUS * s * (cos_theta/sqrt_temp - 1.0)*1000;
        var DT = r*s*(cos_theta - sqrt_temp)*1000;
        ModisPixelDimensions[sample] = [DS,DT];
    }
}

var _hq = {
    getDistant: function(cpt, bl) {
        var Vy = bl[1][0] - bl[0][0];
        var Vx = bl[0][1] - bl[1][1];
        return (Vx * (cpt[0] - bl[0][0]) + Vy * (cpt[1] -bl[0][1]))
    },
    findMostDistantPointFromBaseLine: function(baseLine, points) {
        var maxD = 0;
        var maxPt = new Array();
        var newPoints = new Array();
        for (var idx in points) {
            var pt = points[idx];
            var d = this.getDistant(pt, baseLine);

            if ( d > 0) {
                newPoints.push(pt);
            } else {
                continue;
            }

            if ( d > maxD ) {
                maxD = d;
                maxPt = pt;
            }

        }
        return {'maxPoint':maxPt, 'newPoints':newPoints}
    },

    buildConvexHull: function(baseLine, points) {

        var convexHullBaseLines = new Array();
        var t = this.findMostDistantPointFromBaseLine(baseLine, points);
        if (t.maxPoint.length) {
            convexHullBaseLines = convexHullBaseLines.concat( this.buildConvexHull( [baseLine[0],t.maxPoint], t.newPoints) );
            convexHullBaseLines = convexHullBaseLines.concat( this.buildConvexHull( [t.maxPoint,baseLine[1]], t.newPoints) );
            return convexHullBaseLines;
        } else {
            return [baseLine];
        }
    },
    getConvexHull: function(points) {

        if (points.length == 1)
            return [[points[0], points[0]]];

        //find first baseline
        var maxX, minX;
        var maxPt, minPt;
        for (var idx in points) {
            var pt = points[idx];
            if (pt[0] > maxX || !maxX) {
                maxPt = pt;
                maxX = pt[0];
            }
            if (pt[0] < minX || !minX) {
                minPt = pt;
                minX = pt[0];
            }
        }
        var ch = [].concat(this.buildConvexHull([minPt, maxPt], points),
                           this.buildConvexHull([maxPt, minPt], points))
        return ch;
    },
    MultiPolygonUnion: function(multiPolygon)
    {
        var matrixMultiPolygon = [],
            unitedMultiPolygon = [],
            nStartPolygons = 0,
            currentPolygon;

        do {
            nStartPolygons = multiPolygon.length;
            unitedMultiPolygon = [];

            while(multiPolygon.length > 0){
                currentPolygon = multiPolygon.pop();
                var iOther = 0;

                // Check if it overlaps with any remaining polygons
                while(iOther < multiPolygon.length) {

                    var unionResults = currentPolygon.union(multiPolygon[iOther]);

                    if(unionResults != null){
                        currentPolygon = unionResults;
                        multiPolygon.splice(iOther,1);
                    } else {
                        iOther++;
                    }
                }
                unitedMultiPolygon.push(currentPolygon)
            }
            multiPolygon = unitedMultiPolygon;
        }while(multiPolygon.length < nStartPolygons);

        for(var i = 0; i < unitedMultiPolygon.length;i++) {
            var poly = unitedMultiPolygon[i].to_point_array_2d();
            poly.push(poly[0]);

            matrixMultiPolygon.push([poly]);
        }

        return matrixMultiPolygon;
    },
    getPixelMultiPolygon: function(points) {
        var results = [];

        for(var i = 0;i < points.length;i++) {
            var pt = points[i];
            var dims = ModisPixelDimensions[pt[2]];

            var merc = L.CRS.EPSG3857.project({lat: pt[1], lng: pt[0]});
            var X1 = merc.x;
            var Y1 = merc.y;

            var X2 = X1 + 1000;
            var Y2 = Y1;

            var newLatLng = L.Projection.SphericalMercator.unproject({x: X2, y: Y2});
            var newLat = pt[1];
            var newLon = newLatLng.lng;

            var mdelta = L.gmxUtil.distVincenty(pt[0],pt[1],newLon,newLat);

            var h_scale = dims[0] / mdelta;
            var v_scale = dims[1] / mdelta;


            var h_dx = 0.5*(X2 - X1)*h_scale;
            var h_dy = 0.5*(Y2 - Y1)*h_scale;

            var v_dx = 0.5*(Y2-Y1)*v_scale;
            var v_dy = 0.5*(X2-X1)*v_scale;

            var frontX = X1 + h_dx;
            var frontY = Y1 + h_dy;

            var backX = X1 - h_dx;
            var backY = Y1 - h_dy;

            var corner1x =  frontX + v_dx;
            var corner1y =  frontY + v_dy;

            var corner2x =  frontX - v_dx;
            var corner2y =  frontY - v_dy;

            var corner3x =  backX - v_dx;
            var corner3y =  backY - v_dy;

            var corner4x =  backX + v_dx;
            var corner4y =  backY + v_dy;

            results.push( SpatialQuery.$p([
                [corner1x, corner1y],
                [corner2x, corner2y],
                [corner3x, corner3y],
                [corner4x, corner4y]
            ]));
        }

        return results;
    }
}

var mercBbox = function(latlngBbox) {
    var mercMin = L.CRS.EPSG3857.project({lat: latlngBbox.min.y, lng: latlngBbox.min.x});
    var mercMax = L.CRS.EPSG3857.project({lat: latlngBbox.max.y, lng: latlngBbox.max.x});
    return L.gmxUtil.bounds([[mercMin.x, mercMin.y], [mercMax.x, mercMax.y]]);
}

var fromMercBbox = function(bbox) {
    var min = L.Projection.SphericalMercator.unproject(bbox.min);
    var max = L.Projection.SphericalMercator.unproject(bbox.max);
    return L.gmxUtil.bounds([[min.lng, min.lat], [max.lng, max.lat]]);
}

var getExtendedBbox = function(mercOld, newBbox) {
    var extendBbox = function(bbox) {
        var sx = (bbox.max.x - bbox.min.x)*0.15,
            sy = (bbox.max.y - bbox.min.y)*0.15;

        return L.gmxUtil.bounds([[bbox.min.x - sx, bbox.min.y - sy], [bbox.max.x + sx, bbox.max.y + sy]]);
    }

    var mercNew = mercBbox(newBbox);

    if (!mercOld) {
        return fromMercBbox(extendBbox(mercNew));
    }

    var oldSquare = (mercOld.max.x - mercOld.min.x) * (mercOld.max.y - mercOld.min.y),
        newSquare = (mercNew.max.x - mercNew.min.x) * (mercNew.max.y - mercNew.min.y);

    if (!mercOld.contains([mercNew.min.x, mercNew.min.y]) || !mercOld.contains([mercNew.max.x, mercNew.max.y]) || 2 * newSquare < oldSquare) {
        return fromMercBbox(extendBbox(mercNew));
    } else {
        return null;
    }
}

var dateToString = function(timestamp) {
    var date = new Date(timestamp*1000);

    var lz = function(n) {return n > 9 ? n : '0' + n;};

    return lz(date.getUTCDate()) + '.' + lz(date.getUTCMonth()+1) + '.' + date.getUTCFullYear();
}

if (!window._gtxt) {
	var _gtxt = function() {
		return null;
	};
}

var FireVirtualLayer = (L.Layer || L.Class).extend({
    options: {
        minClustersZoom: 4,
        minGeomZoom: 8,
        minHotspotZoom: 11,
        hostName: 'maps.kosmosnimki.ru'
        // mapID
        // hotspotLayerID
        // dailyLayerID
    },
    initialize: function(options) {
        L.setOptions(this, options);

		var lang = nsGmx && nsGmx.Translations && nsGmx.Translations.getLanguage ? nsGmx.Translations.getLanguage() : window.language || 'rus';
		var titelHash = transHash[lang];
		this._titelHash = titelHash;
        this._clustersLayer = L.gmx.createLayer({
            properties: {
                title: 'FireClusters',
                attributes: ['scale', 'count', 'label', 'startDate', 'endDate', 'dateRange', 'isIndustrial'],
                styles: [{
                    Filter: '"isIndustrial"=0',
                    Balloon: _gtxt('FireVirtualLayer.LayerClusterBalloon') || titelHash.LayerClusterBalloon,
                    MinZoom: 1,
                    MaxZoom: this.options.minGeomZoom - 1,
                    RenderStyle: {
                        fill: {
                            radialGradient: {
                                r1: 0,
                                r2: '[scale]*20',
                                addColorStop: [
                                    [0, 0xffff00, 50],
                                    [1, 0xff0000, 50]
                                ]
                            }
                        },
						labelHaloColor: 0,
                        label: {
                            size: 12,
                        color: 0xffffff,
                        haloColor: 0x000000,
                            // color: 0xffffff,
                            field: 'label',
                            align: 'center'
                        }
                    }
                }, {
                    Filter: '"isIndustrial"=1',
                    Balloon: _gtxt('FireVirtualLayer.LayerClusterBalloonIndustrial') || titelHash.LayerClusterBalloonIndustrial,
                    MinZoom:1,
                    MaxZoom: this.options.minGeomZoom - 1,
                    RenderStyle: {
                        fill: {
                            radialGradient: {
                                r1: 0,
                                r2: '[scale]*20',
                                addColorStop: [
                                    [0, 0xffffff, 80],
                                    [1, 0xffaa00, 80]
                                ]
                            }
                        }
                    }
                }]
            }
        }, {srs: 3857});

        this._clustersGeomLayer = L.gmx.createLayer({
            properties: {
                type: 'Vector',
                title: 'FirePolygons',
                attributes: ['scale', 'count', 'label', 'startDate', 'endDate', 'dateRange', 'isIndustrial'],
                styles: [{
                    Balloon: _gtxt('FireVirtualLayer.LayerGeometryBalloon') || titelHash.LayerGeometryBalloon,
                    MinZoom: this.options.minGeomZoom,
                    MaxZoom: 21,
                    RenderStyle: {
                        outline: { color: 0xff0000, thickness: 2 },
                        fill:    { color: 0xff0000, opacity: 15 }
                    },
                    HoverStyle: {
                        outline: { color: 0xff0000, thickness: 3 },
                        fill:    { color: 0xff0000, opacity: 45 }
                    }
                }]
            }
        }, {srs: 3857});

        this._heatmapLayer = new L.HeatLayer([], {
            "gradient": {
                "1.00": "#FFFFFF",
                "0.90": "#FFAA00",
                "0.85": "#FF8800",
                "0.75": "#E65C00",
                "0.55": "#DB1D00"
            },
            "blur": 30,
            "radius": 17,
            "minRadius": 7,
            "minOpacity": 0.65
        });

        if (this.options['z_index']) {
            this._clustersLayer.setZIndex(this.options['z_index']);
            this._clustersGeomLayer.setZIndex(this.options['z_index']);
        }

        var _this = this;
        this._clustersLayer.on('popupopen', function(event) {
            var popup = event.popup,
                html = popup.getContent(),
				title = _gtxt('FireVirtualLayer.zoomInMessage') || titelHash.zoomInMessage,
                cont = L.DomUtil.create('div', '');
			cont.appendChild(html);
            var zoomLink = L.DomUtil.create('div', '', cont);
                // zoomLink = $('<div style="margin-top: 5px;"><a href="javascript:void(0)"><i>' + title + '</i></a></div>').click(function() {
                    // _this._map.closePopup(event.popup);
                    // _this._map.setView(event.gmx.latlng, _this.options.minGeomZoom + 3);
                // });

            // var div = $('<div/>').html(html).append(zoomLink);
			zoomLink.style.marginTop = '5px';
			zoomLink.innerHTML = '<a href="javascript:void(0)"><i>' + title + '</i></a>';
			L.DomEvent.on(zoomLink, 'click', function(ev) {
				_this._map.closePopup(event.popup);
				_this._map.setView(event.gmx.latlng, _this.options.minGeomZoom + 3);
			}, this);
            event.popup.setContent(cont);
            // event.popup.setContent(div[0]);
        });
		L.gmx.setLanguage = function(lang) {
			console.log('sssss', window.language);
			//[]
		};
    },

    onAdd: function(map) {
        buildModisPixelDimensionsTable();
        this._map = map;
        this._layerIsVisible = true;
        this._lazyLoadDataLayers().then(function() {
            if (!this._map || !this._layerIsVisible) {
                return;
            }

            map.on('zoomend', this._updateLayersVisibility, this);
            map.on('moveend', this._updateBbox, this);

            this._updateLayersVisibility();
            this._updateBbox();

			// this._hotspotLayer.setZIndex(this.options.zIndex);
			// this._clustersLayer.setZIndex(this.options.zIndex);
			// this._clustersGeomLayer.setZIndex(this.options.zIndex);
            map.addLayer(this._clustersLayer);
            map.addLayer(this._clustersGeomLayer);
            map.addLayer(this._hotspotLayer);
        }.bind(this));
    },

    onRemove: function(map) {
        delete this._map;
        this._layerIsVisible = false;
        map.off('moveend', this._updateBbox, this);
        map.off('zoomend', this._updateLayersVisibility, this);
        this._updateLayersVisibility();
        this._lazyLoadDataLayers().then(function() {
            if (this._layerIsVisible) {
                return;
            }

            map.removeLayer(this._clustersGeomLayer);
            map.removeLayer(this._clustersLayer);
            map.removeLayer(this._hotspotLayer);
            map.removeLayer(this._heatmapLayer);
        }.bind(this));
		// L.gmx.setLanguage = null;
        // map.removeLayer(this._clustersGeomLayer);
        // map.removeLayer(this._clustersLayer);
        // map.removeLayer(this._hotspotLayer);
    },

    setDateInterval: function(dateBegin, dateEnd) {
        this._dateBegin = dateBegin;
        this._dateEnd = dateEnd;
        this._rawClusterLayer && this._rawClusterLayer.setDateInterval(dateBegin, dateEnd);
        this._hotspotLayer && this._hotspotLayer.setDateInterval(dateBegin, dateEnd);
		this._observerHeatmap && this._observerHeatmap.setDateInterval(dateBegin, dateEnd);

        this._observerClusters && this._observerClusters.setDateInterval(dateBegin, dateEnd);
        this._observerHotspots && this._observerHotspots.setDateInterval(dateBegin, dateEnd);
    },

    _updateBbox: function() {
        var observersBbox = this._observerHotspots.bbox,
            screenBounds = this._map.getBounds(),
            p1 = screenBounds.getNorthWest(),
            p2 = screenBounds.getSouthEast(),
            newBbox = L.gmxUtil.bounds([[p1.lng, p1.lat], [p2.lng, p2.lat]]),
            extendedBbox = getExtendedBbox(observersBbox, newBbox);

        if (extendedBbox) {
            this._observerHotspots.setBounds(extendedBbox);
            this._observerClusters.setBounds(extendedBbox);
            this._observerHeatmap.setBounds(extendedBbox);
        }
    },
    _balloonEng: function(st) {
		var out = st;
		out = out.replace(/Дата/g, 'Date').replace(/Спутник/g, 'Satellite');
		out = out.replace(/СКАНЭКС/g, 'SCANEX').replace(/Источник/g, 'Source').replace(/Достоверность/g, 'Confidence');
		out = out.replace(/день/g, 'Day').replace(/ночь/g, 'Night');
		out = out.replace(/Температура пикс\./g, 'Temperature').replace(/Сила пожара/g, 'Fire Power');
		out = out.replace(/Вероятный техногенный источник [^)]*\)/g, 'Possible technogenic source');
		return out;
    },

    //load layers add add observers
    _lazyLoadDataLayers: function() {
        if (this._loadLayersPromise) {
            return this._loadLayersPromise;
        }

        var heatmapLayerID = this.options.heatmapLayerID || this.options.hotspotLayerID;
        this._loadLayersPromise = L.gmx.loadLayers([
                {
                    mapID: this.options.mapID,
                    layerID: this.options.hotspotLayerID
                }, {
                    mapID: this.options.mapID,
                    layerID: this.options.dailyLayerID
                }
            ], {hostName: this.options.hostName}
        ).then(function(arr) {
			var rawHotspotLayer = arr[0];
			var rawClustersLayer = arr[1];
            if (this.options.minHotspotZoom) {
                var minZoom = this.options.minHotspotZoom;
                var _balloonEng = this._balloonEng;
                rawHotspotLayer.setStyles(rawHotspotLayer.getStyles().map(function(style) {
                    style.MinZoom = minZoom;
					if (window.language === 'eng') {
						if (!style._Balloon) {
							style._Balloon = style.Balloon;
						}
						style.Balloon = _balloonEng(style._Balloon);
					} else if (style._Balloon) {
						style.Balloon = style._Balloon;
					}
                    return style;
                }));
            }
            var rawHeatmapLayer;
            if (heatmapLayerID === rawHotspotLayer.options.layerID) {
                rawHeatmapLayer = rawHotspotLayer;
            }
            if (heatmapLayerID === rawClustersLayer.options.layerID) {
                rawHeatmapLayer = rawClustersLayer;
            }

            this._hotspotLayer = rawHotspotLayer;
            if (this._dateBegin && this._dateEnd) {
                this._hotspotLayer.setDateInterval(this._dateBegin, this._dateEnd);
            }

            this._rawClusterLayer = rawClustersLayer;
            if (this.options['z_index']) {
                this._hotspotLayer.setZIndex(this.options['z_index']);
            }

            this._observerHeatmap = rawHeatmapLayer.addObserver({
                type: 'update',
                callback: this._createHeatmapObserverCallback(rawHeatmapLayer, this._heatmapLayer),
                active: !!this._map,
                dateInterval: [this._dateBegin, this._dateEnd]
            });

            this._observerClusters = rawClustersLayer.addObserver({
                type: 'update',
                callback: this._updateClustersByObject(this._clustersLayer, false, 'ParentClusterId', 'HotSpotCount', rawClustersLayer),
                active: !!this._map,
                dateInterval: [this._dateBegin, this._dateEnd]
            });

            this._observerHotspots = rawHotspotLayer.addObserver({
                type: 'update',
                callback: this._updateClustersByObject(this._clustersGeomLayer, true, 'ClusterID', null, rawHotspotLayer),
                active: !!this._map,
                dateInterval: [this._dateBegin, this._dateEnd]
            });
        }.bind(this));

        return this._loadLayersPromise;
    },

    _createHeatmapObserverCallback: function(srcLayer, heatLayer) {
        var pointsBuffer = [];

        var weightFieldsHash = {
            'F2840D287CD943C4B1122882C5B92565': 4,
            'C13B4D9706F7491EBC6DC70DFFA988C0': 4,
            'E58063D97D534BB4BBDFF07FE5CB17F2': 1,
            'F62E1DCBA3D94FA39BF69264FAA6552B': 1,
            '82D0482AC31546CFB80FABC68600103A': 1,
            '3E88643A8AC94AFAB4FD44941220B1CE': 1
        }

        function addData(data) {
            pointsBuffer = pointsBuffer.concat(data);
            return pointsBuffer;
        }

        function removeData(data) {
            pointsBuffer = pointsBuffer.filter(function(it) {
                return !data.find(function (d) {
                    return d.id === it.id
                })
            })
            return pointsBuffer
        }

        function parser(data) {
            return data.map(function(d) {
                var props = d.properties;

                var latlng = L.Projection.Mercator.unproject({
                    y: props[props.length - 1].coordinates[1],
                    x: props[props.length - 1].coordinates[0]
                })

                var r = [latlng.lat, latlng.lng];
                var fi = weightFieldsHash[srcLayer.options.layerID];
                fi && props[fi] && r.push(factor(props[fi]));

                return r;
            })
        }

        function factor(w) {
            return 3800 * (Math.pow(Math.log(w + 1), 1.3) / 3.5);
        }

        return function(data) {
			// pointsBuffer = [];
            
			// data.removed && removeData(data.removed);
            // data.added && addData(data.added);
            data.added && addData(data.added);
            data.removed && removeData(data.removed);
            heatLayer.setLatLngs(parser(pointsBuffer));
            // heatLayer.redraw();
        }
    },

    _updateClustersByObject: function(layer, estimeteGeometry, clusterAttr, countAttr, fromLayer) {
        var indexes = fromLayer._gmx.tileAttributeIndexes,
            dateAttr = fromLayer.getGmxProperties().TemporalColumnName,
            idAttr = fromLayer.getGmxProperties().identityField;

		if (!(clusterAttr in indexes)) {
			clusterAttr = idAttr;
		}
        var parseItem = function(item) {
                var props = item.properties;
                return {
                    properties: L.gmxUtil.getPropertiesHash(props, indexes),
                    geometry: props[props.length - 1]
                };
            };

        var clusters = {};

        return function( data ) {
            var objects = [];
            var clustersToRepaint = {};

            (data.removed || []).map(function(it) {
                objects.push({ onExtent: false, item: parseItem(it) });
            });
            (data.added || []).map(function(it) {
                objects.push({ onExtent: true, item: parseItem(it) });
            });

            for (var k = 0; k < objects.length; k++)
            {
                var props = objects[k].item.properties;
                var mult = objects[k].onExtent ? 1 : -1;
                var count = (countAttr ? props[countAttr] : 1) * mult;

                if (!props[clusterAttr])
                    continue;

                var clusterId = '_' + props[clusterAttr];
                var hotspotId = '_' + props[idAttr];

                if (!clusters[clusterId]) {
                    clusters[clusterId] = {
                        spots: {},
                        lat: 0,
                        lng: 0,
                        count: 0,
                        startDate: Number.POSITIVE_INFINITY,
                        endDate: Number.NEGATIVE_INFINITY,
                        isIndustrial: false
                    };
                }
                var cluster = clusters[clusterId];

                //два раза одну и ту же точку не добавляем
                if (hotspotId in cluster.spots && objects[k].onExtent)
                    continue;

                var coords = objects[k].item.geometry.coordinates,
                    latlng = L.Projection.SphericalMercator.unproject({y: coords[1], x: coords[0]});

                if (objects[k].onExtent)
                    cluster.spots[hotspotId] = [latlng.lng, latlng.lat, 250]; //TODO: выбрать правильный номер sample
                else
                    delete cluster.spots[hotspotId];

                var hotspotDate = props[dateAttr];

                cluster.lat += count * coords[1];
                cluster.lng += count * coords[0];
                cluster.count += count;
                cluster.startDate = Math.min(cluster.startDate, hotspotDate);
                cluster.endDate   = Math.max(cluster.endDate,   hotspotDate);
                cluster.isIndustrial = cluster.isIndustrial || (Number(props.FireType) & 1);

                clustersToRepaint[clusterId] = true;
            }

            var clustersToAdd = [],
                itemIDsToRemove = [];

            for (var k in clustersToRepaint)
            {
                var cluster = clusters[k],
                    count = cluster.count;
                if (count)
                {
                    var strStartDate = dateToString(cluster.startDate);
                    var strEndDate = dateToString(cluster.endDate);

                    var newItem = [
                        k,
                        String(Math.pow(Math.log(count+1), 1.3)/3.5),
                        count,
                        count >= 10 ? count : null,
                        cluster.startDate,
                        cluster.endDate,
                        cluster.startDate === cluster.endDate ? strEndDate : strStartDate + '-' + strEndDate,
                        Number(cluster.isIndustrial)
                    ];

                    if (estimeteGeometry) {
                        var points = [];
                        for (var p in clusters[k].spots)
                            points.push(clusters[k].spots[p]);

                        var multiPolygon = _hq.getPixelMultiPolygon(points);
                        var tmpPolygon = _hq.MultiPolygonUnion(multiPolygon);

                        newItem.push({
                            type: 'MULTIPOLYGON',
                            coordinates: tmpPolygon
                        });
                    } else {
                        newItem.push({
                            type: 'POINT',
                            coordinates: [clusters[k].lng / count, clusters[k].lat / count]
                        });
                    }

                    clustersToAdd.push(newItem);
                } else {
                    itemIDsToRemove.push(k);
                    delete clusters[k];

                }
            }

            layer.addData(clustersToAdd);
            layer.removeData(itemIDsToRemove);
        }
    },

    _updateLayersVisibility: function() {
        var map = this._map,
			isVisible = !!map,
            zoom = map && map.getZoom();

        this._observerHotspots && this._observerHotspots.toggleActive(isVisible && zoom >= this.options.minGeomZoom);
        this._observerClusters && this._observerClusters.toggleActive(isVisible && zoom <  this.options.minGeomZoom && zoom >= this.options.minClustersZoom);
        this._observerHeatmap && this._observerHeatmap.toggleActive(isVisible && zoom < this.options.minClustersZoom);

        // this._heatmapLayer && this._heatmapLayer.setVisibility(isVisible && zoom < this.options.minClustersZoom);
			// map && ((isVisible && zoom < this.options.minClustersZoom) ? map.addLayer(this._heatmapLayer) : map.removeLayer(this._heatmapLayer));
        if (map) {
			if (zoom < this.options.minClustersZoom) {
				map.addLayer(this._heatmapLayer)
				map.removeLayer(this._clustersLayer);
			} else {
				map.addLayer(this._clustersLayer)
				map.removeLayer(this._heatmapLayer);
			}
		}
    }
});

var FireVirtualFactory = function() {};
FireVirtualFactory.prototype.initFromDescription = function(layerDescription) {
    var props = layerDescription.properties,
        meta = props.MetaProperties;

    var options = {
        mapID: meta.mapID.Value,
        hotspotLayerID: meta.hotspotLayerID.Value,
        dailyLayerID: meta.dailyLayerID.Value,
        heatmapLayerID: meta.heatmapLayerID &&  meta.heatmapLayerID.Value,
        z_index: meta.z_index && meta.z_index.Value
    }

    if ('minGeomZoom' in meta) {
        options.minGeomZoom = Number(meta.minGeomZoom.Value);
    }

    if ('minHotspotZoom' in meta) {
        options.minHotspotZoom = Number(meta.minHotspotZoom.Value);
    }
    if ('minClustersZoom' in meta) {
        options.minClustersZoom = Number(meta.minClustersZoom.Value);
    }
    // if ('z_index' in meta) {
        // options.zIndex = Number(meta.z_index.Value);
    // }
    // if ('zIndex' in meta) {
        // options.zIndex = Number(meta.zIndex.Value);
    // }

    var layer = new FireVirtualLayer(options);

    layer.getGmxProperties = function() {
        return props;
    }

    return layer;
}

L.gmx.addLayerClass('Fire', FireVirtualFactory);
// L.gmx.addLayerClass('Fire', FireVirtualLayer);

if (window.gmxCore) {
    gmxCore.addModule('FireVirtualLayer', {layerClass: FireVirtualFactory}, {
        css: 'FirePlugin.css',
        init: function(module, path) {
            initTranslations();
            return gmxCore.loadScriptWithCheck([{
                    check: function(){ return window.SpatialQuery; },
                    script: path + 'spatial_query.js'
                }]
            );
        }
    });
}

})();
