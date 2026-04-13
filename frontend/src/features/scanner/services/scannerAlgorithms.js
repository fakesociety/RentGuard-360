/**
 * ============================================
 *  scannerAlgorithms Service
 *  Heavy pixel-processing algorithms for scanner pipeline
 * ============================================
 *
 * STRUCTURE:
 * - Geometric correction (homography + perspective warp)
 * - Local-statistics enhancement (adaptive smart scan)
 * - Edge sharpening and grayscale normalization
 *
 * RESPONSIBILITY:
 * - Performs compute-intensive image math on pixel buffers.
 * - Stays independent from browser orchestration concerns (Image/Blob/Canvas lifecycle).
 *
 * DEPENDENCIES:
 * - Typed arrays and pure math helpers (internal to this file)
 * ============================================
 */
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const solveLinearSystem = (matrix, vector) => {
    const n = vector.length;
    const a = matrix.map((row, i) => [...row, vector[i]]);

    // Gaussian elimination with partial pivoting for better numerical stability.
    for (let col = 0; col < n; col += 1) {
        let pivot = col;
        for (let row = col + 1; row < n; row += 1) {
            if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
                pivot = row;
            }
        }

        if (Math.abs(a[pivot][col]) < 1e-10) {
            throw new Error('Unable to solve homography matrix.');
        }

        if (pivot !== col) {
            [a[col], a[pivot]] = [a[pivot], a[col]];
        }

        const pivotValue = a[col][col];
        for (let k = col; k <= n; k += 1) {
            a[col][k] /= pivotValue;
        }

        for (let row = 0; row < n; row += 1) {
            if (row === col) continue;
            const factor = a[row][col];
            for (let k = col; k <= n; k += 1) {
                a[row][k] -= factor * a[col][k];
            }
        }
    }

    return a.map((row) => row[n]);
};

const buildHomography = (srcPoints, dstPoints) => {
    const matrix = [];
    const vector = [];

    for (let i = 0; i < 4; i += 1) {
        const { x, y } = srcPoints[i];
        const { x: u, y: v } = dstPoints[i];

        matrix.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
        vector.push(u);
        matrix.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
        vector.push(v);
    }

    const solution = solveLinearSystem(matrix, vector);
    return [
        solution[0], solution[1], solution[2],
        solution[3], solution[4], solution[5],
        solution[6], solution[7], 1,
    ];
};

const projectPoint = (h, x, y) => {
    const denom = (h[6] * x) + (h[7] * y) + h[8];
    if (Math.abs(denom) < 1e-10) {
        return { x: -1, y: -1 };
    }

    return {
        x: ((h[0] * x) + (h[1] * y) + h[2]) / denom,
        y: ((h[3] * x) + (h[4] * y) + h[5]) / denom,
    };
};

const bilinearSample = (rgba, width, height, x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const x1 = Math.min(width - 1, x0 + 1);
    const y1 = Math.min(height - 1, y0 + 1);

    const dx = x - x0;
    const dy = y - y0;

    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;

    const out = [0, 0, 0, 255];
    for (let c = 0; c < 3; c += 1) {
        const top = (rgba[idx00 + c] * (1 - dx)) + (rgba[idx10 + c] * dx);
        const bottom = (rgba[idx01 + c] * (1 - dx)) + (rgba[idx11 + c] * dx);
        out[c] = Math.round((top * (1 - dy)) + (bottom * dy));
    }

    return out;
};

const buildIntegralImage = (values, width, height) => {
    const stride = width + 1;
    const integral = new Float32Array((width + 1) * (height + 1));

    for (let y = 1; y <= height; y += 1) {
        let rowSum = 0;
        for (let x = 1; x <= width; x += 1) {
            rowSum += values[((y - 1) * width) + (x - 1)];
            integral[(y * stride) + x] = integral[((y - 1) * stride) + x] + rowSum;
        }
    }

    return { integral, stride };
};

const sumRegion = (integral, stride, x0, y0, x1, y1) => {
    const a = integral[(y0 * stride) + x0];
    const b = integral[(y0 * stride) + x1];
    const c = integral[(y1 * stride) + x0];
    const d = integral[(y1 * stride) + x1];
    return d - b - c + a;
};

export const perspectiveWarp = (sourceData, srcWidth, srcHeight, srcQuad) => {
    // Estimate output page dimensions from opposite edges so skewed captures become rectangular pages.
    const topWidth = distance(srcQuad[0], srcQuad[1]);
    const bottomWidth = distance(srcQuad[3], srcQuad[2]);
    const leftHeight = distance(srcQuad[0], srcQuad[3]);
    const rightHeight = distance(srcQuad[1], srcQuad[2]);

    const outWidth = Math.max(1, Math.round((topWidth + bottomWidth) * 0.5));
    const outHeight = Math.max(1, Math.round((leftHeight + rightHeight) * 0.5));

    const dstQuad = [
        { x: 0, y: 0 },
        { x: outWidth - 1, y: 0 },
        { x: outWidth - 1, y: outHeight - 1 },
        { x: 0, y: outHeight - 1 },
    ];

    // Build inverse mapping (destination -> source) to avoid holes in the output image.
    const h = buildHomography(dstQuad, srcQuad);

    const out = new Uint8ClampedArray(outWidth * outHeight * 4);
    for (let y = 0; y < outHeight; y += 1) {
        for (let x = 0; x < outWidth; x += 1) {
            const srcPt = projectPoint(h, x, y);
            const outIdx = (y * outWidth + x) * 4;

            if (
                srcPt.x < 0 || srcPt.y < 0 ||
                srcPt.x > (srcWidth - 1) || srcPt.y > (srcHeight - 1)
            ) {
                out[outIdx] = 255;
                out[outIdx + 1] = 255;
                out[outIdx + 2] = 255;
                out[outIdx + 3] = 255;
                continue;
            }

            const sampled = bilinearSample(sourceData, srcWidth, srcHeight, srcPt.x, srcPt.y);
            out[outIdx] = sampled[0];
            out[outIdx + 1] = sampled[1];
            out[outIdx + 2] = sampled[2];
            out[outIdx + 3] = 255;
        }
    }

    return {
        width: outWidth,
        height: outHeight,
        data: out,
    };
};

