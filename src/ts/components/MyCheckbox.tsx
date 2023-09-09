import { ComponentChild, FunctionalComponent, JSX } from "preact";

type TMyCheckbox = {
	className: string;
	id: string;
	children: ComponentChild;
	checked?: boolean;
	disabled?: boolean;
	changeHandler?: JSX.GenericEventHandler<HTMLInputElement>;
};

const MyCheckbox: FunctionalComponent<TMyCheckbox> = ({ className, changeHandler, children, id, ...inputProps }) => {
	return (
		<div className={className}>
			<input type="checkbox" className="form-check-input" id={id} onChange={changeHandler} {...inputProps} />
			<label className="form-check-label" htmlFor={id}>
				{children}
			</label>
		</div>
	);
};
export default MyCheckbox;
