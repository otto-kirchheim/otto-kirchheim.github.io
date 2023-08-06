import Modal from "bootstrap/js/dist/modal";
import {
	createEditorModalFooter,
	createModal,
	createModalBodyDivSpanElement,
	createModalBodyInputElement,
} from "../../components";
import { loginUser } from "../utils";
import createModalNewUser from "./createModalNewUser";

export default function createModalLogin(): void {
	const { modal, form } = createModal(
		"Einloggen",
		true,
		null,
		createBodyElement,
		createEditorModalFooter([customFooterButtton()], "Login"),
		SubmitEventListener,
	);

	new Modal(modal).show();

	function createBodyElement(): HTMLDivElement {
		const modalBody = document.createElement("div");
		modalBody.className = "modal-body row g-2";

		modalBody.appendChild(
			createModalBodyInputElement({
				divClass: "form-floating",
				title: "Benutzer",
				name: "Benutzer",
				type: "text",
				pattern: /[A-z]*/,
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

	function customFooterButtton(): HTMLButtonElement {
		const btnNewUser = document.createElement("button");
		btnNewUser.className = "btn btn-info";
		btnNewUser.type = "button";
		btnNewUser.textContent = "Registrieren";
		btnNewUser.ariaLabel = "Registrieren";
		btnNewUser.dataset.bsDismiss = "modal";
		btnNewUser.addEventListener("click", () => createModalNewUser());
		return btnNewUser;
	}

	function SubmitEventListener(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();

			loginUser(modal);
		};
	}
}
