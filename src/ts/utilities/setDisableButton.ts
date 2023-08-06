export default function setDisableButton(status: boolean): void {
	const btnSaveList = document.querySelectorAll<HTMLButtonElement>("[id^='btnSave']");
	btnSaveList.forEach(button => {
		button.disabled = status;
	});

	const btnDownloadList = document.querySelectorAll<HTMLButtonElement>("[id^='btnDownload']");
	btnDownloadList.forEach(button => {
		button.disabled = status;
	});

	const btnAuswaehlen = document.querySelector<HTMLButtonElement>("#btnAuswaehlen");
	if (btnAuswaehlen) btnAuswaehlen.disabled = status;

	const btnChange = document.querySelector<HTMLButtonElement>("#btnChange");
	if (btnChange) btnChange.disabled = status;

	const btnPasswortAEndern = document.querySelector<HTMLButtonElement>("#btnPasswortAEndern");
	if (btnPasswortAEndern) btnPasswortAEndern.disabled = status;
}
