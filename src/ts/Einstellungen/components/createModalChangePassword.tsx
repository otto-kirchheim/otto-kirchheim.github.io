import { createRef } from "preact";
import { MyFormModal, MyInput, MyModalBody, showModal } from "../../components";
import { checkPasswort } from "../utils";

export default function createModalChangePassword(): void {
	const ref = createRef<HTMLFormElement>();

	const modal = showModal(
		<MyFormModal myRef={ref} size="sm" title="Passwort Ändern" submitText="Speichern" onSubmit={onSubmit()}>
			<MyModalBody>
				<MyInput
					required
					type="password"
					id="PasswortAlt"
					name="Altes Passwort"
					pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
					autoComplete="current-password"
				>
					Altes Passwort
				</MyInput>
				<MyInput
					required
					type="password"
					id="PasswortNeu"
					name="Neues Passwort"
					pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
					autoComplete="new-password"
					popover={{
						content: "-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>",
						placement: "right",
						html: true,
						title: "Erlaubte Zeichen",
						trigger: "focus",
					}}
				>
					Neues Passwort
				</MyInput>
				<MyInput
					required
					type="password"
					id="PasswortNeu2"
					name="Neues Passwort wiederholen"
					pattern={new RegExp(/^[A-Za-z0-9.\-+_%]*$/).source}
					autoComplete="new-password"
					popover={{
						content: "-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>",
						placement: "right",
						html: true,
						title: "Erlaubte Zeichen",
						trigger: "focus",
					}}
				>
					Neues Passwort wiederholen
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
			checkPasswort(modal);
		};
	}
}
