import { Dayjs } from "dayjs";
import { FunctionalComponent } from "preact";

type TMyShowElement = {
	divClass?: string;
	labelClass?: string;
	spanClass?: string;
	title: string;
	id: string;
	text?: string | number | Date | Dayjs;
};

const MyShowElement: FunctionalComponent<TMyShowElement> = ({
	divClass = "mb-1 row",
	labelClass = "col-3 col-form-label text-wrap fw-bold",
	spanClass = "col-9 align-middle text-break my-auto",
	title,
	id,
	text = "\u00A0", //"&nbsp;",
}) => {
	return (
		<div className={divClass}>
			<label className={labelClass} htmlFor={id}>
				{title}
			</label>
			<span className={spanClass} id={id}>
				{text.toString()}
			</span>
		</div>
	);
};
export default MyShowElement;
