import sharp from 'sharp';

let mask: Buffer;

/**
 * Set filter polygon
 * @param {string} svgString complete svg string
 * @returns {Promise<boolean>} true if the operation was successful, false otherwise
 */
export async function setPolygon(svgString: string): Promise<boolean> {
    try {
        mask = await sharp(Buffer.from(svgString)).toBuffer();
        return true;
    } catch (e) {
        return false;
    }
}

export function getPolygon() {
    return mask;
}