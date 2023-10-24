var isDebug = window.location.host == 'studio.boardgamearena.com' || window.location.hash.indexOf('debug') > -1;
var debug = isDebug ? console.info.bind(window.console) : function() {};
var error = console.error.bind(window.console);
define([
        "dojo", "dojo/_base/declare",
        "dojo/fx",
        "dojo/fx/easing"
    ],
    function (dojo, declare) {

        return declare("ebg.core.core_patch_slideto", null, {
            constructor: function () {
                debug('ebg.core.core_patch constructor');
            },

            calcScale: function (element) {
                var transform = window.getComputedStyle(element).transform;
                var scale = 1;
                if (transform !== "none") {
                    var matrix = new DOMMatrix(transform);
                    scale = Math.hypot(matrix.m11, matrix.m21, matrix.m31);
                }
                var parent = element.parentElement;
                if (parent === null)
                    return scale;
                else
                    return scale * this.calcScale(parent);
            },

            // calcScale: function( element ){
            //     if (!this.bCalcScale)
            //         return 1;
            //     var matrix = this.calcTransform(element);
            //     return matrix ? Math.hypot(matrix.m11, matrix.m12) : 1;
            // },

            calcTransform: function (element, clearTranslation = true) {
                var transform = window.getComputedStyle(element).transform;
                var matrix = null;
                if (transform !== "none") {
                    matrix = new DOMMatrix(transform);
                }
                var parent = element.parentElement;
                if (parent !== null) {
                    var matrixParent = this.calcTransform(parent, false);
                    if (matrix === null)
                        matrix = matrixParent;
                    else if (matrixParent !== null)
                        matrix.preMultiplySelf(matrixParent);
                }
                if (matrix !== null && clearTranslation) {
                    matrix.m41 = 0;
                    matrix.m42 = 0;
                    matrix.m43 = 0;
                }
                return matrix;
            },


            calcNewLocation: function (mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter) {
                if (typeof mobile_obj == 'string')
                    mobile_obj = $(mobile_obj);
                if( typeof target_obj == 'string' )
                    target_obj = $( target_obj ); 
                var src = dojo.position(mobile_obj);

                // Current mobile object relative coordinates
                var left = dojo.style(mobile_obj, 'left');
                var top = dojo.style(mobile_obj, 'top');

                var tgt = (target_obj !== null) ? dojo.position(target_obj) : new DOMPoint(0, 0);
                var vector_abs = new DOMPoint(
                    tgt.x - src.x,
                    tgt.y - src.y
                );

                var matrix = this.calcTransform(mobile_obj.parentNode);

                if (target_x == null) {
                    vector_abs.x += (tgt.w - src.w) / 2;
                    vector_abs.y += (tgt.h - src.h) / 2;
                } else if (bRelPos) {
                    debug("relative positioning");
                    var target_matrix = this.calcTransform(target_obj);
                    var target_v = new DOMPoint(toint(target_x), toint(target_y));
                    if (target_matrix !== null) {
                        target_v = target_matrix.transformPoint(target_v);
                    }
                    var delta_x = 0;
                    if (matrix !== null)
                        delta_x = matrix.transformPoint(new DOMPoint(0, -mobile_obj.offsetHeight)).x;

                    vector_abs.x += target_v.x - delta_x;
                    vector_abs.y += target_v.y;
                    if (bFromCenter) {
                        vector_abs.x -= src.w / 2;
                        vector_abs.y -= src.h / 2;
                    }
                    if (bToCenter) {
                        vector_abs.x += tgt.w / 2;
                        vector_abs.y += tgt.h / 2;
                    }
                } else {
                    vector_abs.x += toint(target_x);
                    vector_abs.y += toint(target_y);
                    if (bFromCenter) {
                        vector_abs.x -= src.w / 2;
                        vector_abs.y -= src.h / 2;
                    }
                }

                var vector = vector_abs;
                if (matrix !== null)
                    vector = matrix.inverse().transformPoint(vector_abs);
                left += vector.x;
                top += vector.y;

                return [left, top, vector.x, vector.y];


            },

            _placeOnObject: function (mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter) {
                //debug( 'placeOnObject' );

                if (mobile_obj === null) {
                    error('placeOnObject: mobile obj is null');
                }
                if (target_obj === null && target_x === null) {
                    error('placeOnObject: target obj is null');
                }
                if (typeof mobile_obj == 'string')
                    mobile_obj = $(mobile_obj);

                var disabled3d = this.disable3dIfNeeded();

                // Move to new location and fade in
                var [left, top] = this.calcNewLocation(mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter);
                dojo.style(mobile_obj, 'top', top + 'px');
                dojo.style(mobile_obj, 'left', left + 'px');

                this.enable3dIfNeeded(disabled3d);
            },

            // Place an object on another one
            // Note: if it does not work check that:
            //  1°) mobile_obj has a position:absolute or position:relative
            //  2°) a fixed mobile_obj parent has a position absolute or relative
            placeOnObject: function (mobile_obj, target_obj) {
                this._placeOnObject(mobile_obj, target_obj);
            },

            // Place an object on another one with a delta
            // Note: if it does not work check that:
            //  1°) mobile_obj has a position:absolute or position:relative
            //  2°) a fixed mobile_obj parent has a position absolute or relative
            placeOnObjectPos: function (mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter) {
                if (typeof bRelPos == 'undefined')
                    bRelPos = this.bUseRelPosForObjPos;
                this._placeOnObject(mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter);
            },

            // Return an animation that is moving (slide) a DOM object over another one
            _slideToObject: function (mobile_obj, target_obj, target_x, target_y, bRelPos, duration, delay, bFromCenter, bToCenter) {
                if (mobile_obj === null) {
                    error('slideToObject: mobile obj is null');
                }
                if (target_obj === null) {
                    error('slideToObject: target obj is null');
                }
                if (typeof mobile_obj == 'string')
                    mobile_obj = $(mobile_obj);

                var disabled3d = this.disable3dIfNeeded();

                if (typeof duration == 'undefined') {
                    duration = 500;
                }
                if (typeof delay == 'undefined') {
                    delay = 0;
                }

                if (this.instantaneousMode) {
                    delay = Math.min(1, delay);
                    duration = Math.min(1, duration);
                }

                var [left, top, vector_x, vector_y] = this.calcNewLocation(mobile_obj, target_obj, target_x, target_y, bRelPos, bFromCenter, bToCenter);

                this.enable3dIfNeeded(disabled3d);

                var anim = dojo.fx.slideTo({
                    node: mobile_obj,
                    top: top,
                    left: left,
                    delay: delay,
                    duration: duration,
                    unit: "px"
                });

                if (disabled3d !== null) {
                    anim = this.transformSlideAnimTo3d(anim, mobile_obj, duration, delay, vector_x, vector_y);
                }
                return anim;

            },

            // Return an animation that is moving (slide) a DOM object over another one
            slideToObject: function (mobile_obj, target_obj, duration, delay) {
                return this._slideToObject(mobile_obj, target_obj, null, null, false, duration, delay);
            },

            // Return an animation that is moving (slide) a DOM object over another one at the given coordinates
            slideToObjectPos: function (mobile_obj, target_obj, target_x, target_y, duration, delay) {
                return this._slideToObject(mobile_obj, target_obj, target_x, target_y, this.bUseRelPosForObjPos, duration, delay);

            },

            // Return an animation that is moving (slide) a DOM object over another one at the given coordinates
            slideToObjectAbsPos: function (mobile_obj, target_obj, target_x, target_y, duration, delay) {
                return this._slideToObject(mobile_obj, target_obj, target_x, target_y, false, duration, delay);

            },            

            // Return an animation that is moving (slide) a DOM object over another one at the given relative coordinates from target_obj
            slideToObjectRelPos: function (mobile_obj, target_obj, target_x, target_y, duration, delay, bFromCenter, bToCenter) {
                return this._slideToObject(mobile_obj, target_obj, target_x, target_y, true, duration, delay, bFromCenter, bToCenter);

            },

            // Return an animation that is moving (slide) a DOM object to a given coordinates (no position calculation done)
            slideToPos: function (mobile_obj, target, duration, delay) {
                if (typeof duration == 'undefined') {
                    duration = 500;
                }
                if (typeof delay == 'undefined') {
                    delay = 0;
                }

                if (this.instantaneousMode) {
                    delay = Math.min(1, delay);
                    duration = Math.min(1, duration);
                }

                if (typeof target == "string")
                    target = $(target);
                if ((target instanceof Element))
                    target = {
                        x: target.style.left.replace("px", ""),
                        y: target.style.top.replace("px", "")
                    };

                var anim = dojo.fx.slideTo({
                    node: mobile_obj,
                    top: target.y,
                    left: target.x,
                    delay: delay,
                    duration: duration,
                    unit: "px"
                });
                return anim;
            },

            // Attach mobile_obj to a new parent, keeping its absolute position in the screen constant.
            // !! mobile_obj is no longer valid after that (a new corresponding mobile_obj is returned)
            attachToNewParent: function (mobile_obj, new_parent, position, bDontPreserveRotation) {
                //debug( "attachToNewParent" );

                if (typeof mobile_obj == 'string') {
                    mobile_obj = $(mobile_obj);
                }
                if (typeof new_parent == 'string') {
                    new_parent = $(new_parent);
                }
                if ((typeof position == 'undefined') || (position == null)) {
                    position = 'last';
                }

                if (mobile_obj === null) {
                    error('attachToNewParent: mobile obj is null');
                }
                if (new_parent === null) {
                    error('attachToNewParent: new_parent is null');
                }

                var disabled3d = this.disable3dIfNeeded();

                var alpha_mobile_original = this.getAbsRotationAngle(mobile_obj);

                var my_new_mobile = dojo.clone(mobile_obj);
                var tgt = dojo.position(mobile_obj);
                dojo.destroy(mobile_obj);
                dojo.place(my_new_mobile, new_parent, position);
                var alpha_mobile_new = this.getAbsRotationAngle(my_new_mobile);
                this._placeOnObject(my_new_mobile, null, tgt.x, tgt.y, false);

                if (!bDontPreserveRotation && (alpha_mobile_new != alpha_mobile_original)) {
                    // We must rotate the new element to make sure its absolute rotation angle do not change
                    this.rotateInstantDelta(my_new_mobile, alpha_mobile_original - alpha_mobile_new);
                }

                this.enable3dIfNeeded(disabled3d);

                return my_new_mobile;
            },

            // Create a temporary object and slide it from a point to another one, then destroy it
            slideTemporaryObject: function (mobile_obj_html, mobile_obj_parent, from, to, duration, delay, scale) {
                debug('slideTemporaryObject');
                var obj = dojo.place(mobile_obj_html, mobile_obj_parent);
                dojo.style(obj, 'position', 'absolute');
                dojo.style(obj, 'left', '0px');
                dojo.style(obj, 'top', '0px');
                if (scale) {
                    dojo.style(obj, 'transform', 'scale(' + scale + ')');
                }
                this.placeOnObject(obj, from);

                /*
                            // 3D test : do not activate
                		    var animation = new dojo.Animation({
                			    curve: [0, 50, 0],
                			    onAnimate: dojo.hitch( this, function (v) {
                				    obj.style.transform = 'translateZ(' + v + 'px)';
                			    } )
                		    });
                		    
                		    animation.play();                
                */

                var anim = this.slideToObject(obj, to, duration, delay);
                var destroyOnEnd = function (node) {
                    debug("destroying");
                    debug(node);
                    dojo.destroy(node);
                };
                dojo.connect(anim, 'onEnd', destroyOnEnd);
                anim.play();
                return anim;
            },

        });



    });