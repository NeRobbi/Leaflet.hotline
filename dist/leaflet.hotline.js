/*
 (c) 2015, iosphere GmbH
 Leaflet.hotline, a Leaflet plugin for drawing gradients along polylines.
 https://github.com/iosphere/Leaflet.hotline/
*/
(function(root, plugin) {
    if (typeof define === "function" && define.amd) {
        define([ "leaflet" ], plugin);
    } else if (typeof exports === "object") {
        module.exports = plugin;
    } else {
        plugin(root.L);
    }
})(this, function(L) {
    if (L.Hotline) {
        return L;
    }
    var Hotline = function(canvas) {
        if (!(this instanceof Hotline)) {
            return new Hotline(canvas);
        }
        var defaultPalette = {
            0: "green",
            .5: "yellow",
            1: "red"
        };
        this._canvas = canvas = typeof canvas === "string" ? document.getElementById(canvas) : canvas;
        this._ctx = canvas.getContext("2d");
        this._width = canvas.width;
        this._height = canvas.height;
        this._weight = 5;
        this._outlineWidth = 1;
        this._outlineColor = "black";
        this._min = 0;
        this._max = 1;
        this._data = [];
        this.palette(defaultPalette);
    };
    Hotline.prototype = {
        width: function(width) {
            this._width = width;
            return this;
        },
        height: function(height) {
            this._height = height;
            return this;
        },
        weight: function(weight) {
            this._weight = weight;
            return this;
        },
        outlineWidth: function(outlineWidth) {
            this._outlineWidth = outlineWidth;
            return this;
        },
        outlineColor: function(outlineColor) {
            this._outlineColor = outlineColor;
            return this;
        },
        palette: function(palette) {
            var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d"), gradient = ctx.createLinearGradient(0, 0, 0, 256);
            canvas.width = 1;
            canvas.height = 256;
            for (var i in palette) {
                gradient.addColorStop(i, palette[i]);
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 1, 256);
            this._palette = ctx.getImageData(0, 0, 1, 256).data;
            return this;
        },
        min: function(min) {
            this._min = min;
            return this;
        },
        max: function(max) {
            this._max = max;
            return this;
        },
        data: function(data) {
            this._data = data;
            return this;
        },
        add: function(path) {
            this._data.push(path);
            return this;
        },
        clear: function(clearData) {
            if (clearData) {
                this._data = [];
            }
            this._ctx.clearRect(0, 0, this._width, this._height);
            return this;
        },
        draw: function(clear) {
            var ctx = this._ctx;
            ctx.globalCompositeOperation = clear ? "destination-out" : "source-over";
            ctx.lineCap = "round";
            this._drawOutline(ctx, clear);
            if (clear) {
                return this;
            }
            this._drawHotline(ctx);
            return this;
        },
        _drawOutline: function(ctx, clear) {
            var i, j, dataLength, path, lineWidth, pathLength, pointStart, pointEnd;
            if (clear || this._outlineWidth) {
                for (i = 0, dataLength = this._data.length; i < dataLength; i++) {
                    path = this._data[i];
                    lineWidth = this._weight + 2 * this._outlineWidth;
                    path._prevWidth = ctx.lineWidth = clear ? (path._prevWidth || lineWidth) + 1 : lineWidth;
                    for (j = 1, pathLength = path.length; j < pathLength; j++) {
                        pointStart = path[j - 1];
                        pointEnd = path[j];
                        ctx.strokeStyle = this._outlineColor;
                        ctx.beginPath();
                        ctx.moveTo(pointStart.x, pointStart.y);
                        ctx.lineTo(pointEnd.x, pointEnd.y);
                        ctx.stroke();
                    }
                }
            }
        },
        _drawHotline: function(ctx) {
            var i, j, dataLength, path, pathLength, pointStart, pointEnd, zStart, zEnd, gradient, gradientStart, gradientEnd;
            ctx.lineWidth = this._weight;
            for (i = 0, dataLength = this._data.length; i < dataLength; i++) {
                path = this._data[i];
                for (j = 1, pathLength = path.length; j < pathLength; j++) {
                    pointStart = path[j - 1];
                    pointEnd = path[j];
                    zStart = Math.min(Math.max((pointStart.z - this._min) / (this._max - this._min), 0), .99);
                    zEnd = Math.min(Math.max((pointEnd.z - this._min) / (this._max - this._min), 0), .99);
                    gradient = ctx.createLinearGradient(pointStart.x, pointStart.y, pointEnd.x, pointEnd.y);
                    gradientStart = Math.floor(zStart * 256) * 4;
                    gradientEnd = Math.floor(zEnd * 256) * 4;
                    gradient.addColorStop(0, "rgba(" + this._palette[gradientStart] + "," + this._palette[gradientStart + 1] + "," + this._palette[gradientStart + 2] + "," + "1)");
                    gradient.addColorStop(1, "rgba(" + this._palette[gradientEnd] + "," + this._palette[gradientEnd + 1] + "," + this._palette[gradientEnd + 2] + "," + "1)");
                    ctx.strokeStyle = gradient;
                    ctx.beginPath();
                    ctx.moveTo(pointStart.x, pointStart.y);
                    ctx.lineTo(pointEnd.x, pointEnd.y);
                    ctx.stroke();
                }
            }
        }
    };
    var Renderer = L.Canvas.extend({
        _initContainer: function() {
            L.Canvas.prototype._initContainer.call(this);
            this._hotline = new Hotline(this._container);
        },
        _update: function() {
            L.Canvas.prototype._update.call(this);
            this._hotline.width(this._container.width);
            this._hotline.height(this._container.height);
        },
        _updatePoly: function(layer) {
            var parts = layer._parts;
            if (!parts.length) {
                return;
            }
            this._updateOptions(layer);
            this._hotline.data(parts).draw(this._clear);
        },
        _updateOptions: function(layer) {
            if (layer.options.min != null) {
                this._hotline.min(layer.options.min);
            }
            if (layer.options.max != null) {
                this._hotline.max(layer.options.max);
            }
            if (layer.options.weight != null) {
                this._hotline.weight(layer.options.weight);
            }
            if (layer.options.outlineWidth != null) {
                this._hotline.outlineWidth(layer.options.outlineWidth);
            }
            if (layer.options.outlineColor != null) {
                this._hotline.outlineColor(layer.options.outlineColor);
            }
            if (layer.options.palette) {
                this._hotline.palette(layer.options.palette);
            }
        }
    });
    var renderer = function(options) {
        return L.Browser.canvas ? new Renderer(options) : null;
    };
    var Util = {
        clipSegment: function(a, b, bounds, useLastCode, round) {
            var codeA = useLastCode ? this._lastCode : L.LineUtil._getBitCode(a, bounds), codeB = L.LineUtil._getBitCode(b, bounds), codeOut, p, newCode;
            this._lastCode = codeB;
            while (true) {
                if (!(codeA | codeB)) {
                    return [ a, b ];
                } else if (codeA & codeB) {
                    return false;
                } else {
                    codeOut = codeA || codeB;
                    p = L.LineUtil._getEdgeIntersection(a, b, codeOut, bounds, round);
                    newCode = L.LineUtil._getBitCode(p, bounds);
                    if (codeOut === codeA) {
                        p.z = a.z;
                        a = p;
                        codeA = newCode;
                    } else {
                        p.z = b.z;
                        b = p;
                        codeB = newCode;
                    }
                }
            }
        }
    };
    L.Hotline = L.Polyline.extend({
        statics: {
            Renderer: Renderer,
            renderer: renderer
        },
        options: {
            renderer: renderer(),
            min: 0,
            max: 1,
            palette: {
                0: "green",
                .5: "yellow",
                1: "red"
            },
            weight: 5,
            outlineColor: "black",
            outlineWidth: 1
        },
        _projectLatlngs: function(latlngs, result) {
            var flat = latlngs[0] instanceof L.LatLng, len = latlngs.length, i, ring;
            if (flat) {
                ring = [];
                for (i = 0; i < len; i++) {
                    ring[i] = this._map.latLngToLayerPoint(latlngs[i]);
                    ring[i].z = latlngs[i].alt;
                }
                result.push(ring);
            } else {
                for (i = 0; i < len; i++) {
                    this._projectLatlngs(latlngs[i], result);
                }
            }
        },
        _clipPoints: function() {
            if (this.options.noClip) {
                this._parts = this._rings;
                return;
            }
            this._parts = [];
            var parts = this._parts, bounds = this._renderer._bounds, i, j, k, len, len2, segment, points;
            for (i = 0, k = 0, len = this._rings.length; i < len; i++) {
                points = this._rings[i];
                for (j = 0, len2 = points.length; j < len2 - 1; j++) {
                    segment = Util.clipSegment(points[j], points[j + 1], bounds, j, true);
                    if (!segment) {
                        continue;
                    }
                    parts[k] = parts[k] || [];
                    parts[k].push(segment[0]);
                    if (segment[1] !== points[j + 1] || j === len2 - 2) {
                        parts[k].push(segment[1]);
                        k++;
                    }
                }
            }
        },
        _clickTolerance: function() {
            return this.options.weight / 2 + this.options.outlineWidth + (L.Browser.touch ? 10 : 0);
        }
    });
    L.hotline = function(latlngs, options) {
        return new L.Hotline(latlngs, options);
    };
    return L;
});