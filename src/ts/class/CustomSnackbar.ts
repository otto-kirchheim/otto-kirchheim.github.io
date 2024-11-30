/*!
 * CustomSnackbar
 *
 * Copyright 2022-2023 Jan Otto
 */

interface ISnackbar {
	Open: () => SnackBar;
	Close: () => void;
}

interface SnackBarOptions {
	message: string;
	status?: Tstatus;
	timeout?: number | false;
	position?: Tposition;
	fixed?: boolean;
	dismissible?: boolean;
	container?: HTMLElement | string;
	width?: number;
	speed?: string | number;
	icon?: Ticon;
	actions?: { text: string; function?: () => void; dismiss?: boolean; class?: string[] }[];
}

type SnackBarOptionsAll = {
	message: string;
	status: Tstatus;
	timeout: number | false;
	position: Tposition;
	fixed: boolean;
	dismissible: boolean;
	container: HTMLElement | string;
	actions: { text: string; function?: () => void; dismiss?: boolean; class?: string[] }[];
	icon?: Ticon;
	width?: number;
	speed?: string | number;
};

type Tstatus =
	| "green"
	| "success"
	| "warning"
	| "alert"
	| "orange"
	| "danger"
	| "error"
	| "red"
	| "info"
	| ""
	| undefined;
type Tposition = "br" | "tr" | "tc" | "tm" | "bc" | "bm" | "tl" | "bl";
type Ticon =
	| "exclamation"
	| "warn"
	| "danger"
	| "info"
	| "question"
	| "question-mark"
	| "plus"
	| "add"
	| "!"
	| "?"
	| "+"
	| (string & { fromT?: string });

export class SnackBar implements ISnackbar {
	private readonly _Element: HTMLDivElement;
	private readonly _Container: HTMLElement | HTMLDivElement;
	private readonly _Interval: NodeJS.Timeout | undefined;
	private readonly _Message: HTMLSpanElement;
	private readonly _MessageWrapper: HTMLDivElement | Element;
	private readonly _Options: SnackBarOptionsAll;

	public Open(this: SnackBar): SnackBar {
		const getMessageHeight = (): number => {
			const wrapperStyles = window.getComputedStyle(this._MessageWrapper);
			return (
				this._Message.scrollHeight +
				parseFloat(wrapperStyles.getPropertyValue("padding-top")) +
				parseFloat(wrapperStyles.getPropertyValue("padding-bottom"))
			);
		};

		const contentHeight = getMessageHeight();
		this._Element.style.height = contentHeight + "px";
		this._Element.style.opacity = "1";
		this._Element.style.marginTop = "5px";
		this._Element.style.marginBottom = "5px";

		const addEventListener = () => {
			this._Element.removeEventListener("transitioned", addEventListener);
			this._Element.style.height = "0";
		};
		this._Element.addEventListener("transitioned", addEventListener);
		return this;
	}

	public Close(this: SnackBar): void {
		if (this._Interval) clearInterval(this._Interval);
		const snackbarHeight = this._Element.scrollHeight; // get the auto height as a px value

		const snackbarTransitions = this._Element.style.transition;
		this._Element.style.transition = "";
		requestAnimationFrame(() => {
			this._Element.style.height = snackbarHeight + "px"; // set the auto height to the px height
			this._Element.style.opacity = "1";
			this._Element.style.marginTop = "0px";
			this._Element.style.marginBottom = "0px";
			this._Element.style.transition = snackbarTransitions;
			requestAnimationFrame(() => {
				this._Element.style.height = "0px";
				this._Element.style.opacity = "0";
			});
		});
		setTimeout(() => {
			this._Container.removeChild(this._Element);
		}, 1000);
	}

	constructor(options: SnackBarOptions) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const _This = this;

		this._Options = _setUserOptions(options);
		this._Container = _setContainer();
		_applyPositionClasses();
		const { _Message, _MessageWrapper, _Element } = _createMessage();
		this._Element = _Element;
		this._Message = _Message;
		this._MessageWrapper = _MessageWrapper;
		this._Container.appendChild(this._Element);

