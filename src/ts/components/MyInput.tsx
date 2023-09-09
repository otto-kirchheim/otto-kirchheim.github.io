import Popover from "bootstrap/js/dist/popover";
import { Component, RefObject, createRef } from "preact";

type TModalBodyInputElementOption = {
	myRef?: RefObject<HTMLInputElement>;
	type: string;
	id: string;
	name: string;
	value?: string | number;
	divClass?: string;
	required?: boolean;
	disabled?: boolean;
	pattern?: string;
	autoComplete?: "on" | "off" | "username" | "current-password" | "new-password";
	popover?: {
		content: string;
		title?: string;
		trigger?:
			| "click"
			| "hover"
			| "focus"
			| "manual"
			| "click hover"
			| "click focus"
			| "hover focus"
			| "click hover focus";
		placement?: "top" | "right" | "left" | "bottom";
		html?: boolean;
	};
	min?: string | number;
	max?: string | number;
	onChange?: (this: HTMLInputElement, ev: Event) => void;
};

export default class MyInput extends Component<TModalBodyInputElementOption> {
	input = this.props.myRef ?? createRef<HTMLInputElement>();
	popoverInstance: Popover | null = null;

	componentDidMount(): void {
		if (this.props.popover && this.input.current) {
			this.popoverInstance = new Popover(this.input.current, this.props.popover);
		}
	}

	componentWillUnmount(): void {
		this.popoverInstance?.dispose();
	}

	render() {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { myRef, divClass, popover, children, ...inputProps } = this.props;

		return (
			<div className={divClass ?? "form-floating"}>
				<input ref={this.input} className="form-control validate" {...inputProps} />
				<label htmlFor={this.props.id}>{children}</label>
			</div>
		);
	}
}
