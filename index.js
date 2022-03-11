let imgElement = document.getElementById('srcImage');
let inputElement = document.getElementById('fileInput');
let remapFlag = document.getElementById('deformFlag');
//let predictBtn = document.getElementById('proxyPredict');
let offset = document.getElementById('sampleType');
let power = document.getElementById('powerValue');
let interpolationType = document.getElementById('interp');
let paintCanvas = document.getElementById('canvas');
let toolBar = document.getElementById('toolBar');
let imageURL;
const predictionMode = document
    .getElementsByClassName("switch")[0]
    .getElementsByTagName("input")[0];

inputElement.addEventListener("change", (e) => {
    if (!e.target.files.length) return;
    if (imageURL) URL.revokeObjectURL(imageURL);
    imageURL = URL.createObjectURL(e.target.files[0]);
    imgElement.src = imageURL;
}, false);

const hideSliders = async () => {
    const hideMap = {
        false: 'none',
        true: 'inline-block'
    };
    const flexMap = {
        false: 'none',
        true: 'flex'
    };
    const textMap = {
        false: 'Samples',
        true: 'Prediction'
    };
    const FLAG = predictionMode.checked;
    offset.style.display = hideMap[!FLAG];
    offset.previousElementSibling.style.display = hideMap[!FLAG];
    power.style.display = hideMap[FLAG];
    power.previousElementSibling.style.display = hideMap[FLAG];
    paintCanvas.style.display = hideMap[FLAG];
    toolBar.style.display = flexMap[FLAG];
    document.getElementsByClassName('switch')[0].getElementsByTagName('p')[0].textContent = textMap[FLAG];
};
hideSliders();

const evtCallback = () => {
    hideSliders();
    if (!predictionMode.checked) return process();
    runONNX();
};

remapFlag.addEventListener('change', evtCallback);

offset.addEventListener('change', evtCallback);

power.addEventListener('input', evtCallback);

interpolationType.addEventListener('change', evtCallback);

paintCanvas.addEventListener('mouseup', evtCallback);
paintCanvas.addEventListener('touchend', evtCallback);
paintCanvas.addEventListener('touchleave', evtCallback);
paintCanvas.addEventListener('touchcancel', evtCallback);

const runONNX = async () => {
    if (!model) return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(document.getElementById('canvas'), 0, 0, 256, 256, 0, 0, 64, 64);
    const POWER = (+power.value) / 2;
    const img0 = Array.from(ctx.getImageData(0, 0, 64, 64).data).filter(
        (e, i) => ((i % 4) === 0)
        //).map(e => ((1-e*INV_BYTE)**(+power.value))*255);
    ).map(e => e ** POWER);
    canvas.remove();
    //).map(e => e**(+power.value));
    //const MAX_VAL_INV = 255. / Math.max(Math.max(...img0), 1.);
    const MAX_VAL_INV = 1. / Math.max(...img0, 1.);
    const img = img0.map(e => (e + 0.1) * MAX_VAL_INV);
    //console.log(img);	
    //const input = new onnx.Tensor(img, "float32", [1, 4096]);
    //const output = (await onnxSess.run([input])).values().next().value.data;
    //console.log(output);
    const tensorX = tf.tensor(img, [1, 4096]);
    const output = await (model.predict(tensorX)).data();
    process(output);
};

const INV_BYTE = 0.00392156862745098; // 1/255

predictionMode.addEventListener('change', evtCallback);

const getInterpolationFlag = () => {
    const interpMap = {
        nearest: cv.INTER_NEAREST,
        linear: cv.INTER_LINEAR,
        area: cv.INTER_AREA,
        cubic: cv.INTER_CUBIC,
        lanczos4: cv.INTER_LANCZOS4
    };
    return interpMap[interpolationType.value] ?? cv.INTER_LINEAR;
};

