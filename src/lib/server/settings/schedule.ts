let schedule: Array<Array<boolean>> = new Array(7).fill(0).map(() => Array(24).fill(true));

function verifySchedule(arr: Array<Array<boolean>>): boolean {
    return arr.length == 7 && arr.every(subarr => subarr.length == 24);
}

/**
 * Set schedule, verifying if it matches the 7 by 24 format
 * @param {Array<Array<boolean>>} arr new schedule
 * @returns {boolean} true if the operation was successful, false otherwise
 */
export function setSchedule(arr: Array<Array<boolean>>): boolean {
    if (!verifySchedule(arr)) return false;
    schedule = arr;
    return true;
}

export function getSchedule() {
    return schedule;
}