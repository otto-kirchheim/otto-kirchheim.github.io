import { FunctionalComponent } from "preact";
import { TMyModal } from "../interfaces";
import { MyModalHeader, MyEditorFooter } from ".";

const MyDivModal: FunctionalComponent<Omit<TMyModal<HTMLDivElement>, "myRef" | "onSubmit">> = ({
	size,
	title,
	Header,
	children,
	Footer,
	submitText,
	customButtons,
}) => (
	<div className={"modal-dialog"}>
		<div className={size ? `modal-content modal-${size}` : "modal-content"}>
			{Header ?? <MyModalHeader title={title} />}
			{children}
			{Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
		</div>
	</div>
);

export default MyDivModal;
