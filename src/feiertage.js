const germanTranslations = {
    NEUJAHRSTAG: 'Neujahrstag',
    HEILIGEDREIKOENIGE: 'Heilige Drei Könige',
    KARFREITAG: 'Karfreitag',
    OSTERSONNTAG: 'Ostersonntag',
    OSTERMONTAG: 'Ostermontag',
    TAG_DER_ARBEIT: 'Tag der Arbeit',
    CHRISTIHIMMELFAHRT: 'Christi Himmelfahrt',
    PFINGSTSONNTAG: 'Pfingstsonntag',
    PFINGSTMONTAG: 'Pfingstmontag',
    FRONLEICHNAM: 'Fronleichnam',
    MARIAHIMMELFAHRT: 'Mariä Himmelfahrt',
    DEUTSCHEEINHEIT: 'Tag der Deutschen Einheit',
    REFORMATIONSTAG: 'Reformationstag',
    ALLERHEILIGEN: 'Allerheiligen',
    BUBETAG: 'Buß- und Bettag',
    ERSTERWEIHNACHTSFEIERTAG: '1. Weihnachtstag',
    ZWEITERWEIHNACHTSFEIERTAG: '2. Weihnachtstag',
    WELTKINDERTAG: 'Weltkindertag',
    WELTFRAUENTAG: 'Weltfrauentag',
    AUGSBURGER_FRIEDENSFEST: 'Augsburger Friedensfest'
};

const allHolidays = [
    'NEUJAHRSTAG',
    'HEILIGEDREIKOENIGE',
    'KARFREITAG',
    'OSTERSONNTAG',
    'OSTERMONTAG',
    'TAG_DER_ARBEIT',
    'CHRISTIHIMMELFAHRT',
    'MARIAHIMMELFAHRT',
    'PFINGSTSONNTAG',
    'PFINGSTMONTAG',
    'FRONLEICHNAM',
    'DEUTSCHEEINHEIT',
    'REFORMATIONSTAG',
    'ALLERHEILIGEN',
    'BUBETAG',
    'ERSTERWEIHNACHTSFEIERTAG',
    'ZWEITERWEIHNACHTSFEIERTAG',
    'WELTKINDERTAG',
    'WELTFRAUENTAG',
    'AUGSBURGER_FRIEDENSFEST',
];

const allRegions = [
    'BW',
    'BY',
    'BE',
    'BB',
    'HB',
    'HE',
    'HH',
    'MV',
    'NI',
    'NW',
    'RP',
    'SL',
    'SN',
    'ST',
    'SH',
    'TH',
    'BUND',
    'AUGSBURG',
    'ALL',
];

/*!
 * feiertage.js
 * @repository https://github.com/sfakir/feiertagejs
 * @docs https://github.com/sfakir/feiertagejs/blob/master/docs.md
 *
 * Copyright 2015-2021 Simon Fakir
 * Released under the MIT license
 */
// translations
const defaultLanguage = 'de';
let currentLanguage = defaultLanguage;
const translations = {
    de: germanTranslations,
};
/**
 * adds a translation for the holidays (e.g. english).
 * This also allows to override the German names.
 * Hint: Interpolates German for missing translations
 * @param {string} isoCode of the new language
 * @param {TranslationTable} newTranslation  map of {HolidayType} to translation stringg
 */
function addTranslation(isoCode, newTranslation) {
    const code = isoCode.toLowerCase();
    const defaultTranslation = translations[defaultLanguage];
    let missingFields = false;
    // fill new Translation with default Language
    for (const holiday of allHolidays) {
        if (!newTranslation[holiday]) {
            missingFields = true;
            newTranslation[holiday] = defaultTranslation[holiday];
        }
    }
    if (missingFields) {
        console.warn('[feiertagejs] addTranslation: you did not add all holidays in your translation! Took German as fallback');
    }
    translations[code] = newTranslation;
}
/**
 * Set a language to default language
 * @param {string} isoCode
 */
function setLanguage(isoCode) {
    const code = isoCode.toLowerCase();
    if (!translations[code]) {
        throw new TypeError(`[feiertagejs] tried to set language to ${code} but the translation is missing. Please use addTranslation(isoCode,object) first`);
    }
    currentLanguage = isoCode;
}
/**
 * Get currently set language
 * @returns {string}
 */
