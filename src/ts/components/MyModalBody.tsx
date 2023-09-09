import { FunctionalComponent } from "preact";

type TMyModalBody = { className?: string };

const MyModalBody: FunctionalComponent<TMyModalBody> = ({ className, children }) => {
	const defaultClass = "modal-body";
	const additionalClass = className ? ` ${className}` : " row g-2";

	return (
		<div className={`${defaultClass}${additionalClass}`}>
			{children}
			<div className="text-bg-danger">
				<span id="errorMessage" />
			</div>
		</div>
	);
};
export default MyModalBody;
