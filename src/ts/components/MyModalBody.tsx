import { FunctionalComponent } from "preact";

const MyModalBody: FunctionalComponent<{ className?: string }> = ({ className, children }) => {
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
