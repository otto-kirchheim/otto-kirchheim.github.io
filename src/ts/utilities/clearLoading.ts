export default function clearLoading(btn: string): void {
	const btnElement = document.querySelector<HTMLButtonElement>(`#${btn}`);
	if (!btnElement) return;
	btnElement.innerHTML = <string>btnElement.dataset.normaltext;
	btnElement.disabled = false;
}
