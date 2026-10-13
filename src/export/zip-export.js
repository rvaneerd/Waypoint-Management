// Export waypoints to ZIP file for Topo GPS

const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const waypointModel = require('../database/models/waypoint');

async function generateZip() {
  try {
    // Get all waypoints
    const waypoints = await waypointModel.getAll();
    
    if (waypoints.length === 0) {
      throw new Error('No waypoints found to export');
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Add waypoints as CSV
    let csvContent = 'Name,Latitude,Longitude,Description,Reference URL\n';
    waypoints.forEach(waypoint => {
      csvContent += `"${waypoint.name}",${waypoint.latitude},${waypoint.longitude},"${waypoint.description || ''}","${waypoint.reference_url || ''}"\n`;
    });
    
    zip.file('waypoints.csv', csvContent);

    // Add waypoints as JSON
    const jsonContent = JSON.stringify(waypoints, null, 2);
    zip.file('waypoints.json', jsonContent);

    // Add readme file with information about the export
    const readmeContent = `Waypoint Export
=================
Generated on: ${new Date().toISOString()}
Total waypoints: ${waypoints.length}

This ZIP archive contains:
- waypoints.csv: All waypoints in CSV format
- waypoints.json: All waypoints in JSON format

Format details:
- Name: Waypoint name
- Latitude: Decimal latitude coordinate
- Longitude: Decimal longitude coordinate
- Description: Optional description
- Reference URL: Optional reference link

For Topo GPS import, use the CSV file.
`;
    
    zip.file('README.txt', readmeContent);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    return zipBuffer;
  } catch (error) {
    console.error('Error generating ZIP:', error);
    throw new Error(`Failed to generate ZIP file: ${error.message}`);
  }
}

async function exportToFile() {
  try {
    // Get all waypoints
    const waypoints = await waypointModel.getAll();
    
    if (waypoints.length === 0) {
      throw new Error('No waypoints found to export');
    }

    // Create a new JSZip instance
    const zip = new JSZip();

    // Add waypoints as CSV
    let csvContent = 'Name,Latitude,Longitude,Description,Reference URL\n';
    waypoints.forEach(waypoint => {
      csvContent += `"${waypoint.name}",${waypoint.latitude},${waypoint.longitude},"${waypoint.description || ''}","${waypoint.reference_url || ''}"\n`;
    });
    
    zip.file('waypoints.csv', csvContent);

    // Add waypoints as JSON
    const jsonContent = JSON.stringify(waypoints, null, 2);
    zip.file('waypoints.json', jsonContent);

    // Add readme file with information about the export
    const readmeContent = `Waypoint Export
=================
Generated on: ${new Date().toISOString()}
Total waypoints: ${waypoints.length}

This ZIP archive contains:
- waypoints.csv: All waypoints in CSV format
- waypoints.json: All waypoints in JSON format

Format details:
- Name: Waypoint name
- Latitude: Decimal latitude coordinate
- Longitude: Decimal longitude coordinate
- Description: Optional description
- Reference URL: Optional reference link

For Topo GPS import, use the CSV file.
`;
    
    zip.file('README.txt', readmeContent);

    // Generate ZIP and write to file
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    
    const exportPath = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }
    
    const filename = `waypoints-export-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;
    const filePath = path.join(exportPath, filename);
    
    fs.writeFileSync(filePath, zipBuffer);
    
    return filePath;
  } catch (error) {
    console.error('Error exporting ZIP to file:', error);
    throw new Error(`Failed to export ZIP file: ${error.message}`);
  }
}

module.exports = {
  generateZip,
  exportToFile
};