		if (this._Options.timeout && this._Options.timeout > 0)
			this._Interval = setTimeout(() => this.Close.call(this), Number(this._Options.timeout));

		function _setUserOptions(options: SnackBarOptions): SnackBarOptionsAll {
			return {
				message: options.message ?? "Operation performed successfully.",
				dismissible: options.dismissible ?? true,
				timeout: options.timeout ?? 5000,
				status: options.status ?? "info",
				actions: options.actions ?? [],
				fixed: options.fixed ?? false,
				position: options.position ?? "br",
				container: options.container ?? document.body,
				width: options.width,
				speed: options.speed,
				icon: options.icon,
			};
		}

		function _setContainer(): HTMLDivElement | HTMLElement {
			let target: HTMLDivElement | HTMLElement | null = getOrFindContainer();
			if (target === undefined || target === null) {
				console.warn("SnackBar: Could not find target container " + _This._Options.container.normalize());
				target = document.body; // default to the body as the container
			}
			return getOrAddContainerIn(target);

			function getOrAddContainerIn(target: HTMLDivElement | HTMLElement): HTMLDivElement | HTMLElement {
				let node;
				const positionClass = _getPositionClass();
				if (target)
					for (let i = 0; i < target.children.length; i++) {
						node = target.children.item(i);
						if (
							node &&
							node.nodeType === 1 &&
							node.classList.length > 0 &&
							node.classList.contains("CustomSnackbar-container") &&
							node.classList.contains(positionClass)
						)
							return node as HTMLElement;
					}

				return createNewContainer(target);
			}

			function createNewContainer(target: HTMLDivElement | HTMLElement) {
				const container = document.createElement("div");
				container.classList.add("CustomSnackbar-container");

				if (_This._Options.fixed) container.classList.add("CustomSnackbar-container--fixed");

				target.appendChild(container);
				return container;
			}

			function getOrFindContainer(): HTMLDivElement | HTMLElement | null {
				return typeof _This._Options.container === "string"
					? document.querySelector(_This._Options.container)
					: _This._Options.container;
			}
		}

		function _applyPositionClasses(): void {
			_This._Container.classList.add(_getPositionClass());

			const fixedClassName = "CustomSnackbar-container--fixed";

			if (_This._Options.fixed) {
				_This._Container.classList.add(fixedClassName);
			} else {
				_This._Container.classList.remove(fixedClassName);
			}
		}

