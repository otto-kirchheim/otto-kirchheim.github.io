const ewtThresholdRows = [
  ['Anzahl der', '>8'],
  ['Abwesenheiten nach', '>14'],
  ['FGr-TV / LfTV / RVB', '>24'],
] as const;

const steuerfreieRows = [
  ['steuerfreie Abwesen-', '>8'],
  ['heiten § 9 EStG', '>14'],
] as const;

const summaryRows = [
  'Bereitschaftszulage',
  'LRE 1',
  'LRE 2',
  'LRE 3',
  'Privat-PKW',
  'Summe Bereitschaft',
  'Summe EWT',
  'Summe Nebenbezüge',
  'Summe Gesamt',
] as const;

const renderNestedTable = (rows: readonly (readonly [string, string])[]) => (
  <table className="table table-borderless m-0">
    <tbody>
      {rows.map(([label, value]) => (
        <tr key={`${label}-${value}`}>
          <td className="py-0">{label}</td>
          <td className="py-0">{value}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const TableComponent = () => {
  return (
    <>
      <tr>
        <th>Bereitschaftszeiten</th>
      </tr>
      {summaryRows.slice(0, 6).map(label => (
        <tr key={label}>
          <th>{label}</th>
        </tr>
      ))}
      <tr>
        <th>{renderNestedTable(ewtThresholdRows)}</th>
      </tr>
      <tr>
        <th>{renderNestedTable(steuerfreieRows)}</th>
      </tr>
      {summaryRows.slice(6).map(label => (
        <tr key={label}>
          <th>{label}</th>
        </tr>
      ))}
    </>
  );
};

export default TableComponent;
