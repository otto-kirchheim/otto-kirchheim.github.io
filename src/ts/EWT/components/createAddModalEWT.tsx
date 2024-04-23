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
	const Monat: number = Storage.get<number>("Monat", { check: true });
	const datum = dayjs([Jahr, Monat - 1, 1]);
	const maxDate = datum.endOf("month").format("YYYY-MM-DD");

	const berechnenRef = createRef<HTMLInputElement>();
	const bueroRef = createRef<HTMLInputElement>();
	const EOrtRef = createRef<HTMLSelectElement>();
	const SchichtRef = createRef<HTMLSelectElement>();

	const changeBuero = (event: Event) => {
		event.stopPropagation();
		if (!berechnenRef.current || !EOrtRef.current || !SchichtRef.current) return;
		const target = event.currentTarget as HTMLInputElement | null;
		if (target) {
			berechnenRef.current.checked = !target.checked;
			if (target.checked) {
				const EOrt = EOrtRef.current;
				const index = Array.from(EOrt.options).findIndex(option => option.value === vorgabenU.pers.ErsteTkgSt);
				EOrt.selectedIndex = index !== -1 ? index : 0;

				SchichtRef.current.selectedIndex = 0;
			}
		}
	};

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
					myRef={EOrtRef}
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
					myRef={SchichtRef}
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
				<MyCheckbox className="form-check form-switch mt-3" id="berechnen1" myRef={berechnenRef} checked>
					Berechnen
				</MyCheckbox>
				<MyCheckbox className="form-check form-switch mt-3" id="berechnen2" changeHandler={changeBuero} myRef={bueroRef}>
					Büro
					<br />
					<small>(Keine Fahrt zu einem Einsatzort)</small>
				</MyCheckbox>
			</MyModalBody>
		</MyFormModal>,
	);

	naechsterTag("");

	if (ref.current === null || bueroRef.current === null) throw new Error("referenz nicht gesetzt");
	const form = ref.current;
	const bueroCheckbox = bueroRef.current;

	function onSubmit(): (event: Event) => void {
		return (event: Event): void => {
			if (!(form instanceof HTMLFormElement)) return;
			if (form.checkValidity && !form.checkValidity()) return;
			event.preventDefault();
			addEWTtag(modal, vorgabenU, Jahr, Monat, bueroCheckbox.checked);
		};
	}
}
