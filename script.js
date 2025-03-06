function processFile() {
    const fileInput = document.getElementById('fileInput').files[0];
    if (!fileInput) return alert("Please upload a CSV file.");

    const reader = new FileReader();
    reader.onload = function(event) {
        const csv = event.target.result;
        const rows = csv.split("\n").map(row => row.split(","));
        const headers = rows[0];
        const data = rows.slice(1);

        const plannedDurationIndex = headers.indexOf("Planned Duration");
        const serviceTypeIndex = headers.indexOf("Service Type");
        const deliveryAssociateIndex = headers.indexOf("Delivery Associate");
        const dateIndex = headers.indexOf("Date");
        const routeIndex = headers.indexOf("Route");
        const totalDistancePlannedIndex = headers.indexOf("Total Distance Planned");

        // First pass: collect routes by date to identify helpers
        let routesByDate = {};
        data.forEach(row => {
            if (row.length <= 1) return; // Skip empty rows
            
            const date = row[dateIndex] || "";
            const route = row[routeIndex] || "";
            
            if (date && route) {
                if (!routesByDate[date]) {
                    routesByDate[date] = {};
                }
                if (!routesByDate[date][route]) {
                    routesByDate[date][route] = [];
                }
                routesByDate[date][route].push(row);
            }
        });

        let summary = {};
        let breakdown = {};

        data.forEach(row => {
            if (row.length <= 1) return; // Skip empty rows
            
            const deliveryAssociate = row[deliveryAssociateIndex] || "Unknown";
            const date = row[dateIndex] || "";
            const route = row[routeIndex] || "";
            const totalDistancePlanned = row[totalDistancePlannedIndex] || "";
            const serviceType = row[serviceTypeIndex] || "";

            let category = "";
            
            // Check if this is a Ride Along
            if (serviceType && (serviceType.includes("Ride Along") || serviceType.includes("Ironhide"))) {
                category = "RideAlong";
            }
            // Check if this is a helper route (same route on same date with blank distance)
            else if (route && 
                     route.startsWith("CA") && 
                     date && 
                     routesByDate[date] && 
                     routesByDate[date][route] && 
                     routesByDate[date][route].length > 1 && 
                     totalDistancePlanned.trim() === "") {
                category = "Helper";
            }
            // Check if this is a Full Route
            else if (row[plannedDurationIndex] === "9 hr") {
                category = "FullRoute";
            }
            // Check if this is a DRS
            else if (row[plannedDurationIndex] === "6 hr") {
                category = "DRS";
            }
            // Check if this is Other (non-CA route with no distance)
            else if (route && 
                     !route.startsWith("CA") && 
                     totalDistancePlanned.trim() === "") {
                category = "Other";
            }
            // Check if this is Training Day
            else if (serviceType === "Training Day") {
                category = "Other";
            }

            const key = date + "|" + deliveryAssociate;

            if (!breakdown[key]) {
                breakdown[key] = {
                    Date: date,
                    DeliveryAssociate: deliveryAssociate,
                    FullRoute: 0,
                    RideAlong: 0,
                    DRS: 0,
                    Helper: 0,
                    Other: 0
                };
            }

            if (category) {
                breakdown[key][category]++;
            }

            if (!summary[deliveryAssociate]) {
                summary[deliveryAssociate] = {
                    DeliveryAssociate: deliveryAssociate,
                    FullRoute: 0,
                    RideAlong: 0,
                    DRS: 0,
                    Helper: 0,
                    Other: 0,
                    Total: 0
                };
            }

            if (category) {
                summary[deliveryAssociate][category]++;
                summary[deliveryAssociate].Total++;
            }
        });

        const summaryArray = Object.values(summary);
        summaryArray.sort((a, b) => {
            const nameA = a.DeliveryAssociate || "";
            const nameB = b.DeliveryAssociate || "";
            return nameA.localeCompare(nameB);
        });

        populateTable("weeklySummary", ["DeliveryAssociate", "FullRoute", "RideAlong", "DRS", "Helper", "Other", "Total"], summaryArray);
        populateTable("detailedBreakdown", ["Date", "DeliveryAssociate", "FullRoute", "RideAlong", "DRS", "Helper", "Other"], Object.values(breakdown));
    };
    reader.readAsText(fileInput);
}

function populateTable(tableId, columns, data) {
    const table = document.getElementById(tableId);
    table.innerHTML = "";
    
    // Create header row
    let headerRow = document.createElement("tr");
    columns.forEach(col => {
        let th = document.createElement("th");
        th.textContent = col;
        th.style.textAlign = "center"; // Center-align header cells
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Create data rows
    data.forEach(rowData => {
        let tr = document.createElement("tr");
        columns.forEach(col => {
            let td = document.createElement("td");
            let value = rowData[col];
            
            // Always show text for DeliveryAssociate and Date
            if (col === "DeliveryAssociate" || col === "Date") {
                td.textContent = value || "";
            } 
            // For numeric columns, only show if >= 1
            else {
                if (value >= 1) {
                    td.textContent = value;
                }
            }
            
            td.style.textAlign = "center"; // Center-align all cells
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
}
