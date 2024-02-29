import { createRef } from "preact";
import { MyButton, MyCheckbox, MyFormModal, MyInput, MyModalBody, MySelect, showModal } from "../../components";
import { IDatenEWT, type IVorgabenU, type IVorgabenUfZ } from "../../interfaces";
import { Storage } from "../../utilities";
import dayjs from "../../utilities/configDayjs";
import { addEWTtag, naechsterTag } from "../utils";

export default function createAddModalEWT(): void {
	const ref = createRef<HTMLFormElement>();

	const vorgabenU: IVorgabenU = Storage.get("VorgabenU", { check: true });

	const Jahr: number = Storage.get<number>("Jahr", { check: true });
	const Monat: number = Storage.get<number>("Monat", { check: true }) - 1;
	const datum = dayjs([Jahr, Monat, 1]);
	const maxDate = datum.endOf("month").format("YYYY-MM-DD");

	const modal = showModal<IDatenEWT>(
		<MyFormModal myRef={ref} size="sm" title="Neue Anwesenheit eingeben" onSubmit={onSubmit()}>
			<MyModalBody>
				<div>
					<MyButton
						className="btn btn-secondary btn-lg text-start col-12"
						id="btnNaechsterTag"
						clickHandler={(e: MouseEvent) => {
							e.preventDefault();
							naechsterTag();
						}}
						text="+1 Tag"
						ariaLabel="Nächster Tag"
					/>
				</div>
				<MyInput required type="date" id="tagE" name="Tag" min={datum.format("YYYY-MM-DD")} max={maxDate}>
					Tag
				</MyInput>
				<MySelect
					className="form-floating"
					title="Einsatzort"
					id="EOrt"
					options={[
						{ text: "", selected: true },
						...vorgabenU.fZ.map((ort: IVorgabenUfZ) => {
							return {
								value: ort.key,
								text: ort.key,
							};
						}),
					]}
				/>
				<MySelect
					className="form-floating"
					title="Schicht"
					id="Schicht"
					required
					options={[
						{
							value: "T",
							text: `Tag | ${vorgabenU.aZ.bT.toString()}-${vorgabenU.aZ.eT.toString()}/${vorgabenU.aZ.eTF.toString()}`,
							selected: true,
						},
						{ value: "N", text: `Nacht | ${vorgabenU.aZ.bN.toString()}-${vorgabenU.aZ.eN.toString()}` },
						{ value: "BN", text: `Nacht (Ber) | ${vorgabenU.aZ.bBN.toString()}-${vorgabenU.aZ.eN.toString()}` },
						{ value: "S", text: `Sonder | ${vorgabenU.aZ.bS.toString()}-${vorgabenU.aZ.eS.toString()}` },
					]}
				/>
				<MyCheckbox className="form-check form-switch mt-3" id="berechnen1" checked>
					Berechnen
				</MyCheckbox>
			</MyModalBody>
		</MyFormModal>,
	);

	naechsterTag("");

	if (ref.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();
			addEWTtag(modal);
		};
	}
}
