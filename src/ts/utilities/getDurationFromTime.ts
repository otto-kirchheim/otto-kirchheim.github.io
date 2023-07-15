import duration from "dayjs/plugin/duration.js";
import dayjs from "./configDayjs";

export default function getDurationFromTime(value: dayjs.ConfigType): duration.Duration {
	const time = dayjs(value, "HH:mm");
	const durationObject = {
		...{
			years: 0,
			months: 0,
			weeks: 0,
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
			milliseconds: 0,
		},
		hours: time.hour(),
		minutes: time.minute(),
	};
	return dayjs.duration(durationObject);
}