const process = async (predOffsets) => {
    if (!imgElement.complete || !imgElement.src || busy) return;
    busy = true;
    try {
        let k = +offset.value;
        if (predOffsets) k = 0;
        //const k = offsetVal || ;
        //console.log(k);
        const INTER_FLAG = getInterpolationFlag();

        let mat = cv.imread(imgElement);
        let dst = new cv.Mat();
        let dst2 = new cv.Mat();
        const SIZE = maps[k].size;
        let mapX = maps[k].map_x; //.map(e=>e*SIZE*4);
        let mapY = maps[k].map_y; //.map(e=>e*SIZE*4);

        let offsetsX;
        let offsetsY;

        let map_x = cv.matFromArray(SIZE, SIZE, cv.CV_32F, mapX.map(e => e * imgElement.width));
        let map_y = cv.matFromArray(SIZE, SIZE, cv.CV_32F, mapY.map(e => e * imgElement.height));
        cv.resize(map_x, map_x, {
            width: imgElement.width,
            height: imgElement.height
        }, INTER_FLAG);
        cv.resize(map_y, map_y, {
            width: imgElement.width,
            height: imgElement.height
        }, INTER_FLAG);

        if (!k) {
            const POWER = (+power.value) / 2;
            offsetsX = cv.matFromArray(SIZE, SIZE, cv.CV_32F, predOffsets.slice(0, 4096).map(e => e * imgElement.width * POWER));
            offsetsY = cv.matFromArray(SIZE, SIZE, cv.CV_32F, predOffsets.slice(4096).map(e => e * imgElement.height * POWER));
            mapX = mapX.map((e, i) => e + predOffsets[i] * POWER);
            mapY = mapY.map((e, i) => e + predOffsets[4096 + i] * POWER);
            cv.resize(offsetsX, offsetsX, {
                width: imgElement.width,
                height: imgElement.height
            }, INTER_FLAG);
            cv.resize(offsetsY, offsetsY, {
                width: imgElement.width,
                height: imgElement.height
            }, INTER_FLAG);
            cv.subtract(map_x, offsetsX, map_x);
            cv.subtract(map_y, offsetsY, map_y);
        }
        //let map_x = cv.matFromArray(SIZE, SIZE, cv.CV_32F, mapX.map(e=>e*SIZE*4));
        //let map_y = cv.matFromArray(SIZE, SIZE, cv.CV_32F, mapY.map(e=>e*SIZE*4));

        //cv.resize(map_x, map_x, {width: SIZE*4, height: SIZE*4}, cv.INTER_CUBIC);
        //cv.resize(map_y, map_y, {width: SIZE*4, height: SIZE*4}, cv.INTER_CUBIC); 
        /*if (!k) {
		  //cv.add(map_x, offsetsX, map_x);
		  cv.subtract(map_x, offsetsX, map_x);
		  //cv.add(map_y, offsetsY, map_y);
		  cv.subtract(map_y, offsetsY, map_y);
	   }*/
        //cv.resize(mat, dst, {width: SIZE*4, height: SIZE*4}, cv.INTER_CUBIC);
        cv.resize(mat, dst, {
            width: imgElement.width,
            height: imgElement.height
        }, INTER_FLAG);
        //cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY);
        if (remapFlag.checked) {
            cv.remap(dst, dst2, map_x, map_y, INTER_FLAG);
            cv.imshow('outputCanvas', dst2);
        } else {
            cv.imshow('outputCanvas', dst);
        }
        mat.delete();
        dst.delete();
        dst2.delete();
        map_x.delete();
        map_y.delete();
        generateSvgGrid({
            size: SIZE,
            map_x: mapX,
            map_y: mapY
        });
    } finally {
        busy = false;
    };
}


