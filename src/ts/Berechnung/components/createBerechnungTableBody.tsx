import { Fragment } from "preact/jsx-runtime";

const TableComponent = () => {
	return (
		<Fragment>
			<tr>
				<th rowSpan={2}>Bereitschaftszeiten</th>
			</tr>
			<tr></tr>
			<tr>
				<th>Bereitschaftszulage</th>
			</tr>
			<tr>
				<th>LRE 1</th>
			</tr>
			<tr>
				<th>LRE 2</th>
			</tr>
			<tr>
				<th>LRE 3</th>
			</tr>
			<tr>
				<th>Privat-PKW</th>
			</tr>
			<tr>
				<th>Summe Bereitschaft</th>
			</tr>
			<tr>
				<th>
					<table className="table table-borderless m-0">
						<tbody>
							<tr>
								<td className={"py-0"}>Anzahl der</td>
								<td className={"py-0"}>{">8"}</td>
							</tr>
							<tr>
								<td className={"py-0"}>Abwesenheiten nach</td>
								<td className={"py-0"}>{">14"}</td>
							</tr>
							<tr>
								<td className={"py-0"}>FGr-TV / LfTV / RVB</td>
								<td className={"py-0"}>{">24"}</td>
							</tr>
						</tbody>
					</table>
				</th>
			</tr>
			<tr>
				<th>
					<table className="table table-borderless m-0">
						<tbody>
							<tr>
								<td className={"py-0"}>steuerfreie Abwesen-</td>
								<td className={"py-0"}>{">8"}</td>
							</tr>
							<tr>
								<td className={"py-0"}>heiten § 9 EStG</td>
								<td className={"py-0"}>{">14"}</td>
							</tr>
						</tbody>
					</table>
				</th>
			</tr>
			<tr>
				<th>Summe EWT</th>
			</tr>
			<tr>
				<th>Summe Nebenbezüge</th>
			</tr>
			<tr>
				<th>Summe Gesamt</th>
			</tr>{" "}
		</Fragment>
	);
};

export default TableComponent;
