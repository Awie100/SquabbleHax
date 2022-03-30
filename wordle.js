const statusMsg = document.getElementById("status");
const video = document.getElementById("video");

const canvas = document.getElementById("canvas");
const context = canvas.getContext('2d');

const gdmOptions = {
    video: true,
    audio: false
};

var wordList;
var wordFreq;
var mainInterval;
var guessing = false;


var vPos = {
    x: 465,
    y: 585
}

var px = 0;
var dx = 0;

fetch("word_freq.json").then(response => response.json()).then(json => {
    wordFreq = json;
}).catch(err => console.log(err));

fetch("allowed_words.txt").then(response => response.text()).then(text => {
    wordList = text.split("\n");
}).catch(err => console.log(err));

function startCapture() {
    navigator.mediaDevices.getDisplayMedia(gdmOptions)
        .then((media) => {
            video.srcObject = media;
            updateStatus("Ready To Go!")

            mainInterval = setTimeout(function run() {
                captureVideo();

                mainInterval = setTimeout(run);
            });
        })
        .catch(err => console.log(err));
}

function resetCaptureBox() {
    guessing = false;
}

function captureVideo() {
    if (guessing) {
        drawGuessing();
    } else {
        setBoundingBox();
    }
}

function setBoundingBox() {
    updateStatus("Once in a Game, Click on the first box (highlighted) to begin.");
    canvas.width = window.innerWidth * (3 / 4);
    canvas.height = (canvas.width / video.videoWidth) * video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
}

canvas.addEventListener('mousedown', mouseDown);

function mouseDown(evt) {
    if (!guessing) {
        let cPos = getMousePosCanvas(evt);
        cPos = canvasToVideoPos(cPos);

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        cPos.x = parseInt(cPos.x);
        cPos.y = parseInt(cPos.y);

        //console.log(cPos);

        const filterCanvas = filterBlack();
        const box = getFirstBox(filterCanvas.data, cPos);
        //console.log(box);

        canvas.height = box.dims.x * 7.5;
        canvas.width = box.dims.y * 6.2;

        vPos.x = parseInt(box.pos.x - box.dims.x / 5);
        vPos.y = parseInt(box.pos.y - box.dims.y / 5);

        px = parseInt(box.dims.x * 0.4);
        dx = parseInt(box.dims.x * 1.22);

        guessing = true;
    }
}

function getMousePosCanvas(evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) / rect.width * canvas.width,
        y: (evt.clientY - rect.top) / rect.height * canvas.height
    }
}

function canvasToVideoPos(pos) {
    return {
        x: pos.x / canvas.width * video.videoWidth,
        y: pos.y / canvas.height * video.videoHeight
    }
}

function drawGuessing() {
    context.drawImage(video, -vPos.x, -vPos.y);
    const data = filterBlack();

    const result = OCRAD(data);
    //console.log(result);

    const text = filterText(result);

    const letterList = letterArray(text, context);
    //console.log(letterList);

    const filteredWordList = filterWordList(letterList, wordList);
    filteredWordList.sort((a, b) => wordFreq[b] - wordFreq[a]);

    updateStatus(printList(filteredWordList, 3));
    //console.log(filteredWordList);
}

function filterBlack() {
    var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    //data is an array it cantais rgb value data[0],data[1],data[2] respectively
    var data = imgData.data;
    //Searchin each pixel and replacing it with constra
    for (var i = 0; i < data.length; i += 4) {
        var constra = data[i] + data[i + 1] + data[i + 2];
        if (constra < 50) {
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        } else {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
        }
    }
    // return with original image on canvas
    return imgData;
}

function getFirstBox(pxData, pos) {
    var bounds = {
        pos: {
            x: 0,
            y: 0
        },
        dims: {
            x: 0,
            y: 0
        }
    }

    //top
    for (let index = pos.y; index > 0; index--) {
        const dataIndex = (pos.x) + canvas.width * (index);
        if(pxData[dataIndex * 4] == 0) {
            bounds.pos.y = index;
            break;
        }
    }

    //botton
    for (let index = pos.y; index < canvas.height; index++) {
        const dataIndex = (pos.x) + canvas.width * (index);
        if(pxData[dataIndex * 4] == 0) {
            bounds.dims.y = index - bounds.pos.y;
            break;
        }
    }

    //left
    for (let index = pos.x; index > 0; index--) {
        const dataIndex = (index) + canvas.width * (pos.y);
        if(pxData[dataIndex * 4] == 0) {
            bounds.pos.x = index;
            break;
        }
    }

    //right
    for (let index = pos.x; index < canvas.width; index++) {
        const dataIndex = (index) + canvas.width * (pos.y);
        if(pxData[dataIndex * 4] == 0) {
            bounds.dims.x = index - bounds.pos.x;
            break;
        }
    }

    return bounds
}

function filterText(exp) {
    //filter letters
    exp = exp.replace("|", "I");

    //filter to words
    exp = exp.toLowerCase().replace(/[^a-z]+/g, "");

    //get rid of cursor
    exp = exp.substring(0, exp.length - 1);
    return exp;
}

function letterArray(string) {
    var imgData = context.getImageData(0, 0, canvas.width, canvas.height);
    var data = imgData.data;



    var letterList = { "at": new Set(), "in": new Set(), "notin": new Set() };

    for (let index = 0; index < string.length; index++) {
        const dataIndex = (px + (index % 5) * dx) + canvas.width * (px + parseInt(index / 5) * dx);
        const red = data[dataIndex * 4];
        data[dataIndex * 4] = 255;
        data[dataIndex * 4 + 1] = 255;
        data[dataIndex * 4 + 2] = 255;

        if (red < 50) {
            letterList.at.add([string.charAt(index), index % 5]);
        } else if (red > 200) {
            letterList.in.add([string.charAt(index), index % 5]);
        } else {
            letterList.notin.add(string.charAt(index));
        }
    }
    letterList.at = Array.from(letterList.at);
    const foundLetters = letterList.at.map((val, ind) => val[0]);

    letterList.in = Array.from(letterList.in).filter(elem => !foundLetters.includes(elem[0]));
    const inLetters = letterList.in.map((val, ind) => val[0]);

    letterList.notin = Array.from(letterList.notin).filter(elem => !(foundLetters.includes(elem) || inLetters.includes(elem)));
    
    context.putImageData(imgData, 0, 0);
    return letterList;
}


function filterWordList(letterList, wordsList) {
    for (const elem of letterList.at) {
        wordsList = wordsList.filter(word => word.charAt(elem[1]) == elem[0]);
    }

    for (const elem of letterList.in) {
        wordsList = wordsList.filter(word => word.includes(elem[0]) && (word.charAt(elem[1]) != elem[0]));
    }

    for (const elem of letterList.notin) {
        wordsList = wordsList.filter(word => !word.includes(elem));
    }

    return wordsList;
}


function updateStatus(msg) {
    statusMsg.innerHTML = msg;
}

function printList(stuff, num) {
    var outStr = "";

    if (stuff.length < num) {
        num = stuff.length;
    }

    for (let index = 0; index < num - 1; index++) {
        outStr += stuff[index] + ", ";
    }

    return outStr + stuff.slice(-1)[0];
}