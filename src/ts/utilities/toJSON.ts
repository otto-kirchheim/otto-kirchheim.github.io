import { CustomTable } from "../class/CustomTable";
import { IDatenAllValuesWithKey } from "../interfaces";

export default function toJSON<T extends IDatenAllValuesWithKey>(formData: FormData, table: CustomTable<T>): T {
	const nameConvert = createNameConvertMap(table);
	const output: Record<string, unknown> = {};

	formData.forEach((value, key) => {
		console.log(key, value);
		const fieldName = nameConvert[key];
		if (!fieldName) return;
		output[fieldName] = addValueToOutput(output[fieldName], value);
	});

	return output as T;
}

function createNameConvertMap<T extends IDatenAllValuesWithKey>(table: CustomTable<T>): Record<string, string> {
	return table.columns.array
		.filter(column => column.name !== "editing")
		.reduce(
			(nameConvertMap, column) => {
				nameConvertMap[column.title] = column.name;
				return nameConvertMap;
			},
			{} as Record<string, string>,
		);
}

function addValueToOutput(existingValue: unknown, newValue: unknown): unknown {
	if (existingValue) {
		if (Array.isArray(existingValue)) {
			return [...existingValue, newValue];
		} else {
			return [existingValue, newValue];
		}
	} else {
		return newValue;
	}
}
