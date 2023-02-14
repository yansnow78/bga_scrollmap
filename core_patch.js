// e board game core stuff

define([
    "dojo", "dojo/_base/declare",
    "dojo/fx",
    "dojo/fx/easing"
],
function (dojo, declare) {

    return declare("ebg.core.core_patch", null, {
        constructor: function(){
            this.calcScale = true;
            console.log('ebg.core.core_patch constructor');
        },
        
        _calcScale: function( element ){
            if (!this.calcScale)
                return 1;
            var matrix = new DOMMatrix(window.getComputedStyle(element).transform);
            var scale = Math.sqrt(matrix.m11*matrix.m11+ 
                matrix.m21*matrix.m21+
                matrix.m31*matrix.m31);
            var parent = element.parentElement;
            if (parent === null)
                return scale;
            else
                return scale*this._calcScale(parent);
        },

        // Place an object on another one
        // Note: if it does not work check that:
        //  1°) mobile_obj has a position:absolute or position:relative
        //  2°) a fixed mobile_obj parent has a position absolute or relative
        placeOnObject: function( mobile_obj, target_obj, scale )
        {
            //console.log( 'placeOnObject' );
            
            if( mobile_obj === null )
            {   console.error( 'placeOnObject: mobile obj is null' );   }
            if( target_obj === null )
            {   console.error( 'placeOnObject: target obj is null' );   }

            if( typeof mobile_obj == 'string' )
            {  var mobile_obj_dom = $( mobile_obj );    }
            else
            {   var mobile_obj_dom = mobile_obj;    }

            var disabled3d = this.disable3dIfNeeded();

            
            var tgt = dojo.position( target_obj );
            var src = dojo.position( mobile_obj );
                       
            // Current mobile object relative coordinates
            var left = dojo.style( mobile_obj, 'left' );
            var top = dojo.style( mobile_obj, 'top' );

            var vector_abs = {
                x: tgt.x-src.x + (tgt.w-src.w)/2,
                y: tgt.y-src.y + (tgt.h-src.h)/2
            };
            
            var mobile_obj_parent = mobile_obj_dom.parentNode;
            var mobile_obj_parent_alpha = this.getAbsRotationAngle( mobile_obj_parent );
            var vector = this.vector_rotate( vector_abs, mobile_obj_parent_alpha );

            if (typeof scale == 'undefined')
                scale = this._calcScale(mobile_obj_dom);
            left = left+vector.x/scale;
            top = top+ vector.y/scale;
            

            // Move to new location and fade in
            dojo.style( mobile_obj, 'top', top + 'px' );
            dojo.style( mobile_obj, 'left', left + 'px' );

            this.enable3dIfNeeded( disabled3d );
        },
        
        // Place an object on another one with a delta
        // Note: if it does not work check that:
        //  1°) mobile_obj has a position:absolute or position:relative
        //  2°) a fixed mobile_obj parent has a position absolute or relative
        placeOnObjectPos: function( mobile_obj, target_obj, target_x, target_y, scale )
        {
            console.log( 'placeOnObject' );
            
            if( mobile_obj === null )
            {   console.error( 'placeOnObject: mobile obj is null' );   }
            if( target_obj === null )
            {   console.error( 'placeOnObject: target obj is null' );   }

            if( typeof mobile_obj == 'string' )
            {  var mobile_obj_dom = $( mobile_obj );    }
            else
            {   var mobile_obj_dom = mobile_obj;    }

            var disabled3d = this.disable3dIfNeeded();
            
            var tgt = dojo.position( target_obj );
            var src = dojo.position( mobile_obj );

                       
            // Current mobile object relative coordinates
            var left = dojo.style( mobile_obj, 'left' );
            var top = dojo.style( mobile_obj, 'top' );

            if (scale === null)
                scale = this._calcScale(mobile_obj_dom);
            var vector_abs = {
                x: (tgt.x-src.x + (tgt.w-src.w)/2)/scale + target_x,
                y: (tgt.y-src.y + (tgt.h-src.h)/2)/scale + target_y
            };

            var mobile_obj_parent_alpha = this.getAbsRotationAngle( mobile_obj_dom.parentNode );
            var vector = this.vector_rotate( vector_abs, mobile_obj_parent_alpha );

            left = left+vector.x;
            top = top+ vector.y;

            // Move to new location and fade in
            dojo.style( mobile_obj, 'top', top + 'px' );
            dojo.style( mobile_obj, 'left', left + 'px' );

            this.enable3dIfNeeded( disabled3d );
        },     
        
        // Return an animation that is moving (slide) a DOM object over another one
        slideToObject: function( mobile_obj, target_obj, duration, delay, scale )
        {
            if( mobile_obj === null )
            {   console.error( 'slideToObject: mobile obj is null' );   }
            if( target_obj === null )
            {   console.error( 'slideToObject: target obj is null' );   }

            if( typeof mobile_obj == 'string' )
            {  var mobile_obj_dom = $( mobile_obj );    }
            else
            {   var mobile_obj_dom = mobile_obj;    }

            var disabled3d = this.disable3dIfNeeded();

            var tgt = dojo.position( target_obj );
            var src = dojo.position( mobile_obj );
    
            if( typeof duration == 'undefined' )
            {    duration = 500;    }
            if( typeof delay == 'undefined' )
            {    delay = 0;    }
            
            if( this.instantaneousMode )
            {   
                delay=Math.min( 1, delay );
                duration=Math.min( 1, duration );
            }
            
            // Current mobile object relative coordinates
            var left = dojo.style( mobile_obj, 'left' );
            var top = dojo.style( mobile_obj, 'top' );

            var vector_abs = {
                x: tgt.x-src.x + (tgt.w-src.w)/2,
                y: tgt.y-src.y + (tgt.h-src.h)/2 
            };

            var mobile_obj_parent_alpha = this.getAbsRotationAngle( mobile_obj_dom.parentNode );
            var vector = this.vector_rotate( vector_abs, mobile_obj_parent_alpha );

            if (typeof scale == 'undefined')
                scale = this._calcScale(mobile_obj_dom);
            left = left+vector.x/scale;
            top = top+ vector.y/scale;

            
//            console.log( 'src: left='+toint( src.x )+', top='+toint( src.y ) +"\n"+
//                   'target: left='+toint( tgt.x )+', top='+toint( tgt.y ) +"\n"+
//                   'result: left='+toint( left )+', top='+toint( top ) );


            this.enable3dIfNeeded( disabled3d );

            var anim = dojo.fx.slideTo( {  node: mobile_obj,
                                top: top,
                                left: left ,
                                delay: delay,
                                duration: duration,
                                unit: "px" } );

            if( disabled3d !== null )
            {
                anim = this.transformSlideAnimTo3d( anim, mobile_obj_dom, duration, delay, vector.x, vector.y );
            }
            return anim;
              
        },
        
        // Return an animation that is moving (slide) a DOM object over another one at the given coordinates
        slideToObjectPos: function( mobile_obj, target_obj, target_x, target_y, duration, delay, scale )
        {
            if( mobile_obj === null )
            {   console.error( 'slideToObjectPos: mobile obj is null' );   }
            if( target_obj === null )
            {   console.error( 'slideToObjectPos: target obj is null' );   }
            if( target_x === null )
            {   console.error( 'slideToObjectPos: target x is null' );   }
            if( target_y === null )
            {   console.error( 'slideToObjectPos: target y is null' );   }

            if( typeof mobile_obj == 'string' )
            {  var mobile_obj_dom = $( mobile_obj );    }
            else
            {   var mobile_obj_dom = mobile_obj;    }

            var disabled3d = this.disable3dIfNeeded();

            var tgt = dojo.position( target_obj );
            var src = dojo.position( mobile_obj );
            
            if( typeof duration == 'undefined' )
            {    duration = 500;    }
            if( typeof delay == 'undefined' )
            {    delay = 0;    }

            if( this.instantaneousMode )
            {   
                delay=Math.min( 1, delay );
                duration=Math.min( 1, duration );
            }

            // Current mobile object relative coordinates
            var left = dojo.style( mobile_obj, 'left' );
            var top = dojo.style( mobile_obj, 'top' );

            if (typeof scale == 'undefined')
                scale = this._calcScale(mobile_obj_dom);
            var vector_abs = {
                x: (tgt.x-src.x)/scale + toint( target_x ),
                y: (tgt.y-src.y)/scale + toint( target_y )
            };

            var mobile_obj_parent_alpha = this.getAbsRotationAngle( mobile_obj_dom.parentNode );
            var vector = this.vector_rotate( vector_abs, mobile_obj_parent_alpha );

            left = left+vector.x;
            top = top+ vector.y;

            this.enable3dIfNeeded( disabled3d );

            // Move to new location and fade in
            var anim = dojo.fx.slideTo( {  node: mobile_obj,
                                top: top,
                                left: left ,
                                delay: delay,
                                duration: duration,
                                easing: dojo.fx.easing.cubicInOut,
                                unit: "px" } );

            if( disabled3d !== null )
            {
                anim = this.transformSlideAnimTo3d( anim, mobile_obj_dom, duration, delay, vector.x, vector.y );
            }

            return anim;              
        },
		
        // Attach mobile_obj to a new parent, keeping its absolute position in the screen constant.
        // !! mobile_obj is no longer valid after that (a new corresponding mobile_obj is returned)
        attachToNewParent: function( mobile_obj, new_parent, position, scale )
        {
            //console.log( "attachToNewParent" );
            
            if( typeof mobile_obj == 'string' )
            {   mobile_obj = $( mobile_obj );   }
            if( typeof new_parent == 'string' )
            {   new_parent = $( new_parent );   }
            if( typeof position == 'undefined' )
            {   position = 'last';  }

            if( mobile_obj === null )
            {   console.error( 'attachToNewParent: mobile obj is null' );   }
            if( new_parent === null )
            {   console.error( 'attachToNewParent: new_parent is null' );   }

            var disabled3d = this.disable3dIfNeeded();


            var tgt = dojo.position( mobile_obj );
            var alpha_mobile_original = this.getAbsRotationAngle( mobile_obj );

            var my_new_mobile = dojo.clone( mobile_obj );
            dojo.destroy( mobile_obj );
            dojo.place( my_new_mobile, new_parent, position );

            var src = dojo.position( my_new_mobile );
            var left = dojo.style( my_new_mobile, 'left' );
            var top = dojo.style( my_new_mobile, 'top' );
            var alpha_mobile_new = this.getAbsRotationAngle( my_new_mobile );

            var alpha_new_parent = this.getAbsRotationAngle( new_parent );
            
            // The vector we have to move our mobile object, in absolute coordinates
            var vector_abs = {
                x: tgt.x-src.x + (tgt.w-src.w)/2,
                y: tgt.y-src.y + (tgt.h-src.h)/2
            };
            
            var vector = this.vector_rotate( vector_abs, alpha_new_parent );

            if (typeof scale == 'undefined')
                scale = this._calcScale(new_parent);
            left = left + vector.x/scale;
            top = top + vector.y/scale;

            dojo.style( my_new_mobile, 'top', top + 'px' );
            dojo.style( my_new_mobile, 'left', left + 'px' );

            if( alpha_mobile_new != alpha_mobile_original )
            {
                // We must rotate the new element to make sure its absolute rotation angle do not change
                this.rotateInstantDelta( my_new_mobile, alpha_mobile_original - alpha_mobile_new );
            }

            this.enable3dIfNeeded( disabled3d );
            
            return my_new_mobile;
        },       
        
    });       
    
  
    
});

