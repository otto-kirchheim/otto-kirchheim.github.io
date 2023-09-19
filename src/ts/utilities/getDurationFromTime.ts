import duration from "dayjs/plugin/duration.js";
import dayjs from "./configDayjs";

export default function getDurationFromTime(value: dayjs.ConfigType): duration.Duration {
	const time = dayjs(value, "HH:mm");
	return dayjs.duration({
		hours: time.hour(),
		minutes: time.minute(),
	});
}
