// Export waypoints to ZIP file for Topo GPS

const fs = require("fs");
const path = require("path");
const JSZip = require("jszip");
const topoGpsNamespace = "http://www.topo-gps.com/xmlschemas/TopoGPSExtension/v2";
const topoGpsStyles = {
  parking: {
    id: 1,
    symbol: "parking",
    fillColor: "#e6add8e6",
    strokeColor: "#ff073843",
  },
  photolocation: {
    id: 2,
    symbol: "attraction",
    fillColor: "#e6add8e6",
    strokeColor: "#ff073843",
  },
};

function xmlEscape(value) {
  return String(value ?? "").replace(
    /[<>&"']/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[character],
  );
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

function waypointsToGpx(waypoints) {
  const usedTypes = new Set(waypoints.map((waypoint) => waypoint.waypoint_type));
  const styles = Object.entries(topoGpsStyles).filter(([type]) => usedTypes.has(type));
  const metadata =
    styles.length > 0
      ? `<metadata><name>Waypoint Export</name><extensions>${styles.map(([type, style]) => `<topogps:wptStyle id="${style.id}"><topogps:icon><topogps:type>circle</topogps:type><topogps:size>large</topogps:size><topogps:fillColor>${style.fillColor}</topogps:fillColor><topogps:strokeColor>${style.strokeColor}</topogps:strokeColor><topogps:symbol>${style.symbol}</topogps:symbol></topogps:icon></topogps:wptStyle>`).join("")}</extensions></metadata>`
      : "";

  const points = waypoints
    .map((waypoint) => {
      const style = topoGpsStyles[waypoint.waypoint_type];
      const fields = [
        `<name>${xmlEscape(waypoint.name)}</name>`,
        waypoint.description ? `<desc>${xmlEscape(waypoint.description)}</desc>` : "",
        waypoint.reference_url ? `<url>${xmlEscape(waypoint.reference_url)}</url>` : "",
        waypoint.waypoint_type ? `<type>${xmlEscape(waypoint.waypoint_type)}</type>` : "",
        style ? `<extensions><topogps:wptStyleID>${style.id}</topogps:wptStyleID></extensions>` : "",
      ]
        .filter(Boolean)
        .join("");
      return `<wpt lat="${xmlEscape(waypoint.latitude)}" lon="${xmlEscape(waypoint.longitude)}">${fields}</wpt>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:topogps="${topoGpsNamespace}" version="1.1" creator="Waypoint Management" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.topo-gps.com/xmlschemas/TopoGPSExtension/v3 http://www.topo-gps.com/xmlschemas/TopoGPSExtensionv3.xsd">${metadata}${points}</gpx>`;
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
    const fileName = locationName ? `${locationName}.gpx` : "waypoints.gpx";
    const filePath = parentPath ? `${parentPath}/${fileName}` : fileName;
    zip.file(filePath, waypointsToGpx(folderWaypoints));
  }

  zip.file("waypoints.json", JSON.stringify(waypoints, null, 2));
  zip.file(
    "README.txt",
    `Waypoint Export
=================
Generated on: ${new Date().toISOString()}
Total waypoints: ${waypoints.length}

GPX files carry the waypoint icon symbols and type labels.
Files are placed in folders matching the location hierarchy.
Import this ZIP archive directly into Topo GPS without extracting it to preserve the folder structure.

Photolocations use the Topo GPS attraction icon; parking places use the parking icon.
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
