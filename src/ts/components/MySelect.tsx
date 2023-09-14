import { Dayjs } from "dayjs";
import { FunctionalComponent, JSX, RefObject } from "preact";

type TMySelect = {
	myRef?: RefObject<HTMLSelectElement>;
	id: string;
	title: string;
	value?: string | number | Dayjs;
	className: string;
	required?: boolean;
	changeHandler?: JSX.GenericEventHandler<HTMLSelectElement>;
	options: {
		value?: string | number;
		text: string;
		disabled?: boolean;
		selected?: boolean;
		html?: boolean;
	}[];
};

const MySelect: FunctionalComponent<TMySelect> = ({
	myRef,
	className,
	options,
	changeHandler,
	title,
	value,
	id,
	...selectProps
}) => {
	value = typeof value === "object" ? value?.toString() : value;

	return (
		<div className={className}>
			<select ref={myRef} id={id} className="form-select validate" onChange={changeHandler} value={value} {...selectProps}>
				{options.map(optionObject => (
					<option
						key={optionObject.text}
						value={optionObject.value ?? ""}
						disabled={optionObject.disabled}
						selected={optionObject.selected}
					>
						{optionObject.text}
					</option>
				))}
			</select>
			<label className="form-label" htmlFor={id}>
				{title}
			</label>
		</div>
	);
};

export default MySelect;
