import Modal from "bootstrap/js/dist/modal";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyDivSpanElement,
	createModalBodyInputElement,
} from "../../components";
import { checkNeuerBenutzer } from "../utils";

export default function createModalNewUser(): void {
	const { modal, form } = createModal(
		"Neuen Benutzer Erstellen",
		true,
		null,
		createBodyElement,
		createEditorModalFooter(null, "Erstellen"),
		SubmitEventListener,
	);

	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row g-2";

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Zugangscode",
				name: "Zugang",
				type: "text",
				pattern: /[A-z]*/,
				autocomplete: "off",
				required: true,
			}),
		);

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Benutzer",
				name: "Benutzer",
				type: "text",
				pattern: /[A-z]*/,
				popover: { content: "Nur Buchstaben, kein Ää Öö Üü ß", placement: "left", trigger: "focus" },
				autocomplete: "username",
				required: true,
			}),
		);

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Passwort",
				name: "Passwort",
				type: "password",
				pattern: /^[A-Za-z0-9.\-+_%]*$/,
				popover: {
					content: "-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>",
					placement: "right",
					html: true,
					title: "Erlaubte Zeichen",
					trigger: "focus",
				},
				autocomplete: "new-password",
				required: true,
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Passwort wiederholen",
				name: "Passwort2",
				type: "password",
				pattern: /^[A-Za-z0-9.\-+_%]*$/,
				popover: {
					content: "-Große Buchstaben <br/>-Kleine Buchstaben <br/>-Zahlen <br/>-Zeichen: .-+_% <br/>",
					placement: "right",
					html: true,
					title: "Erlaubte Zeichen",
					trigger: "focus",
				},
				autocomplete: "new-password",
				required: true,
			}),
		);

		modalBody.appendChild(
			createModalBodyDivSpanElement({
				divClass: "text-bg-danger",
				spanID: "errorMessage",
			}),
		);

		return modalBody;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			checkNeuerBenutzer(modal);
		};
	}
}
