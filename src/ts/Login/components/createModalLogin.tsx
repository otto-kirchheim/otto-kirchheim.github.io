import { createRef } from "preact";
import { loginUser } from "../utils";
import { MyButton, MyFormModal, MyInput, MyModalBody, showModal } from "../../components";
import { createModalNewUser } from ".";

export default function createModalLogin(): void {
	const customFooterButtton = [
		<MyButton
			key="Registrieren"
			className="btn btn-info"
			type="button"
			dataBsDismiss="modal"
			text="Registrieren"
			clickHandler={() => createModalNewUser()}
		/>,
	];

	const ref = createRef<HTMLFormElement>();

	const modal = showModal(
		<MyFormModal
			myRef={ref}
			title="Einloggen"
			submitText="Einloggen"
			onSubmit={onSubmit()}
			customButtons={customFooterButtton}
		>
			<MyModalBody>
				<MyInput
					required
					type="text"
					id="Benutzer"
					name="benutzer"
					pattern={new RegExp(/[A-Za-z]*/).source}
					autoComplete="username"
				>
					Benutzer
				</MyInput>
				<MyInput required type="password" id="Passwort" name="Passwort" pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}>
					Passwort
				</MyInput>
			</MyModalBody>
		</MyFormModal>,
	);

	if (ref.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();
			loginUser(modal);
		};
	}
}