function getLanguage() {
    return currentLanguage;
}
// holidays api
/**
 * Checks if a specific date is sunday or holiday.
 * @param date
 * @param region
 * @returns {boolean}
 */
function isSunOrHoliday(date, region) {
    checkRegion(region);
    return date.getDay() === 0 || isHoliday(date, region);
}
/**
 * Check is specific date is holiday.
 * @param date
 * @param {Region} region two character {@link Region} code
 * @returns {boolean}
 */
function isHoliday(date, region) {
    checkRegion(region);
    const year = date.getFullYear();
    const internalDate = toUtcTimestamp(date);
    const holidays = getHolidaysAsUtcTimestamps(year, region);
    return holidays.indexOf(internalDate) !== -1;
}
function getHolidayByDate(date, region = 'ALL') {
    checkRegion(region);
    const holidays = getHolidaysOfYear(date.getFullYear(), region);
    return holidays.find(holiday => holiday.equals(date));
}
// additional runtime checks
/**
 * Checks if the given region is a valid {@link Region}.
 *
 * @param region {@link Region} to check
 * @throws {Error}
 * @private
 */
function checkRegion(region) {
    if (region === null || region === undefined) {
        throw new Error(`Region must not be undefined or null`);
    }
    if (allRegions.indexOf(region) === -1) {
        throw new Error(`Invalid region: ${region}! Must be one of ${allRegions.toString()}`);
    }
}
/**
 * Checks if the given holidayName is a valid {@link HolidayType}.
 * @param holidayName {@link HolidayType} to check
 * @throws {Error}
 * @private
 */
function checkHolidayType(holidayName) {
    if (holidayName === null || holidayName === undefined) {
        throw new TypeError('holidayName must not be null or undefined');
    }
    if (allHolidays.indexOf(holidayName) === -1) {
        throw new Error(`feiertage.js: invalid holiday type "${holidayName}"! Must be one of ${allHolidays.toString()}`);
    }
}
function isSpecificHoliday(date, holidayName, region = 'ALL') {
    checkRegion(region);
    checkHolidayType(holidayName);
    const holidays = getHolidaysOfYear(date.getFullYear(), region);
    const foundHoliday = holidays.find(holiday => holiday.equals(date));
    if (!foundHoliday) {
        return false;
    }
    return foundHoliday.name === holidayName;
}
/**
 * Returns all holidays of a year in a {@link Region}.
 * @param year
 * @param region
 * @returns {Array.<Holiday>}
 */
function getHolidays(year, region) {
    let y;
    if (typeof year === 'string') {
        y = parseInt(year, 10);
    }
    else {
        y = year;
    }
    checkRegion(region);
    return getHolidaysOfYear(y, region);
}
/**
 *
 * @param year
 * @param region
 * @returns {*}
 * @private
 */
function getHolidaysAsUtcTimestamps(year, region) {
    const holidays = getHolidaysOfYear(year, region);
    return holidays.map(holiday => toUtcTimestamp(holiday.date));
}
/**
 *
 * @param year
 * @param region
 * @returns {{objects: Array.<Holiday>, integers}}
 * @private
 */
function getHolidaysOfYear(year, region) {
    const easterDate = getEasterDate(year);
    const karfreitag = addDays(new Date(easterDate.getTime()), -2);
    const ostermontag = addDays(new Date(easterDate.getTime()), 1);
    const christiHimmelfahrt = addDays(new Date(easterDate.getTime()), 39);
    const pfingstsonntag = addDays(new Date(easterDate.getTime()), 49);
    const pfingstmontag = addDays(new Date(easterDate.getTime()), 50);
    const holidays = [
        ...getCommonHolidays(year),
        newHoliday('KARFREITAG', karfreitag),
        newHoliday('OSTERMONTAG', ostermontag),
        newHoliday('CHRISTIHIMMELFAHRT', christiHimmelfahrt),
        newHoliday('PFINGSTMONTAG', pfingstmontag),
    ];
    addHeiligeDreiKoenige(year, region, holidays);
    addEasterAndPfingsten(year, region, easterDate, pfingstsonntag, holidays);
    addFronleichnam(region, easterDate, holidays);
    addMariaeHimmelfahrt(year, region, holidays);
    addReformationstag(year, region, holidays);
    addAllerheiligen(year, region, holidays);
    addBussUndBetttag(year, region, holidays);
    addWeltkindertag(year, region, holidays);
    addWeltfrauenTag(year, region, holidays);
    addRegionalHolidays(year, region, holidays);
    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}
