import { createRef } from "preact";
import { MyFormModal, MyInput, MyModalBody, showModal } from "../../components";
import { checkNeuerBenutzer } from "../utils";

export default function createModalNewUser(): void {
	const ref = createRef<HTMLFormElement>();

	const modal = showModal(
		<MyFormModal myRef={ref} title="Neuen Benutzer Erstellen" submitText="Erstellen" onSubmit={onSubmit()}>
			<MyModalBody>
				<MyInput
					required
					type="text"
					id="Zugang"
					name="Zugangscode"
					pattern={new RegExp(/[A-z]*/).source}
					autoComplete="off"
				>
					Zugangscode
				</MyInput>
				<MyInput
					required
					type="text"
					id="Benutzer"
					name="Benutzer"
					pattern={new RegExp(/^[A-z]*/).source}
					autoComplete="off"
					popover={{ content: "Nur Buchstaben, kein Ää Öö Üü ß", placement: "right", trigger: "focus" }}
				>
					Benutzer
				</MyInput>
				<MyInput
					required
					type="password"
					id="Passwort"
					name="Passwort"
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
					Passwort
				</MyInput>
				<MyInput
					required
					type="password"
					id="Passwort2"
					name="Passwort wiederholen"
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
					Passwort wiederholen
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
			checkNeuerBenutzer(modal);
		};
	}
}
