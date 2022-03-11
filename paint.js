/*
UPDATE 03/30/2017 I found this block of code that make canvas paint works in mobile devices. I do not know how it works, but it works xD. This block code comes from Emma's Paint Project https://www.sololearn.com/Profile/1769383 so all credits for her.
*/
/*
UPDATE 03/31/2017 Now you can apply a blur brush effect.
*/
// Variables DOM
(function() {
    var canvas = document.getElementById('canvas');
    var radiusPoint = document.getElementById('radiusPoint');
    var radiusBlur = document.getElementById('radiusBlur');
    var radTextRaduis = document.getElementById('radTextRaduis');
    var radTextBlur = document.getElementById('radTextBlur');
    var radioColors = document.getElementsByName('radioColors');
    var invertCanvas = document.getElementById('saveCanvas');
    var clearCanvas = document.getElementById('clearCanvas');
    // Variable for touch mobile
    var arr_touches = [];
    // Set variables for color brush
    var colorsLength = radioColors.length;
    var i = 0;
    // Default radio brush and blur
    var radius = 10;
    var blur = 0;
    // Variables draw canvas
    var draggin = false;
    var ctx = canvas.getContext('2d');

    // Initiating canvas
    canvas.width = 256; //window.innerWidth;
    canvas.height = 256; //window.innerHeight;
    ctx.lineWidth = radius * 2;
    ctx.strokeStyle = '#111111';
    ctx.fillStyle = '#111111';
    ctx.shadowColor = '#111111';
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Seting radius brush
    var setRadiusPoint = function(newRadius) {
        radius = newRadius;
        ctx.lineWidth = radius * 2;
    };
    // Seting radius blur
    var setRadiusBlur = function(newBlur) {
        blur = newBlur;
        ctx.shadowBlur = blur;
    };
    // Seting colors brush and blur
    var changeColor = function(newColor) {
        // console.log("New color is: " + newColor);
        ctx.strokeStyle = newColor;
        ctx.fillStyle = newColor;
        ctx.shadowColor = newColor;
    };
    var selectColors = function(e) {
        var selectColor = e.target;
        changeColor(selectColor.value);
    };
    // Save canvas
    function saveImage() {
        var data = canvas.toDataURL();
        // Simple mode save image, this will open a new window 
        window.open(data, '_blank', 'location=0, menubar=0');
    }
    // Clear canvas
    function clearImage() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    // Drawing canvas
    var engage = function(e) {
        draggin = true;
        putPoint(e);
    };
    var disengage = function() {
        draggin = false;
        ctx.beginPath();
    };
    var putPoint = function(e) {
        const offset = findPos(canvas);
        if (draggin) {
            ctx.lineTo(e.clientX - offset.x, e.clientY - offset.y);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(e.clientX - offset.x, e.clientY - offset.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(e.clientX - offset.x, e.clientY - offset.y);
        }
    };
    // Functions canvas mobile touch
    function handleStart(evt) {
        var touches = evt.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            if (isValidTouch(touches[i])) {
                evt.preventDefault();
                arr_touches.push(copyTouch(touches[i]));
                ctx.beginPath();
                ctx.fill();
            }
        }
    }

    function handleTouchMove(evt) {
        var touches = evt.changedTouches;
        var offset = findPos(canvas);
        for (var i = 0; i < touches.length; i++) {
            if (isValidTouch(touches[i])) {
                evt.preventDefault();
                var idx = ongoingTouchIndexById(touches[i].identifier);
                if (idx >= 0) {
                    ctx.lineTo(touches[i].clientX - offset.x, touches[i].clientY - offset.y);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.arc(touches[i].clientX - offset.x, touches[i].clientY - offset.y, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(arr_touches[idx].clientX - offset.x, arr_touches[idx].clientY - offset.y);
                    arr_touches.splice(idx, 1, copyTouch(touches[i]));
                }
            }
        }
    }

    function handleEnd(evt) {
        var touches = evt.changedTouches;
        var offset = findPos(canvas);
        for (var i = 0; i < touches.length; i++) {
            if (isValidTouch(touches[i])) {
                evt.preventDefault();
                var idx = ongoingTouchIndexById(touches[i].identifier);
                if (idx >= 0) {
                    ctx.beginPath();
                    ctx.moveTo(arr_touches[idx].clientX - offset.x, arr_touches[idx].clientY - offset.y);
                    ctx.lineTo(touches[i].clientX - offset.x, touches[i].clientY - offset.y);
                    arr_touches.splice(i, 1);
                }
            }
        }
    }

    function handleCancel(evt) {
        evt.preventDefault();
        var touches = evt.changedTouches;
        for (var i = 0; i < touches.length; i++) {
            arr_touches.splice(i, 1);
        }
    }

    function copyTouch(touch) {
        return {
            identifier: touch.identifier,
            clientX: touch.clientX,
            clientY: touch.clientY
        };
    }

    function ongoingTouchIndexById(idToFind) {
        for (var i = 0; i < arr_touches.length; i++) {
            var id = arr_touches[i].identifier;
            if (id == idToFind) {
                return i;
            }
        }
        return -1;
    }

    function isValidTouch(touch) {
        var curleft = 0,
            curtop = 0;
        var offset = 0;
        if (canvas.offsetParent) {
            do {
                curleft += canvas.offsetLeft;
                curtop += canvas.offsetTop;
            } while (touch == canvas.offsetParent);
            offset = {
                x: curleft - document.body.scrollLeft,
                y: curtop - document.body.scrollTop
            };
        }
        if (touch.clientX - offset.x > 0 &&
            touch.clientX - offset.x < parseFloat(canvas.width) &&
            touch.clientY - offset.y > 0 &&
            touch.clientY - offset.y < parseFloat(canvas.height)) {
            return true;
        } else {
            return false;
        }
    }

    function findPos(obj) {
        var curleft = 0,
            curtop = 0;
        if (obj.offsetParent) {
            do {
                curleft += obj.offsetLeft;
                curtop += obj.offsetTop;
            } while (obj == obj.offsetParent);
            return {
                x: curleft - document.body.scrollLeft,
                y: curtop - document.body.scrollTop
            };
        }
    }
    // Handling events listeners
    radiusPoint.addEventListener('input', function() {
        radTextRaduis.innerHTML = radiusPoint.value;
        setRadiusPoint(this.value);
    });
    radiusBlur.addEventListener('input', function() {
        radTextBlur.innerHTML = radiusBlur.value;
        setRadiusBlur(this.value);
    });
    for (i = 0; i < colorsLength; i++) {
        // console.log("Elemento de indice " + i + " tiene value " + radioColors[i].value);
        radioColors[i].addEventListener('change', selectColors);
    }


    // Invert canvas
    function invertImage() {
        // Array 256x256x4
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0, length = data.length; i < length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
        ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);
        //var data = canvas.toDataURL();

        // Simple mode save image, this will open a new window 
        //window.open(data, '_blank', 'location=0, menubar=0');
    }

    invertCanvas.addEventListener('click', invertImage);
    clearCanvas.addEventListener('click', clearImage);
    canvas.addEventListener('mousedown', engage);
    canvas.addEventListener('mouseup', disengage);
    canvas.addEventListener('mousemove', putPoint);

    // Handling mobile touch events
    canvas.addEventListener("touchstart", handleStart, false);
    canvas.addEventListener("touchend", handleEnd, false);
    canvas.addEventListener("touchcancel", handleCancel, false);
    canvas.addEventListener("touchleave", handleEnd, false);
    canvas.addEventListener("touchmove", handleTouchMove, false);
})();