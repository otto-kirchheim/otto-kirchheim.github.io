import { createSnackBar } from "../class/CustomSnackbar";
import { setDisableButton } from ".";
import { changeMonatJahr } from "../Einstellungen/utils";

export default function setOffline(): void {
	setDisableButton(true);
	const offlineSnackbar = createSnackBar({
		message: "Du bist offline",
		icon: "!",
		dismissible: false,
		status: "error",
		timeout: false,
		position: "tc",
		fixed: true,
	});

	const onlineHandler = () => {
		setDisableButton(false);
		changeMonatJahr();
		offlineSnackbar.Close();
		createSnackBar({
			message: "Du bist wieder online",
			dismissible: false,
			timeout: 2000,
			position: "tc",
			fixed: true,
		});
	};

	window.addEventListener("online", onlineHandler, { once: true });
}
