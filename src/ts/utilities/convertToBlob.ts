export default function convertToBlob(data: string, type = "application/pdf"): Blob {
	const binaryData = window.atob(data);
	const arrayBuffer = new ArrayBuffer(binaryData.length);
	const uint8Array = new Uint8Array(arrayBuffer);

	for (let i = 0; i < binaryData.length; i++) {
		uint8Array[i] = binaryData.charCodeAt(i);
	}

	return new Blob([arrayBuffer], { type });
}
