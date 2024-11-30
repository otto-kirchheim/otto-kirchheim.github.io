import { createRef } from "preact";
import { createSnackBar } from "../../class/CustomSnackbar";
import { MyButton, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import type { CustomHTMLTableElement, IDatenEWT, IDatenN } from "../../interfaces";
import { Storage, tableToArray } from "../../utilities";
import { addNebenTag } from "../utils";

type ReturnTypeTagOptions = {
	value: string | number;
	text: string;
	disabled?: boolean;
	selected?: boolean;
};

const getTagOptions = (dataE: IDatenEWT[]): ReturnTypeTagOptions[] => {
	const dataN: IDatenN[] = tableToArray<IDatenN>("tableN");
	const jahr: number = Storage.get<number>("Jahr", { check: true });
	const monat: number = Storage.get<number>("Monat", { check: true });

	const options = dataE
		.map(day => {
			const schicht = day.schichtE;
			const tagE = +day.tagE;
			const tagN = `0${schicht === "N" || schicht === "BN" ? tagE - 1 : tagE}`.slice(-2);
			const tag = `${tagN} | ${new Date(
				jahr,
				monat - 1,
				tagE - (["N", "BN"].includes(schicht) ? 1 : 0)
			).toLocaleDateString("de", {
				weekday: "short",
			})}`;

			const option: ReturnTypeTagOptions = {
				text: "",
				value: JSON.stringify({
					tagN,
					beginN: day.beginE,
					endeN: day.endeE,
					anzahl040N: 1,
					auftragN: "",
				}),
			};

			if (schicht === "N") {
				option.text = `${tag} | Nacht`;
			} else if (schicht === "BN") {
				option.text = `${tag} | Nacht / Bereitschaft`;
			} else {
				option.text = tag;
			}

			if (dataN?.some(value => Number(value.tagN) === Number(tagN))) option.disabled = true;

			return option;
		})
		.filter((option, index, self) => !self.slice(0, index).some(other => other.text === option.text));

	return options;
};

export default function createAddModalNeben(): void {
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
				<MyInput divClass="form-floating col mb-3" type="text" id="AuftragN" name="Auftragsnummer" required>
					Auftragsnummer
				</MyInput>
				<MyInput
					divClass="form-floating col"
					type="number"
					id="anzahl040N"
					name="040 Fahrentschädigung"
					required
					value={1}
					min={"1"}
					max={"1"}
				>
					040 Fahrentschädigung
				</MyInput>
			</MyModalBody>
		</MyFormModal>
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
