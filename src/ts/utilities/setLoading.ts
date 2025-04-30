export default function setLoading(btn: string): void {
	document.querySelector<HTMLDivElement>("#ladeAnzeige")?.classList.remove("d-none");

	const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
	if (!btnElement) return;
	btnElement.dataset.normaltext ??= btnElement.innerHTML;
	btnElement.dataset.loadingtext ??=
		"<span class='spinner-grow spinner-grow-sm' role='status' aria-hidden='true'></span>";
	btnElement.disabled = true;
	btnElement.innerHTML = btnElement.dataset.loadingtext;
}