		function _createMessage(): { _Message: HTMLSpanElement; _MessageWrapper: HTMLDivElement; _Element: HTMLDivElement } {
			const outerElement = createWrapper();
			const { _Message, _MessageWrapper, innerSnack } = createInnerSnackbar();
			outerElement.appendChild(innerSnack);
			return { _Message, _MessageWrapper, _Element: outerElement };

			function createWrapper(): HTMLDivElement {
				const outerElement = document.createElement("div");
				outerElement.classList.add("CustomSnackbar__wrapper");
				outerElement.style.height = "0px";
				outerElement.style.opacity = "0";
				outerElement.style.marginTop = "0px";
				outerElement.style.marginBottom = "0px";
				setWidth(outerElement);
				setSpeed(outerElement);
				return outerElement;
			}

			function createInnerSnackbar() {
				const innerSnack = document.createElement("div");
				innerSnack.classList.add("CustomSnackbar", "CustomSnackbar--show");
				applyColorAndIconTo(innerSnack);
				const { _Message, _MessageWrapper } = insertMessageTo(innerSnack);
				addActionsTo(innerSnack);
				addDismissButtonTo(innerSnack);
				return { _Message, _MessageWrapper, innerSnack };
			}

			function applyColorAndIconTo(element: HTMLDivElement): void {
				if (!_This._Options.status) return;
				const status = document.createElement("span");
				status.classList.add("CustomSnackbar__status");
				applyColorTo(status);
				applyIconTo(status);
				element.appendChild(status);

				function applyColorTo(element: HTMLSpanElement): void {
					switch (_This._Options.status) {
						case "success":
						case "green":
							element.classList.add("CustomSnackbar--success");
							break;

						case "warning":
						case "alert":
						case "orange":
							element.classList.add("CustomSnackbar--warning");
							break;

						case "danger":
						case "error":
						case "red":
							element.classList.add("CustomSnackbar--danger");
							break;

						default:
							element.classList.add("CustomSnackbar--info");
							break;
					}
				}

				function applyIconTo(element: HTMLSpanElement): void {
					if (!_This._Options.icon) return;
					const icon = document.createElement("span");
					icon.classList.add("CustomSnackbar__icon");

					switch (_This._Options.icon) {
						case "exclamation":
						case "warn":
						case "danger":
							icon.innerText = "!";
							break;

						case "info":
						case "question":
						case "question-mark":
							icon.innerText = "?";
							break;

						case "plus":
						case "add":
							icon.innerText = "+";
							break;

						default:
							if (_This._Options.icon.length > 1) {
								console.warn("Invalid icon character provided: ", _This._Options.icon);
							}

							icon.innerText = _This._Options.icon.substring(0, 1);
							break;
					}

					element.appendChild(icon);
				}
			}

			function insertMessageTo(element: HTMLDivElement): { _Message: HTMLSpanElement; _MessageWrapper: HTMLDivElement } {
				const _MessageWrapper = document.createElement("div");
				_MessageWrapper.classList.add("CustomSnackbar__message-wrapper");
				const _Message = document.createElement("span");
				_Message.classList.add("CustomSnackbar__message");
				_Message.innerHTML = _This._Options.message;
				_MessageWrapper.appendChild(_Message);
				element.appendChild(_MessageWrapper);
				return { _Message, _MessageWrapper };
			}

			function addActionsTo(element: HTMLDivElement): void {
				if (typeof _This._Options.actions !== "object") return;

				_This._Options.actions.forEach((action): void => addAction(element, action));

				function addAction(element: HTMLDivElement, action: SnackBarOptionsAll["actions"][0]): void {
					const button = document.createElement("span");
					button.classList.add(...["CustomSnackbar__action", ...(action.class ?? [])]);
					button.textContent = action.text;

					if (typeof action.function === "function") {
						if (action.dismiss === true) {
							button.onclick = function () {
								if (action.function) action.function();
								_This.Close.call(_This);
							};
						} else button.onclick = action.function;
					} else button.onclick = _This.Close.bind(_This);

					element.appendChild(button);
				}
			}

			function addDismissButtonTo(element: HTMLDivElement) {
				if (!_This._Options.dismissible) return;

				const closeButton = document.createElement("span");
				closeButton.classList.add("CustomSnackbar__close");
				closeButton.innerText = "\u00D7";
				closeButton.onclick = _This.Close.bind(_This);
				element.appendChild(closeButton);
			}

			function setWidth(element: HTMLDivElement): void {
				if (!_This._Options.width) return;
				element.style.width = String(_This._Options.width);
			}

			function setSpeed(element: HTMLDivElement): void {
				const { speed } = _This._Options;

				switch (typeof speed) {
					case "number":
						element.style.transitionDuration = speed + "ms";
						break;

					case "string":
						element.style.transitionDuration = speed;
						break;
				}
			}
		}

		function _getPositionClass(): string {
			switch (_This._Options.position) {
				case "bl":
					return "CustomSnackbar-container--bottom-left";
				case "tl":
					return "CustomSnackbar-container--top-left";
				case "tr":
					return "CustomSnackbar-container--top-right";
				case "tc":
				case "tm":
					return "CustomSnackbar-container--top-center";
				case "bc":
				case "bm":
					return "CustomSnackbar-container--bottom-center";
				default:
					return "CustomSnackbar-container--bottom-right";
			}
		}

		this.Open();
	}
}

export const createSnackBar = (userOptions: SnackBarOptions): SnackBar => {
	return new SnackBar(userOptions);
};
