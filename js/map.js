// Ensure Leaflet is loaded before using it
function loadLeafletScript() {
    return new Promise((resolve, reject) => {
        // Check if Leaflet is already loaded
        if (typeof L !== 'undefined') {
            resolve(L);
            return;
        }

        // Create Leaflet CSS link
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);

        // Create Leaflet script
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

        script.onload = () => {
            console.log('Leaflet library loaded successfully');
            // Wait a bit to ensure Leaflet is fully initialized
            setTimeout(() => {
                resolve(L);
            }, 100);
        };

        script.onerror = () => {
            console.error('Failed to load Leaflet library');
            reject(new Error('Leaflet library failed to load'));
        };

        document.head.appendChild(script);
    });
}

// Singleton pattern for map management
const MapInitializer = {
    _mapInstance: null,
    _isInitializing: false,

    async initialize() {
        // Prevent multiple simultaneous initializations
        if (this._isInitializing) {
            console.warn('Map is already being initialized');
            return this._mapInstance;
        }

        // If map already exists, return it
        if (this._mapInstance) {
            return this._mapInstance;
        }

        this._isInitializing = true;

        try {
            // Ensure Leaflet is loaded
            await loadLeafletScript();

            // Check if map container exists
            const mapContainer = document.getElementById('map');
            if (!mapContainer) {
                throw new Error('Map container not found');
            }

            // Remove any existing map
            if (mapContainer._leaflet_map) {
                mapContainer._leaflet_map.remove();
            }

            // Default location (India's center)
            const defaultLocation = [20.5937, 78.9629];

            // Create map
            const map = L.map('map', {
                center: defaultLocation,
                zoom: 5,
                attributionControl: true,
                zoomControl: true
            });

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: ' OpenStreetMap contributors'
            }).addTo(map);

            // Expose map and markers globally
            window.map = map;
            window.storyMarkers = window.storyMarkers || [];

            // Try to get browser location
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        map.setView([latitude, longitude], 10);
                    },
                    (error) => {
                        console.warn('Geolocation error:', error);
                    }
                );
            }

            // Store map instance
            this._mapInstance = map;
            return map;
        } catch (error) {
            console.error('Map initialization failed:', error);
            return null;
        } finally {
            this._isInitializing = false;
        }
    },

    getMap() {
        return this._mapInstance;
    }
};