export const applyAdaptiveSmartScan = (rgba, width, height) => {
    const pixelCount = width * height;
    const luma = new Float32Array(pixelCount);

    // Convert RGB to luminance once; downstream processing operates on grayscale intensities.
    for (let i = 0, p = 0; i < pixelCount; i += 1, p += 4) {
        luma[i] = (rgba[p] * 0.299) + (rgba[p + 1] * 0.587) + (rgba[p + 2] * 0.114);
    }

    // 3x3 weighted denoise pass reduces sensor noise before local contrast estimation.
    const denoised = new Float32Array(pixelCount);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            let sum = 0;
            let weight = 0;

            for (let oy = -1; oy <= 1; oy += 1) {
                const ny = y + oy;
                if (ny < 0 || ny >= height) continue;
                for (let ox = -1; ox <= 1; ox += 1) {
                    const nx = x + ox;
                    if (nx < 0 || nx >= width) continue;
                    const w = (ox === 0 && oy === 0) ? 6 : (ox === 0 || oy === 0 ? 1 : 0);
                    sum += luma[(ny * width) + nx] * w;
                    weight += w;
                }
            }

            denoised[(y * width) + x] = sum / Math.max(1, weight);
        }
    }

    const squares = new Float32Array(pixelCount);
    for (let i = 0; i < pixelCount; i += 1) {
        squares[i] = denoised[i] * denoised[i];
    }

    // Integral images make local mean/variance queries O(1) per pixel.
    const { integral: sumIntegral, stride } = buildIntegralImage(denoised, width, height);
    const { integral: sqIntegral } = buildIntegralImage(squares, width, height);

    const radius = clamp(Math.round(Math.min(width, height) * 0.035), 10, 32);
    const targetPaper = 240;
    const detailGain = 0.5;
    const localContrast = 1.12;

    const normalized = new Float32Array(pixelCount);

    // Adaptive illumination correction + local contrast enhancement for scanned-paper look.
    for (let y = 0; y < height; y += 1) {
        const y0 = Math.max(0, y - radius);
        const y1 = Math.min(height, y + radius + 1);

        for (let x = 0; x < width; x += 1) {
            const x0 = Math.max(0, x - radius);
            const x1 = Math.min(width, x + radius + 1);
            const area = Math.max(1, (x1 - x0) * (y1 - y0));

            const localSum = sumRegion(sumIntegral, stride, x0, y0, x1, y1);
            const localMean = localSum / area;
            const localSqSum = sumRegion(sqIntegral, stride, x0, y0, x1, y1);
            const localVariance = Math.max(0, (localSqSum / area) - (localMean * localMean));
            const localStd = Math.sqrt(localVariance);

            const idx = (y * width) + x;
            const base = denoised[idx];

            const shadowCorrected = base + (targetPaper - localMean);
            const detail = (base - localMean) * (1 + (Math.min(1, localStd / 48) * detailGain));
            const contrasted = ((shadowCorrected + detail) - 128) * localContrast + 128;
            normalized[idx] = clamp(contrasted, 0, 255);
        }
    }

    // Mild unsharp mask to improve text edge crispness without harsh binary thresholding.
    const amount = 0.4;
    const out = new Uint8ClampedArray(pixelCount * 4);

    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            let blurSum = 0;
            let blurWeight = 0;

            for (let oy = -1; oy <= 1; oy += 1) {
                const ny = y + oy;
                if (ny < 0 || ny >= height) continue;
                for (let ox = -1; ox <= 1; ox += 1) {
                    const nx = x + ox;
                    if (nx < 0 || nx >= width) continue;
                    const w = (ox === 0 && oy === 0) ? 4 : (ox === 0 || oy === 0 ? 2 : 1);
                    blurSum += normalized[(ny * width) + nx] * w;
                    blurWeight += w;
                }
            }

            const idx = (y * width) + x;
            const base = normalized[idx];
            const blurred = blurSum / Math.max(1, blurWeight);
            const sharpened = clamp(base + ((base - blurred) * amount), 0, 255);
            const finalGray = Math.round(sharpened);

            const outIdx = idx * 4;
            out[outIdx] = finalGray;
            out[outIdx + 1] = finalGray;
            out[outIdx + 2] = finalGray;
            out[outIdx + 3] = 255;
        }
    }

    return out;
};