var PickingControl = function (map, layers, maxZoom, callback, sender) {

    var _image = new Image();
    _image.crossOrigin = '';

    for (var i = 0; i < layers.length; i++) {
        (function (layer) {
            layer.on("click", function (e) {

                var latlng = e.latlng;

                var zoom = map.getZoom();

                var tc = _getTileCoords(latlng, zoom > maxZoom ? maxZoom : zoom);

                _image.onload = function (img) {
                    var rgba = _getTilePixelRgba(this, latlng, tc.x, tc.y, tc.z);
                    callback && callback.call(sender || this, latlng, rgba);
                };

                _image.onerror = function () {
                    console.log("error");
                };

                var h = L.gmx.gmxSessionManager.getSessionKey(document.location.hostname);

                if (h) {
                    h.then(function (key) {
                        _image.src = "//maps.kosmosnimki.ru/TileSender.ashx?ModeKey=tile&key=&LayerName=" +
                            layer.getGmxProperties().name + "&z=" + tc.z + "&x=" + tc.x + "&y=" + tc.y + "key=" + key;
                    });
                } else {
                    _image.src = "//maps.kosmosnimki.ru/TileSender.ashx?ModeKey=tile&key=&LayerName=" +
                        layer.getGmxProperties().name + "&z=" + tc.z + "&x=" + tc.x + "&y=" + tc.y;
                }
            });
        })(layers[i]);
    };

    var _getTilePixelRgba = function (img, latlng, x, y, z) {

        var canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        var imgd = ctx.getImageData(0, 0, img.width, img.height);
        var pix = imgd.data;

        var merc_x = _merc_x(latlng.lng),
            merc_y = _merc_y(latlng.lat);

        var bl = new L.Point(-20037508.3428, -15496570.7397),
            tr = new L.Point(20037508.3428, 18764656.2314);

        var w = Math.abs(tr.x - bl.x);
        var h = w;

        var tileCount = Math.pow(2, z);

        var tileWidth = w / tileCount,
            tileHeight = h / tileCount;

        var tx = (merc_x - tileWidth * x) / tileWidth,
            ty = 1.0 - (merc_y - tileHeight * y) / tileHeight;

        var _i = Math.floor(tx * img.width),
            _j = Math.floor(ty * img.height);

        var ind = 4 * (_j * img.width + _i);

        return [pix[ind], pix[ind + 1], pix[ind + 2], pix[ind + 3]];
    };

    var _getTileCoords = function (latlng, z) {
        var merc_x = _merc_x(latlng.lng),
            merc_y = _merc_y(latlng.lat);

        var bl = new L.Point(-20037508.3428, -15496570.7397),
            tr = new L.Point(20037508.3428, 18764656.2314);

        var w = Math.abs(tr.x - bl.x);
        var h = w;

        var tileCount = Math.pow(2, z);

        var tileWidth = w / tileCount,
            tileHeight = h / tileCount;

        return { 'x': Math.floor(merc_x / tileWidth), 'y': Math.floor(merc_y / tileHeight), 'z': z }
    };

    var _deg_rad = function (ang) {
        return ang * (Math.PI / 180.0);
    };

    var _merc_x = function (lon) {
        var r_major = 6378137.000;
        return r_major * _deg_rad(lon);
    };

    var _merc_y = function (lat) {
        if (lat > 89.5)
            lat = 89.5;
        if (lat < -89.5)
            lat = -89.5;
        var r_major = 6378137.000;
        var r_minor = 6356752.3142;
        var temp = r_minor / r_major;
        var es = 1.0 - (temp * temp);
        var eccent = Math.sqrt(es);
        var phi = _deg_rad(lat);
        var sinphi = Math.sin(phi);
        var con = eccent * sinphi;
        var com = .5 * eccent;
        con = Math.pow(((1.0 - con) / (1.0 + con)), com);
        var ts = Math.tan(.5 * ((Math.PI * 0.5) - phi)) / con;
        var y = 0 - r_major * Math.log(ts);
        return y;
    };
};