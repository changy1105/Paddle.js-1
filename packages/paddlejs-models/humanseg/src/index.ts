/**
 * @file humanseg model
 */

import { Runner } from '@paddlejs/paddlejs-core';
import '@paddlejs/paddlejs-backend-webgl';
import cv from '@paddlejs-mediapipe/opencv/library/opencv_blur';

let runner = null as Runner;
let inputImage = null;
const WIDTH = 192;
const HEIGHT = 192;
const SCALE = 192;

export async function load() {
    const path = 'https://paddlejs.cdn.bcebos.com/models/humanseg';

    runner = new Runner({
        modelPath: path,
        fileCount: 1,
        feedShape: {
            fw: WIDTH,
            fh: HEIGHT
        },
        fill: '#000',
        targetSize: {
            height: HEIGHT,
            width: WIDTH
        },
        mean: [122.675, 116.669, 104.008],
        std: [1.0, 1.0, 1.0],
        scale: SCALE,
        bgr: true
    });
    await runner.init();
}

export async function getGrayValue(image: HTMLImageElement) {
    inputImage = image;
    const res = await runner.predict(image);
    const gray_values = res.slice(WIDTH * HEIGHT);
    return {
        width: WIDTH,
        height: HEIGHT,
        data: gray_values
    };
}

/**
 * draw human seg
 * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
 * @param {Array} gray_values gray_values of the input image
 */
export function drawHumanSeg(canvas: HTMLCanvasElement, gray_values: number[]) {
    const {
        naturalWidth,
        naturalHeight
    } = inputImage;
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d') as CanvasRenderingContext2D;
    tempCanvas.width = WIDTH;
    tempCanvas.height = HEIGHT;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const tempData = tempContext.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        tempData.data[i * 4] = 255;
        tempData.data[i * 4 + 1] = 255;
        tempData.data[i * 4 + 2] = 255;
        tempData.data[i * 4 + 3] = gray_values[i] * 255;
    }
    // threshold mask
    thresholdMask(tempData, 0.4, 0.8);
    // blur border
    tempContext.putImageData(tempData, 0, 0);
    const out = blurBorder(tempCanvas);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        tempData.data[i * 4 + 3] = out.data[i * 4 + 3];
    }
    tempContext.putImageData(tempData, 0, 0);
    // stretch origin canvas to image size
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(tempCanvas, 0, 0, naturalWidth, naturalHeight);
    const tempScaleData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);

    tempCanvas.width = naturalWidth;
    tempCanvas.height = naturalHeight;
    tempContext.drawImage(inputImage, 0, 0);
    const originImageData = tempContext.getImageData(0, 0, naturalWidth, naturalHeight);
    for (let i = 0; i < naturalHeight * naturalWidth; i++) {
        tempScaleData.data[i * 4] = originImageData.data[i * 4];
        tempScaleData.data[i * 4 + 1] = originImageData.data[i * 4 + 1];
        tempScaleData.data[i * 4 + 2] = originImageData.data[i * 4 + 2];
    }
    tempContext.clearRect(0, 0, naturalWidth, naturalHeight);
    ctx.putImageData(tempScaleData, 0, 0);
}

/**
 * draw mask without human
 * @param {HTMLCanvasElement} canvas the dest canvas draws the pixels
 * @param {Array} gray_values gray_values of the input image
 * @param {Object} dark use dark mode
 */
export function drawMask(canvas: HTMLCanvasElement, gray_values: number[], dark?: boolean) {
    const {
        naturalWidth,
        naturalHeight
    } = inputImage;
    const tempCanvas = document.createElement('canvas') as HTMLCanvasElement;
    const tempContext = tempCanvas.getContext('2d') as CanvasRenderingContext2D;
    tempCanvas.width = WIDTH;
    tempCanvas.height = HEIGHT;
    canvas.width = naturalWidth;
    canvas.height = naturalHeight;
    const tempData = tempContext.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        tempData.data[i * 4] = 255;
        tempData.data[i * 4 + 1] = 255;
        tempData.data[i * 4 + 2] = 255;
        tempData.data[i * 4 + 3] = 255 - gray_values[i] * 255;
    }

    // threshold mask
    thresholdMask(tempData, 0.4, 0.8);
    // blur border
    tempContext.putImageData(tempData, 0, 0);
    const out = blurBorder(tempCanvas);
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
        tempData.data[i * 4 + 3] = out.data[i * 4 + 3];
    }
    tempContext.putImageData(tempData, 0, 0);
    // stretch origin canvas to image size
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.drawImage(tempCanvas, 0, 0, naturalWidth, naturalHeight);
    const tempScaleData = ctx.getImageData(0, 0, naturalWidth, naturalHeight);

    tempCanvas.width = naturalWidth;
    tempCanvas.height = naturalHeight;
    tempContext.drawImage(inputImage, 0, 0);
    const originImageData = tempContext.getImageData(0, 0, naturalWidth, naturalHeight);
    for (let i = 0; i < naturalHeight * naturalWidth; i++) {
        tempScaleData.data[i * 4] = dark ? 0 : originImageData.data[i * 4];
        tempScaleData.data[i * 4 + 1] = dark ? 0 : originImageData.data[i * 4 + 1];
        tempScaleData.data[i * 4 + 2] = dark ? 0 : originImageData.data[i * 4 + 2];
    }
    tempContext.clearRect(0, 0, naturalWidth, naturalHeight);
    ctx.putImageData(tempScaleData, 0, 0);
}

function thresholdMask(img, threshBg, threshFg) {
    for (let i = 0; i < img.data.length; i++) {
        const tmp = (img.data[i] - threshBg * 255.0) / (threshFg - threshBg);
        if (tmp < 0) {
            img.data[i] = 0;
        }
        else if (tmp > 255) {
            img.data[i] = 255;
        }
        else {
            img.data[i] = tmp;
        }
    }
}

function blurBorder(canvas: HTMLCanvasElement) {
    const logit = cv.imread(canvas);
    const dst = new cv.Mat();
    const ksize = new cv.Size(5, 5);
    const anchor = new cv.Point(-1, -1);
    cv.blur(logit, dst, ksize, anchor, cv.BORDER_DEFAULT);
    return dst;
}