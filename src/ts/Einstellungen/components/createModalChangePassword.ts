import Modal from "bootstrap/js/dist/modal";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyDivSpanElement,
	createModalBodyInputElement,
} from "../../components";
import checkPasswort from "../utils/checkPasswort";

export default function createModalChangePassword(): void {
	const { modal, form } = createModal(
		"Passwort Ändern",
		true,
		"sm",
		createBodyElement,
		createEditorModalFooter(null, "Speichern"),
		SubmitEventListener,
	);

	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row g-2";

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Altes Passwort",
				name: "PasswortAlt",
				type: "password",
				pattern: /^[A-Za-z0-9.\-+_%]*$/,
				autocomplete: "current-password",
				required: true,
			}),
		);
		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Neues Passwort",
				name: "PasswortNeu",
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
				title: "Neues Passwort wiederholen",
				name: "PasswortNeu2",
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

			checkPasswort(modal);
		};
	}
}
