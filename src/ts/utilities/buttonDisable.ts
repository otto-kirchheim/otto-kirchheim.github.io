export default function buttonDisable(status: boolean): void {
	const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-disabler]"));
	buttons.forEach(button => (button.disabled = status));
	console.log(`Button disabled: ${status}`);
}