const opencvIsReady = async () => {
    for (let i = 10; i > 0; i--) {
        try {
            cv;
        } catch (e) {
            console.log(e);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    document.getElementById('status').textContent = 'OpenCV.js (WebAssembly) is ready.';
    evtCallback();
};

imgElement.onload = opencvIsReady;

const base64toBlob = (base64Data, msg, contentType) => {
    console.time(msg);
    contentType = contentType || '';
    const sliceSize = 1024;
    const byteCharacters = atob(base64Data);
    const bytesLength = byteCharacters.length;
    const slicesCount = Math.ceil(bytesLength / sliceSize);
    const byteArrays = new Array(slicesCount);

    for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
        const begin = sliceIndex * sliceSize;
        const end = Math.min(begin + sliceSize, bytesLength);

        const bytes = new Array(end - begin);
        for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
            bytes[i] = byteCharacters[offset].charCodeAt(0);
        }
        byteArrays[sliceIndex] = new Uint8Array(bytes);
    }
    console.timeEnd(msg);
    return new Blob(byteArrays, {
        type: contentType
    });
};


var Module = {
    //wasmBinaryFile: 'https://huningxin.github.io/opencv.js/build/wasm/opencv_js.wasm',//URL.createObjectURL(base64toBlob(wasmFile, 'wasmFile')),
    wasmBinaryFile: 'opencv_js.wasm',
    _main: opencvIsReady
};

let modelUrl;
const get_model = () => {
    if (!modelUrl)
        modelUrl = URL.createObjectURL(base64toBlob(modelFile, 'modelFile'));
    return modelUrl;
};

let onnxSess;
var busy = false; // = true;
const testRun = async () => {
    onnxSess = new onnx.InferenceSession();
    await onnxSess.loadModel(get_model());
    const img = new Float32Array(64 * 64);
    img.fill(255);
    console.time('ONNXpredict');
    var output;
    for (let i = 0; i < 100; i++) {
        const input = new onnx.Tensor(img, "float32", [1, 4096]);
        output = (await onnxSess.run([input])).values().next().value.data; //get("output").data;
    };
    console.timeEnd('ONNXpredict');
    console.log(output);
    busy = false;
};

//testRun();

const generateSvgGrid = async (mapa) => {
    const existingSvgs = document.getElementsByClassName('paint')[0].getElementsByTagName('svg');
    if (existingSvgs.length) existingSvgs[0].remove();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const svgNS = svg.namespaceURI;
    const SIZE = (mapa.size > 64) ? 384 : 256;
    svg.setAttribute('width', SIZE);
    svg.setAttribute('height', SIZE);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', '#95B3D7');
    svg.setAttribute('stroke-width', (mapa.size > 64) ? '.5' : '1');
    svg.style.display = 'inline-block';

    //const mapa = maps[1];
    for (let i = 0; i < mapa.size; i++) {
        const hline = document.createElementNS(svgNS, 'polyline');
        const x_coords = mapa.map_x.slice(mapa.size * i, mapa.size * (i + 1));
        const y_coords = mapa.map_y.slice(mapa.size * i, mapa.size * (i + 1));
        const coords = x_coords.map((e, i) => [Number(e * SIZE).toFixed(1),
            Number(y_coords[i] * SIZE).toFixed(1)
        ]).join(' ');
        hline.setAttribute('points', coords);
        svg.appendChild(hline);
        const vline = document.createElementNS(svgNS, 'polyline');
        const x_coords2 = mapa.map_x.filter((e, ind) => (ind + i) % mapa.size === 0); //mapa.size*i, mapa.size*(i+1));
        const y_coords2 = mapa.map_y.filter((e, ind) => (ind + i) % mapa.size === 0); //.slice(mapa.size*i, mapa.size*(i+1));
        const coords2 = x_coords2.map((e, i) => [Number(e * SIZE).toFixed(1),
            Number(y_coords2[i] * SIZE).toFixed(1)
        ]).join(' ');
        vline.setAttribute('points', coords2);
        svg.appendChild(vline);
    }
    for (let i = 0; i < mapa.size; i++) {

    }
    paintCanvas.after(svg);
};