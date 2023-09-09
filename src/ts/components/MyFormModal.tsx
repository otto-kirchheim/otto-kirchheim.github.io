import { FunctionalComponent } from "preact";
import type { TMyModal } from "../interfaces";
import { MyEditorFooter, MyModalHeader } from ".";

const MyFormModal: FunctionalComponent<TMyModal<HTMLFormElement>> = ({
	size,
	myRef,
	onSubmit,
	title,
	Header,
	children,
	Footer,
	submitText,
	customButtons,
}) => (
	<div className={size ? `modal-dialog modal-${size}` : "modal-dialog"}>
		<form ref={myRef} onSubmit={onSubmit} className="modal-content">
			{Header ?? <MyModalHeader title={title} />}
			{children}
			{Footer ?? <MyEditorFooter submitText={submitText} customButtons={customButtons} />}
		</form>
	</div>
);

export default MyFormModal;
