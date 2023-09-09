import React from "preact";

export type TMyModal<T> = {
	myRef: React.RefObject<T>;
	title: string;
	size?:
		| "sm"
		| "lg"
		| "xl"
		| "fullscreen"
		| "fullscreen-sm-down"
		| "fullscreen-md-down"
		| "fullscreen-lg-down"
		| "fullscreen-xl-down"
		| "fullscreen-xxl-down";
	submitText?: string;
	customButtons?: React.ComponentChild[];
	onSubmit: (this: T, event: Event) => void;
	Footer?: React.ComponentChild;
	Header?: React.ComponentChild;
};