function getCommonHolidays(year) {
    return [
        newHoliday('NEUJAHRSTAG', makeDate(year, 1, 1)),
        newHoliday('TAG_DER_ARBEIT', makeDate(year, 5, 1)),
        newHoliday('DEUTSCHEEINHEIT', makeDate(year, 10, 3)),
        newHoliday('ERSTERWEIHNACHTSFEIERTAG', makeDate(year, 12, 25)),
        newHoliday('ZWEITERWEIHNACHTSFEIERTAG', makeDate(year, 12, 26)),
    ];
}
function addRegionalHolidays(year, region, feiertageObjects) {
    if (region === 'AUGSBURG') {
        feiertageObjects.push(newHoliday('AUGSBURGER_FRIEDENSFEST', makeDate(year, 8, 8)));
    }
}
function addHeiligeDreiKoenige(year, region, feiertageObjects) {
    if (region === 'BW' ||
        region === 'BY' ||
        region === 'AUGSBURG' ||
        region === 'ST' ||
        region === 'ALL') {
        feiertageObjects.push(newHoliday('HEILIGEDREIKOENIGE', makeDate(year, 1, 6)));
    }
}
function addEasterAndPfingsten(year, region, easterDate, pfingstsonntag, feiertageObjects) {
    if (region === 'BB' || region === 'ALL') {
        feiertageObjects.push(newHoliday('OSTERSONNTAG', easterDate), newHoliday('PFINGSTSONNTAG', pfingstsonntag));
    }
}
function addFronleichnam(region, easterDate, holidays) {
    if (region === 'BW' ||
        region === 'BY' ||
        region === 'AUGSBURG' ||
        region === 'HE' ||
        region === 'NW' ||
        region === 'RP' ||
        region === 'SL' ||
        region === 'ALL') {
        const fronleichnam = addDays(new Date(easterDate.getTime()), 60);
        holidays.push(newHoliday('FRONLEICHNAM', fronleichnam));
    }
}
function addMariaeHimmelfahrt(year, region, holidays) {
    if (region === 'SL' || region === 'BY' || region === 'AUGSBURG') {
        holidays.push(newHoliday('MARIAHIMMELFAHRT', makeDate(year, 8, 15)));
    }
}
function addReformationstag(year, region, holidays) {
    if (year === 2017 ||
        region === 'NI' ||
        region === 'BB' ||
        region === 'HB' ||
        region === 'HH' ||
        region === 'MV' ||
        region === 'SN' ||
        region === 'ST' ||
        region === 'TH' ||
        region === 'ALL') {
        holidays.push(newHoliday('REFORMATIONSTAG', makeDate(year, 10, 31)));
    }
}
function addAllerheiligen(year, region, holidays) {
    if (region === 'BW' ||
        region === 'BY' ||
        region === 'AUGSBURG' ||
        region === 'NW' ||
        region === 'RP' ||
        region === 'SL' ||
        region === 'ALL') {
        holidays.push(newHoliday('ALLERHEILIGEN', makeDate(year, 11, 1)));
    }
}
function addBussUndBetttag(year, region, holidays) {
    if (region === 'SN' || region === 'ALL') {
        // @todo write test
        const bussbettag = getBussBettag(year);
        holidays.push(newHoliday('BUBETAG', makeDate(bussbettag.getUTCFullYear(), bussbettag.getUTCMonth() + 1, bussbettag.getUTCDate())));
    }
}
function addWeltkindertag(year, region, holidays) {
    if (year >= 2019 && (region === 'TH' || region === 'ALL')) {
        holidays.push(newHoliday('WELTKINDERTAG', makeDate(year, 9, 20)));
    }
}
function addWeltfrauenTag(year, region, feiertageObjects) {
    if (region !== 'BE') {
        return;
    }
    if (year < 2018) {
        return;
    }
    feiertageObjects.push(newHoliday('WELTFRAUENTAG', makeDate(year, 3, 8)));
}
/**
 * Calculates the Easter date of a given year.
 * @param year {number}
 * @returns {Date} Easter date
 * @private
 */
