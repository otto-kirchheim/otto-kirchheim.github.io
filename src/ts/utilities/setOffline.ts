import { changeMonatJahr } from "../Login/utils";
import { createSnackBar } from "../class/CustomSnackbar";
import { setDisableButton } from ".";

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
			status: "info",
			timeout: 2000,
			position: "tc",
			fixed: true,
		});
	};

	window.addEventListener("online", onlineHandler, { once: true });
}
