'use strict';

// Constants
const GOOGLE_API_KEY = "AIzaSyA_CKZ8N8Oqjoa7jRcIcIWPVIXwMIVCK4E";
const FOURSQUARE_API_KEY = "D2GMFWAGMWC0A2NDN5JCFSZ2S31PZEVTWDN3IR2RHEG3A0UW";
const URL_BASE = "https://api.foursquare.com/v2/";
const MAP_CENTER = {
    lat: 43.647823,
    lng: -79.381653
};
const searchUrl = `${URL_BASE}venues/explore?ll=${MAP_CENTER.lat},${MAP_CENTER.lng}&section=recommended&radius=5000&limit=50&oauth_token=${FOURSQUARE_API_KEY}&v=20180421`;

// Global Variables
var map, app;

// Location Model
var LocationModel = function(data) {

    var self = this;

    // Initialize one single info window for each marker
    var infoWindow = new google.maps.InfoWindow();

    // Initialize model with properties
    this.id = data.id ? data.id : "0";
    this.name = data.name ? data.name : "";
    this.location = data.location ? data.location : {};
    this.contact = data.contact ? data.contact : {};
    this.url = data.url ? data.url : "No website";
    this.category = data.categories[0] ? data.categories[0] : {};
    this.rating = data.rating ? data.rating : "No rating information";
    this.open_status = data.hours ? data.hours.status : "No information about hours of operation";
    this.visible = ko.observable(true);

    // Create a marker for this location
    this.marker = new google.maps.Marker({
        id: this.id,
        position: {
            lat: this.location.lat,
            lng: this.location.lng
        }
    });

    // Add click event listener for marker
    this.marker.addListener('click', function() {

        infoWindow.setContent(`
        <div class="info-window p-2">
            <h4 class="b-3">${self.name}</h4>
            <p class="p-0 m-0">Rating: ${self.rating}</p>
        </div>
        `);

        // Open info window
        infoWindow.open(map, this);

        // Animate marker with a bounce
        self.marker.setAnimation(google.maps.Animation.BOUNCE);

        // Stop bounce animation after 1 second
        setTimeout(function() {
            self.marker.setAnimation(null);
        }, 1000);
    });

    // Toggle Marker Visibility
    this.toggleMarkerVisible = ko.computed(function() {
        // If the visible property is true, set the marker map
        if (this.visible() === true) {
            self.marker.setMap(map);
        } else {
            self.marker.setMap(null);
        }
    }, self);

};

// AppViewModel
function AppViewModel() {

    var self = this;

    this.nameFilter = ko.observable("");
    this.categoryFilter = ko.observable("");
    this.allLocations = ko.observableArray([]);

    // All categories for locations
    this.allCategories = ko.computed(function() {

        // Get category from each location and create an array
        var categories = _.map(self.allLocations(), function(location) {
            return location.category;
        });

        // Get unique categories from array
        var unique = _.uniqWith(categories, _.isEqual);

        // Sort by name
        var sorted = _.sortBy(unique, 'name');

        // Add an 'All Categories' option at index 0
        sorted.unshift({id: 0, name: "All categories"});

        // Return sorted+unique categories
        return sorted;

    });

    // Filtered locations
    this.filteredLocations = ko.computed(function() {

        // Get name filter
        var filterString = self.nameFilter().toLowerCase();

        // Return array of filtered locations
        var filtered = _.filter(self.allLocations(), function(location) {

            // If category filter is set
            if ( self.categoryFilter() != 0 ) {
                // Return locations from specified category with name filter
                return _.startsWith(location.name.toLowerCase(), filterString) && location.category.id === self.categoryFilter();
            }

            // Return locations from all categories with name filter
            return _.startsWith(location.name.toLowerCase(), filterString);

        });

        // Hide each location's marker
        _.each(self.allLocations(), function(location) {
            location.visible(false);
        });

        // Set map bounds
        var bounds = new google.maps.LatLngBounds();

        // For each filtered result
        _.each(filtered, function(location) {
            // Set marker visibility to true
            location.visible(true);
            // Extend map bounds to fit marker
            bounds.extend(location.marker.position);
        });

        // Fit map to bounds
        map.fitBounds(bounds);

        // Get zoom level of map
        var zoom = map.getZoom();

        // If map zoom is set too high, set it to 15
        map.setZoom(zoom > 15 ? 15 : zoom);

        // Return filtered locations sorted by name
        return _.sortBy(filtered, 'name');

    }, self);

    // Show the info window
    this.showInfoWindow = function(location) {
        location.visible(true);
        google.maps.event.trigger(location.marker, 'click');
    }

    // Show markers on map
    this.showMarkers = function() {
        self.filteredLocations().forEach(location => {
            location.visible(true);
        });
    }

    // Hide markers on map
    this.hideMarkers = function() {
        self.filteredLocations().forEach(location => {
            location.visible(false);
        });
    }

    // Clear location filters
    this.clearFilters = function() {
        self.nameFilter("");
        self.categoryFilter(0);
    }

};

// Callback function to get the whole thing started!
function start() {

    // Initialize map
    map = new google.maps.Map($('#map')[0], {
        center: MAP_CENTER,
        zoom: 13
    });

    // Get locations from FourSquare API using AJAX call
    $.ajax({
        method: 'GET',
        url: searchUrl,
        success: function(result) {

            // Init AppViewModel
            app = new AppViewModel();

            // For each location returned from FourSquare
            result.response.groups[0].items.forEach(item => {

                // Create a new LocationModel and add it to app locations
                app.allLocations.push(new LocationModel(item.venue));

            });

            // Apply KnockOut bindings
            ko.applyBindings(app);

        },
        error: function(error) {
            alert('There was a problem connecting to the FourSquare API');
        }
    });

}
