export const getRectCorners = (pixelCrop) => {
    const left = Math.round(pixelCrop.x);
    const top = Math.round(pixelCrop.y);
    const right = Math.round(pixelCrop.x + pixelCrop.width);
    const bottom = Math.round(pixelCrop.y + pixelCrop.height);

    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
    ];
};
