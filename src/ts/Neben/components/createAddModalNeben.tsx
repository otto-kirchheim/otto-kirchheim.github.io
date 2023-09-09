import { createRef } from "preact";
import { createSnackBar } from "../../class/CustomSnackbar";
import { MyButton, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLTableElement, IDatenEWT, IDatenN } from "../../interfaces";
import { Storage, tableToArray } from "../../utilities";
import { addNebenTag } from "../utils";

const getTagOptions = (
	dataE: IDatenEWT[],
): {
	value: string | number;
	text: string;
	disabled?: boolean;
	selected?: boolean;
}[] => {
	const dataN: IDatenN[] = tableToArray<IDatenN>("tableN");
	const jahr: number = Storage.get<number>("Jahr", { check: true });
	const monat: number = Storage.get<number>("Monat", { check: true });
	const options = [];
	for (const day of dataE) {
		const schicht = day.schichtE;
		let tagN: string,
			tag: string,
			pauseA = "12:00",
			pauseE = "12:30";
		if (["N", "BN"].includes(schicht)) {
			tagN = `0${+day.tagE - 1}`.slice(-2);
			tag = `${tagN} | ${new Date(jahr, monat - 1, +day.tagE - 1).toLocaleDateString("de", {
				weekday: "short",
			})}`;
			pauseA = "01:00";
			pauseE = "01:45";
		} else {
			tagN = `0${day.tagE}`.slice(-2);
			tag = `${tagN} | ${new Date(jahr, monat - 1, +day.tagE).toLocaleDateString("de", {
				weekday: "short",
			})}`;
			if (tag.includes("Fr")) {
				pauseA = "";
				pauseE = "";
			}
		}

		const option = {} as ReturnType<typeof getTagOptions>[0];

		if (schicht == "N") option.text = `${tag} | Nacht`;
		else if (schicht == "BN") option.text = `${tag} | Nacht / Bereitschaft`;
		else option.text = tag;

		option.value = JSON.stringify({
			tagN,
			beginN: day.beginE,
			endeN: day.endeE,
			beginPauseN: pauseA,
			endePauseN: pauseE,
			nrN: "",
			dauerN: 0,
		});
		if (dataN)
			dataN.forEach(value => {
				if (Number(value.tagN) == Number(tagN)) option.disabled = true;
			});

		options.push(option);
	}
	return options;
};

export default function createAddModalEWT(): void {
	const ref = createRef<HTMLFormElement>();

	const dataE = tableToArray<IDatenEWT>("tableE");
	if (dataE.length === 0) {
		createSnackBar({
			message: 'Keine Tage in EWT gefunden. </br></br>Bitte erst EWT ausfüllen! </br>oder Manuell über "Neue Zeile"',
			timeout: 3000,
			fixed: true,
		});
		throw new Error("'Keine Tage in EWT gefunden.");
	}
	console.log(dataE);

	const customFooterButton = [
		<MyButton
			key="Manuell"
			className="btn btn-info"
			type="button"
			dataBsDismiss="modal"
			text="Manuell"
			clickHandler={() => {
				const table = document.querySelector<CustomHTMLTableElement<IDatenN>>("#tableN");
				if (!table) throw new Error("table N nicht gefunden");

				table.instance.options.editing.addRow();
			}}
		/>,
	];

	showModal(
		<MyFormModal myRef={ref} title="Neuen Nebenbezug eingeben" onSubmit={onSubmit()} customButtons={customFooterButton}>
			<MyModalBody className=" ">
				<p className="text-center text-bg-warning p-1">!!! Erst EWT Eingeben und Berechnen !!!</p>
				<MySelect
					className="form-floating col mb-3"
					title="Tag (Aus EWT)"
					id="tagN"
					required
					options={getTagOptions(dataE)}
				/>
				<MySelect
					className="form-floating col mb-3"
					title="Nebenbezug (Aktuell nur 1 möglichkeit)"
					id="Nebenbezug"
					required
					options={[
						{
							value: "040 Fahrentsch.",
							text: "040 Fahrentsch.",
							selected: true,
						},
					]}
				/>
				<MyInput divClass="form-floating col" type="number" id="AnzahlN" name="Anzahl" required value={1} min={1} max={1}>
					Anzahl
				</MyInput>
			</MyModalBody>
		</MyFormModal>,
	);

	if (ref.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!form.checkValidity()) return;
			event.preventDefault();
			addNebenTag(form);
		};
	}
}
