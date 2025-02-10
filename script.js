// Initialize the map
var map = L.map('map').setView([37.108, -113.58], 15);

// Define Esri basemaps
var basemaps = {
    "Imagery": L.esri.basemapLayer('Imagery'),
    "Streets": L.esri.basemapLayer('Streets'),
    "Topographic": L.esri.basemapLayer('Topographic'),
    "Gray": L.esri.basemapLayer('Gray')
};

// Set default basemap
var currentBasemap = basemaps["Streets"];
currentBasemap.addTo(map);

// Function to switch basemaps (removes old layer before adding a new one)
function switchBasemap(newBasemapName) {
    if (currentBasemap) {
        map.removeLayer(currentBasemap);  // Remove the existing basemap
    }
    currentBasemap = basemaps[newBasemapName];
    currentBasemap.addTo(map);
}

// Create layer control
var layerControl = L.control.layers(basemaps, {}, {
    collapsed: false
}).addTo(map);

// Add custom change event to layer control
map.on('baselayerchange', function(e) {
    switchBasemap(e.name);
});

var geojsonLayer; // Store GeoJSON layer for filtering

// Load GeoJSON and add it to the map
fetch('shapes.geojson')
  .then(response => response.json())
  .then(data => {
    // Get the current year
    const currentYear = new Date().getFullYear();

    // Update the endDate property for each feature
    data.features.forEach(feature => {
      if (!feature.properties.endDate) {
        feature.properties.endDate = currentYear;
      }
    });

    // Sort features by the 'sort' property
    data.features.sort((a, b) => {
      if (a.properties.sort < b.properties.sort) return -1;
      if (a.properties.sort > b.properties.sort) return 1;
      return 0;
    });

    // Function to filter by year
    function filterByYear(year) {
      if (geojsonLayer) {
        map.removeLayer(geojsonLayer);
      }

      // Clear the existing feature list
      const featureList = document.getElementById('featureList');
      featureList.innerHTML = '';

      geojsonLayer = L.geoJSON(data, {
        filter: function(feature) {
          return feature.properties.startDate <= year && feature.properties.endDate >= year;
        },
        style: function(feature) {
          return { color: "red", weight: 2, fillOpacity: 0.5 }; // Ensure polygons are styled with fillOpacity
        },
        pointToLayer: function(feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: "blue",
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: function(feature, layer) {
          if (feature.properties && feature.properties.name) {
            const popupContent = `
              <b><a href="${feature.properties.PID}" target="_blank">${feature.properties.name}</a></b><br>
              Start Date: ${feature.properties.startDate}<br>
              End Date: ${feature.properties.endDate}
            `;
            layer.bindPopup(popupContent);

            // Add feature to the sidebar
            const listItem = document.createElement('li');
            listItem.innerHTML = feature.properties.name;
            listItem.dataset.name = feature.properties.name.toLowerCase(); // Store the name in lowercase for search
            listItem.addEventListener('click', function() {
              let latlng;
              if (layer.getLatLng) {
                latlng = layer.getLatLng();
              } else if (layer.getBounds) {
                latlng = layer.getBounds().getCenter();
              }
              map.setView(latlng, 15);
              layer.openPopup();
            });
            featureList.appendChild(listItem);
          }
        }
      }).addTo(map);
    }

    // Get slider and input elements
    const slider = document.getElementById("yearSlider");
    const yearInput = document.getElementById("yearInput");
    const searchBox = document.getElementById("searchBox");

    // Set initial input value from the slider's default value
    yearInput.value = slider.value;

    // Event listener to update input and filter map when slider changes
    slider.addEventListener("input", function() {
        yearInput.value = this.value; // Update input dynamically
        filterByYear(parseInt(this.value)); // Update map based on selected year
    });

    // Event listener to update slider and filter map when input changes
    yearInput.addEventListener("input", function() {
        const year = parseInt(this.value);
        if (!isNaN(year) && year >= 1850 && year <= 1950) {
            slider.value = year; // Update slider dynamically
            filterByYear(year); // Update map based on entered year
        } else {
            // Reset to the closest valid value if out of range
            if (year < 1850) {
                yearInput.value = 1850;
                slider.value = 1850;
            } else if (year > 1950) {
                yearInput.value = 1950;
                slider.value = 1950;
            }
        }
    });

    // Event listener to filter the feature list based on search input
    searchBox.addEventListener("input", function() {
        const searchTerm = this.value.toLowerCase();
        const listItems = document.querySelectorAll("#featureList li");
        listItems.forEach(item => {
            if (item.dataset.name.includes(searchTerm)) {
                item.style.display = "";
            } else {
                item.style.display = "none";
            }
        });
    });

    // Initialize with default year
    filterByYear(parseInt(slider.value));
  })
  .catch(error => console.error("Error loading GeoJSON:", error));