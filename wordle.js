const statusMsg = document.getElementById("status");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const gdmOptions = {
    video: true,
    audio: false
};

var wordList;
var wordFreq;
var mainInterval;
var capturing = false;

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
        })
        .catch(err => console.log(err));
}

function onCaptureVideo() {
    if(capturing) {
        clearTimeout(mainInterval);
        updateStatus("Paused.");
    } else {
        mainInterval = setTimeout(function run() {
            captureVideo();
            mainInterval = setTimeout(run);
        }, 1000);
    }

    capturing = !capturing;

}

function captureVideo() {
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, -465, -585);
    const data = filterBlack(ctx);

    const result = OCRAD(data);
    //console.log(result);

    const text = filterText(result);

    const letterList = letterArray(text, ctx);
    //console.log(letterList);

    const filteredWordList = filterWordList(letterList, wordList);
    filteredWordList.sort((a,b) => wordFreq[b] - wordFreq[a]);

    updateStatus(printList(filteredWordList, 3));
    //console.log(filteredWordList);
}

function filterBlack(ctx) {
    var imgData = ctx.getImageData(0, 0, 390, 475);
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

function filterText(exp) {
    //filter letters
    exp = exp.replace("|", "I");

    //filter to words
    exp = exp.toLowerCase().replace(/[^a-z]+/g, "");

    //get rid of cursor
    exp = exp.substring(0, exp.length - 1);
    return exp;
}

function letterArray(string, ctx) {
    var imgData = ctx.getImageData(0, 0, 390, 475);
    var data = imgData.data;
    var letterList = { "at": new Set(), "in": new Set(), "notin": new Set()};

    const px = 20;
    const dx = 75;
    const py = 30;
    const dy = 75;
    for (let index = 0; index < string.length; index++) {
        const dataIndex = (px + (index % 5) * dx) + 390 * (py + parseInt(index / 5) * dy);
        const red = data[dataIndex * 4];
        data[dataIndex * 4] = 0;
        data[dataIndex * 4 + 1] = 0;
        data[dataIndex * 4 + 2] = 0;

        if (red < 50) {
            letterList.at.add([string.charAt(index), index % 5]);
        } else if (red > 200) {
            letterList.in.add([string.charAt(index), index % 5]);
        } else {
            letterList.notin.add(string.charAt(index));
        }
    }
    ctx.putImageData(imgData, 0, 0);
    letterList.at = Array.from(letterList.at);
    const foundLetters = letterList.at.map((val, ind) => val[0]);

    letterList.in = Array.from(letterList.in).filter(elem => !foundLetters.includes(elem[0]));
    const inLetters = letterList.in.map((val, ind) => val[0]);

    letterList.notin = Array.from(letterList.notin).filter(elem => !(foundLetters.includes(elem) || inLetters.includes(elem)));
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

    if(stuff.length < num) {
        num = stuff.length;
    }

    for (let index = 0; index < num - 1; index++) {
        outStr += stuff[index] + ", ";
    }

    return outStr + stuff.slice(-1)[0];
}