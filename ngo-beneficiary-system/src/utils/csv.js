export function exportToCsv(beneficiaries) {
  const headers = [
    "Full Name",
    "Phone",
    "Category",
    "Date Added",
    "Passport",
    "Called",
    "Date Called",
  ];
  const rows = beneficiaries.map((item) => [
    item.fullName,
    item.phone,
    item.category,
    item.dateAdded,
    item.passport || "",
    item.called ? "Yes" : "No",
    item.calledAt || "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\r\n");

  return new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
}

function normalizeName(value) {
  if (!value) return "";

  let name = String(value).trim();
  name = name.replace(/[._]+/g, " ").replace(/\s+/g, " ").trim();

  if (!name.includes(" ")) {
    name = name
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2");
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function normalizeRow(row) {
  const normalized = {
    id: crypto.randomUUID(),
    fullName: normalizeName(row["Full Name"] || row["Name"] || ""),
    phone: row["Phone"] || row["Phone Number"] || "",
    category: row["Category"] || "Past Beneficiary",
    dateAdded: row["Date Added"] || new Date().toISOString().slice(0, 10),
    passport: row["Passport"] || "",
    empowermentType: row["Empowerment Type"] || row["Empowerment"] || "",
    called: String(row["Called"] || row["Called Status"] || "")
      .toLowerCase()
      .startsWith("y"),
    calledAt: row["Date Called"] || "",
  };

  if (!normalized.fullName || !normalized.phone) {
    return null;
  }

  return normalized;
}

export function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  const headerLine = lines[0] || "";
  const headers = headerLine
    .split(",")
    .map((value) => value.replace(/(^"|"$)/g, "").trim());

  return lines
    .slice(1)
    .map((line) => {
      const values = line
        .split(",")
        .map((value) => value.replace(/(^"|"$)/g, "").trim());
      const row = {};

      headers.forEach((key, index) => {
        row[key] = values[index] || "";
      });

      return normalizeRow(row);
    })
    .filter(Boolean);
}

export async function importCsvFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = event.target.result;
          resolve(parseCsv(text));
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Unable to read CSV file"));
      reader.readAsText(file, "UTF-8");
    });
  }

  throw new Error("Unsupported file format. Please use CSV.");
}
