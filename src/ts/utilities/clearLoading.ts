export default function clearLoading(btn: string, resetLoader: boolean = true): void {
	if (resetLoader) document.querySelector<HTMLDivElement>("#ladeAnzeige")?.classList.add("d-none");

	const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
	if (!btnElement) return;
	btnElement.innerHTML = btnElement.dataset.normaltext!;
	btnElement.disabled = false;
}
