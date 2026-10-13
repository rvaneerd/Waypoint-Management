// Main web server for waypoint management

const express = require("express");
const path = require("path");
const waypointModel = require("../database/models/waypoint");
const zipExporter = require("../export/zip-export");

const app = express();
const configuredToastDuration = Number(process.env.SUCCESS_TOAST_DURATION_MS);
const successToastDurationMs = Number.isInteger(configuredToastDuration) && configuredToastDuration >= 0 ? configuredToastDuration : 1000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

// Serve the main page
app.get("/", async (req, res) => {
  try {
    const waypoints = await waypointModel.getAll(50, 0);
    const hierarchies = await waypointModel.getAllHierarchies();

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Waypoint Management</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .container { max-width: 1200px; margin: 0 auto; }
          .form-group { margin-bottom: 15px; }
          .coordinate-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 12px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, textarea, select { width: 100%; padding: 8px; box-sizing: border-box; }
          button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
          button:hover { background: #0056b3; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .success-toast { position: fixed; left: 50%; bottom: 20px; z-index: 1000; padding: 12px 18px; color: #fff; background: #167c5a; border-radius: 4px; opacity: 0; visibility: hidden; transform: translate(-50%, 8px); transition: opacity 150ms, transform 150ms, visibility 150ms; }
          .success-toast.is-visible { opacity: 1; visibility: visible; transform: translate(-50%, 0); }
          @media (max-width: 520px) { .coordinate-row { grid-template-columns: 1fr; } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Waypoint Management System</h1>
          
          <h2>Add New Waypoint</h2>
          <form id="waypointForm" action="/api/waypoints" method="POST">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" required>
            </div>
            
            <div class="coordinate-row">
              <div class="form-group">
                <label for="latitude">Latitude:</label>
                <input type="text" id="latitude" name="latitude" inputmode="decimal" autocomplete="off" maxlength="10" placeholder="51.123456" pattern="-?[0-9]{1,2}[.][0-9]{6}" required>
              </div>
              <div class="form-group">
                <label for="longitude">Longitude:</label>
                <input type="text" id="longitude" name="longitude" inputmode="decimal" autocomplete="off" maxlength="10" placeholder="5.123456" pattern="-?[0-9]{1,2}[.][0-9]{6}" required>
              </div>
              <div class="form-group">
                <label for="waypoint_type">Waypoint type:</label>
                <select id="waypoint_type" name="waypoint_type" disabled>
                  <option value="standard">Standard</option>
                  <option value="photolocation">Photolocation</option>
                  <option value="parking">Parking place</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label for="location_hierarchy_id">Location Hierarchy:</label>
              <select id="location_hierarchy_id" name="location_hierarchy_id" disabled>
                <option value="">Select a location</option>
                ${hierarchies.map((h) => `<option value="${h.id}">${"— ".repeat(h.level)}${h.name}</option>`).join("")}
              </select>
            </div>
            
            <div class="form-group">
              <label for="description">Description:</label>
              <textarea id="description" name="description"></textarea>
            </div>
            
            <div class="form-group">
              <label for="reference_url">Reference URL:</label>
              <input type="url" id="reference_url" name="reference_url">
            </div>

            <button type="submit">Add Waypoint</button>
          </form>

          <h2>Manage Locations</h2>
          <form id="hierarchyForm">
            <div class="form-group">
              <label for="hierarchyName">New location:</label>
              <input type="text" id="hierarchyName" name="name" required>
            </div>
            <div class="form-group">
              <label for="parentHierarchyId">Parent location (optional):</label>
              <select id="parentHierarchyId" name="parent_id">
                <option value="">Top level</option>
                ${hierarchies.map((h) => `<option value="${h.id}">${"— ".repeat(h.level)}${h.name}</option>`).join("")}
              </select>
            </div>
            <button type="submit">Create location</button>
          </form>
          
          <h2>Waypoints</h2>
          <table id="waypointTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Description</th>
                <th>Type</th>
                <th>Location</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${waypoints
                .map(
                  (w) => `
                <tr>
                  <td>${w.name}</td>
                  <td>${w.latitude}</td>
                  <td>${w.longitude}</td>
                  <td>${w.description || ""}</td>
                  <td>
                    <select aria-label="Type for ${w.name}" onchange="updateWaypointType(${w.id}, this.value)">
                      <option value="standard" ${w.waypoint_type === "standard" ? "selected" : ""}>Standard</option>
                      <option value="photolocation" ${w.waypoint_type === "photolocation" ? "selected" : ""}>Photolocation</option>
                      <option value="parking" ${w.waypoint_type === "parking" ? "selected" : ""}>Parking place</option>
                    </select>
                  </td>
                  <td>${w.location_name || "None"}</td>
                  <td>${new Date(w.created_at).toLocaleString()}</td>
                  <td><button onclick="deleteWaypoint(${w.id})">Delete</button></td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          
          <h2>Export Waypoints</h2>
          <button onclick="exportToZip()">Export as ZIP (Topo GPS)</button>
        </div>

        <div id="successToast" class="success-toast" role="status" aria-live="polite"></div>
        
        <script>
          const successToastDurationMs = ${successToastDurationMs};

          function showSuccessToast(message, onDismiss) {
            const toast = document.getElementById('successToast');
            toast.textContent = message;
            toast.classList.add('is-visible');
            window.setTimeout(() => {
              toast.classList.remove('is-visible');
              if (onDismiss) onDismiss();
            }, successToastDurationMs);
          }

          const locationSelect = document.getElementById('location_hierarchy_id');
          const waypointTypeSelect = document.getElementById('waypoint_type');
          const latitudeInput = document.getElementById('latitude');
          const longitudeInput = document.getElementById('longitude');

          function normalizeDecimalSeparator(input) {
            if (!input.value.includes(',')) {
              return;
            }

            const cursor = input.selectionStart ?? input.value.length;
            input.value = input.value.replace(/,/g, '.');
            input.setSelectionRange(cursor, cursor);
          }

          function validateCoordinate(input, min, max) {
            const value = input.value.trim();
            const matchesFormat = /^-?[0-9]{1,2}[.][0-9]{6}$/.test(value);
            const numericValue = Number(value);
            const isValid = matchesFormat && numericValue >= min && numericValue <= max;
            input.setCustomValidity(isValid || value === '' ? '' : 'Use decimal degrees with six decimals, for example 51.123456.');
            return isValid;
          }

          function updateLocationAvailability() {
            const latitudeValid = validateCoordinate(latitudeInput, -90, 90);
            const longitudeValid = validateCoordinate(longitudeInput, -180, 180);
            const coordinatesValid = latitudeValid && longitudeValid;
            locationSelect.disabled = !coordinatesValid;
            waypointTypeSelect.disabled = !coordinatesValid;
            return coordinatesValid;
          }

          function focusNextAfterInput(currentInput, nextInput, isValid) {
            requestAnimationFrame(() => {
              if (document.activeElement === currentInput && isValid()) {
                nextInput.focus();
              }
            });
          }

          latitudeInput.addEventListener('input', function() {
            normalizeDecimalSeparator(this);
            const isValid = validateCoordinate(this, -90, 90);
            updateLocationAvailability();
            if (isValid) {
              focusNextAfterInput(this, longitudeInput, () => validateCoordinate(latitudeInput, -90, 90));
            }
          });

          longitudeInput.addEventListener('input', function() {
            normalizeDecimalSeparator(this);
            validateCoordinate(this, -180, 180);
            if (updateLocationAvailability()) {
              focusNextAfterInput(this, waypointTypeSelect, updateLocationAvailability);
            }
          });

          updateLocationAvailability();
          const savedLocationId = localStorage.getItem('waypoint-last-location');
          if (savedLocationId && Array.from(locationSelect.options).some((option) => option.value === savedLocationId)) {
            locationSelect.value = savedLocationId;
          }
          locationSelect.addEventListener('change', function() {
            if (this.value) {
              localStorage.setItem('waypoint-last-location', this.value);
            } else {
              localStorage.removeItem('waypoint-last-location');
            }
          });

          document.getElementById('waypointForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            const selectedLocationId = locationSelect.value;
            
            try {
              const response = await fetch('/api/waypoints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              
              if (response.ok) {
                showSuccessToast('Waypoint added successfully!', () => window.location.reload());
                this.reset();
                updateLocationAvailability();
                locationSelect.value = selectedLocationId;
                if (selectedLocationId) {
                  localStorage.setItem('waypoint-last-location', selectedLocationId);
                }
              } else {
                const error = await response.json();
                alert('Error: ' + error.message);
              }
            } catch (error) {
              alert('Network error: ' + error.message);
            }
          });

          async function updateWaypointType(id, waypointType) {
            try {
              const response = await fetch('/api/waypoints/' + id + '/type', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ waypoint_type: waypointType })
              });
              if (!response.ok) {
                const error = await response.json();
                alert('Error: ' + error.message);
                window.location.reload();
              }
            } catch (error) {
              alert('Network error: ' + error.message);
              window.location.reload();
            }
          }

          document.getElementById('hierarchyForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const parentId = formData.get('parent_id');

            try {
              const response = await fetch('/api/hierarchies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: formData.get('name'),
                  parent_id: parentId || null
                })
              });

              const location = await response.json();
              if (!response.ok) {
                alert('Error: ' + location.message);
                return;
              }

              const label = '— '.repeat(location.level) + location.name;
              document.getElementById('location_hierarchy_id').add(new Option(label, location.id));
              document.getElementById('parentHierarchyId').add(new Option(label, location.id));
              document.getElementById('location_hierarchy_id').value = location.id;
              localStorage.setItem('waypoint-last-location', location.id);
              this.reset();
              alert('Location created successfully!');
            } catch (error) {
              alert('Network error: ' + error.message);
            }
          });
          
          async function deleteWaypoint(id) {
            if (confirm('Are you sure you want to delete this waypoint?')) {
              try {
                const response = await fetch('/api/waypoints/' + id, {
                  method: 'DELETE'
                });
                
                if (response.ok) {
                  alert('Waypoint deleted successfully!');
                  window.location.reload();
                } else {
                  const error = await response.json();
                  alert('Error: ' + error.message);
                }
              } catch (error) {
                alert('Network error: ' + error.message);
              }
            }
          }
          
          async function exportToZip() {
            try {
              const response = await fetch('/api/export/zip', {
                method: 'GET'
              });
              
              if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "waypoints.zip";
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
              } else {
                const error = await response.json();
                alert('Export failed: ' + error.message);
              }
            } catch (error) {
              alert('Network error during export: ' + error.message);
            }
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Error loading page: " + error.message);
  }
});

// API routes for waypoints
app.post("/api/waypoints", async (req, res) => {
  try {
    const waypoint = await waypointModel.create(req.body);
    res.json(waypoint);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/waypoints", async (req, res) => {
  try {
    const waypoints = await waypointModel.getAll();
    res.json(waypoints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/waypoints/:id", async (req, res) => {
  try {
    const waypoint = await waypointModel.getById(req.params.id);
    if (waypoint) {
      res.json(waypoint);
    } else {
      res.status(404).json({ message: "Waypoint not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/waypoints/:id", async (req, res) => {
  try {
    const waypoint = await waypointModel.update(req.params.id, req.body);
    res.json(waypoint);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.patch("/api/waypoints/:id/type", async (req, res) => {
  try {
    const waypoint = await waypointModel.updateWaypointType(req.params.id, req.body.waypoint_type);
    if (!waypoint) {
      return res.status(404).json({ message: "Waypoint not found" });
    }
    res.json(waypoint);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/waypoints/:id", async (req, res) => {
  try {
    await waypointModel.delete(req.params.id);
    res.json({ message: "Waypoint deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/hierarchies", async (req, res) => {
  try {
    const location = await waypointModel.createHierarchy(req.body.name, req.body.parent_id);
    res.status(201).json(location);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// API route for exporting as ZIP
app.get("/api/export/zip", async (req, res) => {
  try {
    // Set response headers for file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="waypoints.zip"');

    // Generate the ZIP content and send it directly as response
    const zipBuffer = await zipExporter.generateZip();
    res.send(zipBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Alternative endpoint for saving ZIP file to disk (for testing)
app.get("/api/export/zip/file", async (req, res) => {
  try {
    const filePath = await zipExporter.exportToFile();
    res.json({
      message: "ZIP file exported successfully",
      path: filePath,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = app;
