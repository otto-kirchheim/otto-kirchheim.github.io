class AbortControllerWrapper {
	controller: AbortController;
	signal: AbortSignal;

	constructor() {
		this.controller = new AbortController();
		this.signal = this.controller.signal;
	}

	reset(reason?: string) {
		this.controller?.abort(reason);
		this.controller = new AbortController();
		this.signal = this.controller.signal;
	}
}
export const abortController = new AbortControllerWrapper();
