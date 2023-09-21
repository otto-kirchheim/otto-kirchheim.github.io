import { Duration } from "dayjs/plugin/duration.js";
import dayjs from "./configDayjs";

export default function getDurationFromTime(value: dayjs.ConfigType): Duration {
	const time = dayjs(value, "HH:mm");
	return dayjs.duration({
		hours: time.hour(),
		minutes: time.minute(),
	});
}
