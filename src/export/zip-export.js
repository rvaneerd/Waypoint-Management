// Export waypoints to ZIP file for Topo GPS

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
function csvField(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function safeFolderName(name, id) {
  const folderName = String(name || "")
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "");
  return folderName && folderName !== "." && folderName !== ".." ? folderName : `Location-${id}`;
}

function hierarchyFolderPath(hierarchyId, hierarchyById) {
  const pathSegments = [];
  const visited = new Set();
  let current = hierarchyById.get(Number(hierarchyId));

  while (current && !visited.has(Number(current.id))) {
    visited.add(Number(current.id));
    pathSegments.unshift(safeFolderName(current.name, current.id));
    current = hierarchyById.get(Number(current.parent_id));
  }

  return pathSegments.join("/");
}

function waypointsToCsv(waypoints) {
  const rows = ["Name,Latitude,Longitude,Description,Reference URL"];
  for (const waypoint of waypoints) {
    rows.push([csvField(waypoint.name), waypoint.latitude, waypoint.longitude, csvField(waypoint.description), csvField(waypoint.reference_url)].join(","));
  }
  return `${rows.join("\r\n")}\r\n`;
}

async function buildZipBuffer(waypoints, hierarchies) {
  if (waypoints.length === 0) {
    throw new Error("No waypoints found to export");
  }

  const zip = new JSZip();
  const hierarchyById = new Map(hierarchies.map((hierarchy) => [Number(hierarchy.id), hierarchy]));
  const waypointsByFolder = new Map();

  for (const waypoint of waypoints) {
    const folderPath = waypoint.location_hierarchy_id ? hierarchyFolderPath(waypoint.location_hierarchy_id, hierarchyById) : "";
    if (!waypointsByFolder.has(folderPath)) {
      waypointsByFolder.set(folderPath, []);
    }
    waypointsByFolder.get(folderPath).push(waypoint);
  }

  for (const [folderPath, folderWaypoints] of waypointsByFolder) {
    const segments = folderPath.split("/").filter(Boolean);
    const locationName = segments.pop();
    const parentPath = segments.join("/");
    const csvName = locationName ? `${locationName}.csv` : "waypoints.csv";
    const csvPath = parentPath ? `${parentPath}/${csvName}` : csvName;
    zip.file(csvPath, waypointsToCsv(folderWaypoints));
  }

  zip.file("waypoints.json", JSON.stringify(waypoints, null, 2));
  zip.file(
    "README.txt",
    `Waypoint Export
=================
Generated on: ${new Date().toISOString()}
Total waypoints: ${waypoints.length}

CSV files are placed in folders matching the location hierarchy.
Import this ZIP archive directly into Topo GPS without extracting it to preserve the folder structure.

Each CSV contains: Name, Latitude, Longitude, Description, Reference URL.
`,
  );

  return zip.generateAsync({ type: "nodebuffer" });
}

async function createExportBuffer() {
  const waypointModel = require("../database/models/waypoint");
  const [waypoints, hierarchies] = await Promise.all([waypointModel.getAll(), waypointModel.getAllHierarchies()]);
  return buildZipBuffer(waypoints, hierarchies);
}

async function generateZip() {
  try {
    return await createExportBuffer();
  } catch (error) {
    console.error("Error generating ZIP:", error);
    throw new Error(`Failed to generate ZIP file: ${error.message}`);
  }
}

async function exportToFile() {
  try {
    const zipBuffer = await createExportBuffer();
    const exportPath = path.join(__dirname, "../../exports");
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }

    const filename = `waypoints-export-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`;
    const filePath = path.join(exportPath, filename);
    fs.writeFileSync(filePath, zipBuffer);
    return filePath;
  } catch (error) {
    console.error("Error exporting ZIP to file:", error);
    throw new Error(`Failed to export ZIP file: ${error.message}`);
  }
}

module.exports = {
  generateZip,
  exportToFile,
  buildZipBuffer,
};
