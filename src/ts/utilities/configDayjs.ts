import dayjs from "dayjs";
import "dayjs/locale/de.js";
import arraySupport from "dayjs/plugin/arraySupport.js";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import duration from "dayjs/plugin/duration.js";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter.js";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
import isoWeek from "dayjs/plugin/isoWeek.js";
import LocalizedFormat from "dayjs/plugin/localizedFormat.js";
import minMax from "dayjs/plugin/minMax.js";
import weekday from "dayjs/plugin/weekday.js";

dayjs.locale("de");
dayjs.extend(arraySupport);
dayjs.extend(customParseFormat);
dayjs.extend(LocalizedFormat);
dayjs.extend(isoWeek);
dayjs.extend(weekday);
dayjs.extend(duration);
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);
dayjs.extend(minMax);

export default dayjs;