function getEasterDate(year) {
    const C = Math.floor(year / 100);
    // tslint:disable:binary-expression-operand-order
    // tslint generates false positives in the following blocks
    const N = year - 19 * Math.floor(year / 19);
    const K = Math.floor((C - 17) / 25);
    let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
    I -= 30 * Math.floor(I / 30);
    I -=
        Math.floor(I / 28) *
            (1 -
                Math.floor(I / 28) *
                    Math.floor(29 / (I + 1)) *
                    Math.floor((21 - N) / 11));
    let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4);
    J -= 7 * Math.floor(J / 7);
    const L = I - J;
    const M = 3 + Math.floor((L + 40) / 44);
    const D = L + 28 - 31 * Math.floor(M / 4);
    // tslint:enable:binary-expression-operand-order
    return new Date(year, M - 1, D);
}
/**
 * Computes the "Buss- und Bettag"'s date.
 * @param jahr {number}
 * @returns {Date} the year's "Buss- und Bettag" date
 * @private
 */
function getBussBettag(jahr) {
    const weihnachten = new Date(jahr, 11, 25, 12, 0, 0);
    const ersterAdventOffset = 32;
    let wochenTagOffset = weihnachten.getDay() % 7;
    if (wochenTagOffset === 0) {
        wochenTagOffset = 7;
    }
    const tageVorWeihnachten = wochenTagOffset + ersterAdventOffset;
    let bbtag = new Date(weihnachten.getTime());
    bbtag = addDays(bbtag, -tageVorWeihnachten);
    return bbtag;
}
/**
 * Adds {@code days} days to the given {@link Date}.
 * @param date
 * @param days
 * @returns {Date}
 * @private
 */
function addDays(date, days) {
    const changedDate = new Date(date);
    changedDate.setDate(date.getDate() + days);
    return changedDate;
}
/**
 * Creates a new {@link Date}.
 * @param year
 * @param naturalMonth month (1-12)
 * @param day
 * @returns {Date}
 * @private
 */
function makeDate(year, naturalMonth, day) {
    return new Date(year, naturalMonth - 1, day);
}
/**
 *
 * @param name
 * @param date
 * @returns {Holiday}
 * @private
 */
function newHoliday(name, date) {
    return {
        name,
        date,
        dateString: localeDateObjectToDateString(date),
        trans(lang = currentLanguage) {
            console.warn('FeiertageJs: You are using "Holiday.trans() method. This will be replaced in the next major version with translate()"');
            return this.translate(lang);
        },
        translate(lang = currentLanguage) {
            return lang === undefined || lang === null
                ? undefined
                : translations[lang][this.name];
        },
        getNormalizedDate() {
            return toUtcTimestamp(this.date);
        },
        equals(otherDate) {
            const dateString = localeDateObjectToDateString(otherDate);
            return this.dateString === dateString;
        },
    };
}
/**
 *
 * @param date
 * @returns {string}
 * @private
 */
function localeDateObjectToDateString(date) {
    const normalizedDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    normalizedDate.setUTCHours(0, 0, 0, 0);
    return normalizedDate.toISOString().slice(0, 10);
}
/**
 * Returns the UTC timestamp of the given date with hours, minutes, seconds, and milliseconds set to zero.
 * @param date
 * @returns {number} UTC timestamp
 */
function toUtcTimestamp(date) {
    const internalDate = new Date(date);
    internalDate.setHours(0, 0, 0, 0);
    return internalDate.getTime();
}

export { addTranslation, setLanguage, getLanguage, isSunOrHoliday, isHoliday, getHolidayByDate, isSpecificHoliday, getHolidays };
//# sourceMappingURL=feiertage.js.map