// Modify MapManager to use MapInitializer
class MapManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.latitude = null;
        this.longitude = null;
        this.marker = null;
        this.initMap();
    }

    async initMap() {
        try {
            // Use MapInitializer to get or create map
            this.map = await MapInitializer.initialize();
            
            if (!this.map) {
                throw new Error('Failed to initialize map');
            }

            // Get location
            await this.getLocation();
            this.createMap();
            this.addLocationMarker();
            this.setupMapClickListener();
        } catch (error) {
            console.error('Error initializing map:', error);
            this.displayErrorMessage(error.message || 'Unable to initialize map. Please try again.');
        }
    }

    displayErrorMessage(message) {
        Swal.fire({
            title: 'Error',
            text: message,
            icon: 'error'
        });
    }

    async getLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                position => {
                    this.latitude = position.coords.latitude;
                    this.longitude = position.coords.longitude;
                    resolve();
                },
                error => {
                    // If geolocation fails, use a default location
                    this.latitude = 20.5937;
                    this.longitude = 78.9629;
                    resolve();
                }
            );
        });
    }

    createMap() {
        // Ensure map is created with valid coordinates
        const latitude = this.latitude || 20.5937;
        const longitude = this.longitude || 78.9629;

        // Create map with default or detected location
        this.map.setView([latitude, longitude], 13);
        
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        // Return the map for chaining or additional setup
        return this.map;
    }

    async fetchLocationDetails(latitude, longitude) {
        try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch location details');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching location details:', error);
            return {
                locality: 'Unknown Location',
                countryName: 'Unknown Country'
            };
        }
    }

    async addLocationMarker() {
        // Only add marker if we have a valid location
        if (!this.latitude || !this.longitude) return;

        this.marker = L.marker([this.latitude, this.longitude], {
            title: 'Your Location'
        }).addTo(this.map);

        try {
            const locationDetails = await this.fetchLocationDetails(this.latitude, this.longitude);
            this.displayLocationInfo(locationDetails);
        } catch (error) {
            console.error('Error getting location details:', error);
        }
    }

    displayLocationInfo(locationDetails) {
        const locationInfoContainer = document.getElementById('locationInfo') || this.createLocationInfoContainer();
        
        locationInfoContainer.innerHTML = `
            <div class="bg-blue-100 p-3 rounded-lg shadow-md">
                <h3 class="font-bold text-blue-800">Current Location</h3>
                <p class="text-blue-700">
                    <strong>City:</strong> ${locationDetails.locality || 'Unknown'}
                    <br>
                    <strong>Country:</strong> ${locationDetails.countryName || 'Unknown'}
                    <br>
                    <strong>Coordinates:</strong> ${this.latitude.toFixed(4)}, ${this.longitude.toFixed(4)}
                </p>
            </div>
        `;
    }

    createLocationInfoContainer() {
        const container = document.createElement('div');
        container.id = 'locationInfo';
        container.classList.add('mt-4');
        
        const mapContainer = document.querySelector('#map').closest('.bg-white');
        mapContainer.appendChild(container);
        
        return container;
    }

    setupMapClickListener() {
        if (!this.map) return;

        this.map.on('click', async (e) => {
            const clickLat = e.latlng.lat;
            const clickLng = e.latlng.lng;
            
            try {
                const locationDetails = await this.fetchLocationDetails(clickLat, clickLng);
                const aiManager = window.aiManager;
                
                if (aiManager) {
                    const context = await aiManager.getLocationContext(clickLat, clickLng);
                    const prompt = await aiManager.generateStoryPrompt({ lat: clickLat, lng: clickLng });
                    
                    this.displayAIResponse({
                        location: locationDetails,
                        context: context,
                        prompt: prompt,
                        coordinates: { lat: clickLat, lng: clickLng }
                    });
                }
            } catch (error) {
                console.error('Error processing map click:', error);
                this.displayErrorMessage('Unable to get location details. Please try again.');
            }
        });
    }

    displayAIResponse(data) {
        const aiResponseContainer = document.getElementById('aiResponse') || this.createAIResponseContainer();
        
        aiResponseContainer.innerHTML = `
            <div class="bg-green-100 p-4 rounded-lg shadow-md">
                <h3 class="font-bold text-green-800 mb-2">AI Location Insights</h3>
                <div class="text-green-700">
                    <p><strong>Location:</strong> ${data.location.locality || 'Unknown'}, ${data.location.countryName || 'Unknown'}</p>
                    <p><strong>Coordinates:</strong> ${data.coordinates.lat.toFixed(4)}, ${data.coordinates.lng.toFixed(4)}</p>
                    <p><strong>Location Type:</strong> ${data.context.type || 'Not Available'}</p>
                    <p><strong>Points of Interest:</strong> ${data.context.pointsOfInterest ? data.context.pointsOfInterest.join(', ') : 'None'}</p>
                    <div class="mt-3">
                        <strong>Story Prompt:</strong>
                        <p class="italic">"${data.prompt}"</p>
                    </div>
                </div>
                <button onclick="startStoryCreation(${data.coordinates.lat}, ${data.coordinates.lng})" 
                        class="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Start Writing Story
                </button>
            </div>
        `;
    }

    createAIResponseContainer() {
        const container = document.createElement('div');
        container.id = 'aiResponse';
        container.classList.add('mt-4');
        
        const mapContainer = document.querySelector('#map').closest('.bg-white');
        mapContainer.appendChild(container);
        
        return container;
    }

    addStoryMarker(story) {
        if (!this.map || !story.location) return;

        const storyMarker = L.marker([story.location.lat, story.location.lng], {
            title: story.title
        }).addTo(this.map);

        const popupContent = `
            <div class="p-2">
                <h3 class="font-bold">${story.title}</h3>
                <p class="text-sm">${story.description.substring(0, 100)}...</p>
                <p class="text-xs mt-2">Sentiment: ${story.sentiment}</p>
            </div>
        `;

        storyMarker.bindPopup(popupContent);
        this.markers.push(storyMarker);
        return storyMarker;
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            marker.remove();
        });
        this.markers = [];
    }

    updateMarkers(stories) {
        this.clearMarkers();
        stories.forEach(story => {
            this.addStoryMarker(story);
        });
    }

    // Method to enable location selection for story
    enableLocationSelection() {
        if (!window.map) {
            console.error('Map not initialized');
            return;
        }

        // Remove any existing click event listeners
        window.map.off('click');

        // Add click event to select location
        window.map.on('click', this.handleMapClick.bind(this));

        // Visual indication that location selection is active
        Swal.fire({
            title: 'Select Story Location',
            text: 'Click on the map to choose where your story takes place',
            icon: 'info',
            confirmButtonText: 'Ready to Select'
        });

        // Add a temporary marker to show selected location
        this.locationSelectionMarker = null;
    }

    // Function to get location details using reverse geocoding
    async getLocationDetails(lat, lng) {
        try {
            // Use OpenStreetMap Nominatim API for reverse geocoding
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch location details');
            }

            const data = await response.json();

            // Extract meaningful location information
            const locationInfo = {
                fullAddress: data.display_name || 'Unknown Location',
                city: data.address.city || data.address.town || data.address.village || 'Unknown City',
                country: data.address.country || 'Unknown Country',
                state: data.address.state || 'Unknown State',
                postalCode: data.address.postcode || ''
            };

            return locationInfo;
        } catch (error) {
            console.warn('Reverse geocoding error:', error);
            
            // Fallback location details
            return {
                fullAddress: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                city: 'Unknown City',
                country: 'Unknown Country',
                state: 'Unknown State',
                postalCode: ''
            };
        }
    }

    // Handle map click for location selection
    async handleMapClick(e) {
        const { lat, lng } = e.latlng;

        // Remove previous marker if exists
        if (this.locationSelectionMarker) {
            this.locationSelectionMarker.remove();
        }

        // Create new marker
        this.locationSelectionMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `
                    <div class="story-location-marker">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6">
                            <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
                        </svg>
                    </div>
                `,
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            })
        }).addTo(window.map);

        // Get location details
        const locationDetails = await this.getLocationDetails(lat, lng);

        // Prompt user to confirm location
        Swal.fire({
            title: 'Confirm Location',
            html: `
                <p><strong>Location:</strong> ${locationDetails.fullAddress}</p>
                <p><strong>City:</strong> ${locationDetails.city}</p>
                <p><strong>State:</strong> ${locationDetails.state}</p>
                <p><strong>Country:</strong> ${locationDetails.country}</p>
                <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Use This Location',
            cancelButtonText: 'Choose Another'
        }).then((result) => {
            if (result.isConfirmed) {
                // Store selected location with details
                this.selectedStoryLocation = {
                    latitude: lat,
                    longitude: lng,
                    ...locationDetails
                };

                // Trigger event to populate story form
                this.triggerStoryFormPopulation();

                // Remove location selection marker
                if (this.locationSelectionMarker) {
                    this.locationSelectionMarker.remove();
                }
            } else {
                // Remove marker if location not confirmed
                if (this.locationSelectionMarker) {
                    this.locationSelectionMarker.remove();
                }
            }
        });
    }

    // Trigger story form population with selected location
    triggerStoryFormPopulation() {
        // Create a custom event with location data
        const event = new CustomEvent('locationSelected', {
            detail: this.selectedStoryLocation
        });

        // Dispatch event to populate story form
        document.dispatchEvent(event);
    }
}

// Global function to get current location
function getCurrentLocation() {
    const map = MapInitializer.getMap();
    
    // If map exists and has a center, use its center
    if (map) {
        const center = map.getCenter();
        return {
            latitude: center.lat,
            longitude: center.lng,
            address: 'Current Map Center',
            city: 'Unknown',
            country: 'Unknown'
        };
    }

    // Fallback to default location
    return {
        latitude: 20.5937,
        longitude: 78.9629,
        address: 'India',
        city: 'Unknown',
        country: 'India'
    };
}

// Expose getCurrentLocation to global window object
window.getCurrentLocation = getCurrentLocation;

// Ensure map is initialized when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const map = await MapInitializer.initialize();
        
        // Initialize MapManager for additional functionality
        if (map) {
            const mapManager = new MapManager();
            window.mapManager = mapManager;
        }
    } catch (error) {
        console.error('Error during map initialization:', error);
    }
});

// Global function to start story creation
async function startStoryCreation(lat, lng) {
    try {
        // Fetch location details
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        
        let locationDetails = {
            locality: 'Unknown City',
            countryName: 'Unknown Country'
        };

        if (response.ok) {
            try {
                locationDetails = await response.json();
            } catch (parseError) {
                console.warn('Could not parse location details:', parseError);
            }
        }

        // Prepare comprehensive location object
        const selectedLocation = {
            latitude: lat,
            longitude: lng,
            address: `${locationDetails.locality || 'Unknown City'}, ${locationDetails.countryName || 'Unknown Country'}`,
            city: locationDetails.locality || 'Unknown',
            country: locationDetails.countryName || 'Unknown',
            administrativeArea: locationDetails.principalSubdivision || '',
            postalCode: locationDetails.postcode || ''
        };

        // Save to localStorage
        localStorage.setItem('selectedLocation', JSON.stringify(selectedLocation));

        // Display detailed location confirmation
        const confirmResult = await Swal.fire({
            title: 'Location Selected',
            html: `
                <div class="text-left">
                    <p><strong>Location:</strong> ${selectedLocation.address}</p>
                    <p><strong>Coordinates:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                    ${selectedLocation.administrativeArea ? `<p><strong>Administrative Area:</strong> ${selectedLocation.administrativeArea}</p>` : ''}
                    ${selectedLocation.postalCode ? `<p><strong>Postal Code:</strong> ${selectedLocation.postalCode}</p>` : ''}
                </div>
                <div class="mt-3">
                    <p>Would you like to start writing a story for this location?</p>
                </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Yes, Start Writing',
            cancelButtonText: 'Choose Another Location',
            reverseButtons: true
        });

        if (confirmResult.isConfirmed) {
            // Scroll to story form
            const storyForm = document.getElementById('storyForm');
            if (storyForm) {
                storyForm.scrollIntoView({ behavior: 'smooth' });
                
                // Optional: Focus on title input
                const titleInput = document.getElementById('title');
                if (titleInput) {
                    titleInput.focus();
                }

                // Optional: Prefill location in form
                const locationDisplay = document.getElementById('locationDisplay');
                if (locationDisplay) {
                    locationDisplay.textContent = selectedLocation.address;
                }
            }
        } else {
            // Clear localStorage if user wants to choose another location
            localStorage.removeItem('selectedLocation');
        }
    } catch (error) {
        console.error('Error in story creation location selection:', error);
        
        Swal.fire({
            title: 'Location Selection Error',
            text: 'We encountered an issue selecting the location. Please try again or choose a different spot on the map.',
            icon: 'error'
        });
    }
}

// Add global method to start location selection
window.startLocationSelection = () => {
    if (window.mapManager) {
        window.mapManager.enableLocationSelection();
    } else {
        console.error('Map Manager not initialized');
    }
}

// Add event listener for location selection in story form
document.addEventListener('DOMContentLoaded', () => {
    const locationSelectBtn = document.getElementById('selectLocationBtn');
    if (locationSelectBtn) {
        locationSelectBtn.addEventListener('click', window.startLocationSelection);
    }

    // Listen for location selection event
    document.addEventListener('locationSelected', (event) => {
        const { latitude, longitude } = event.detail;
        
        // Populate location inputs
        const latInput = document.getElementById('latitude');
        const lngInput = document.getElementById('longitude');
        
        if (latInput && lngInput) {
            latInput.value = latitude.toFixed(4);
            lngInput.value = longitude.toFixed(4);
        }
    });
});
