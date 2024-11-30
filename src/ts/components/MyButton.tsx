import { JSX, FunctionalComponent } from "preact";

type TMyButton = {
	id?: string;
	type?: "button" | "reset" | "submit";
	className?: string;
	ariaLabel?: string;
	dataBsDismiss?: string;
	dataBSTarget?: string;
	text: string;
	clickHandler?: JSX.MouseEventHandler<HTMLButtonElement>;
};

const MyButton: FunctionalComponent<TMyButton> = ({
	id,
	type = "button",
	className = "btn btn-primary",
	ariaLabel,
	dataBsDismiss,
	dataBSTarget,
	text,
	clickHandler,
}: TMyButton) => {
	return (
		<button
			className={className}
			id={id}
			aria-label={ariaLabel ?? text}
			type={type}
			data-bs-dismiss={dataBsDismiss}
			data-bs-target={dataBSTarget}
			onClick={clickHandler}
		>
			{text}
		</button>
	);
};

export default MyButton;
