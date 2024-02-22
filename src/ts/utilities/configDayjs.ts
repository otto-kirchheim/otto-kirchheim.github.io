import dayjs from "dayjs";
import "dayjs/locale/de.js";
import arraySupport from "dayjs/plugin/arraySupport.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import duration from "dayjs/plugin/duration.js";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isoWeek from "dayjs/plugin/isoWeek.js";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import minMax from "dayjs/plugin/minMax.js";
import weekday from "dayjs/plugin/weekday.js";

dayjs.locale("de");
dayjs.extend(arraySupport);
dayjs.extend(customParseFormat);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isoWeek);
dayjs.extend(LocalizedFormat);
dayjs.extend(minMax);
dayjs.extend(weekday);

export default dayjs;
