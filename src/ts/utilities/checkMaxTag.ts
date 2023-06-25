import dayjs from "./configDayjs";

export default function checkMaxTag(Jahr: number, Monat: number): number {
	const tag = dayjs().date();
	return dayjs([Jahr, Monat, tag]).month() === Monat ? tag : 1;
}
