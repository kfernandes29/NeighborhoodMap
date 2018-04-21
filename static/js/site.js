'use strict';

// API Keys
const GOOGLE_API_KEY = "AIzaSyA_CKZ8N8Oqjoa7jRcIcIWPVIXwMIVCK4E";
const FOURSQUARE_API_KEY = "D2GMFWAGMWC0A2NDN5JCFSZ2S31PZEVTWDN3IR2RHEG3A0UW";
const FOURSQUARE_API_BASE = "https://api.foursquare.com/v2/";

// Global Variables
var map, app;

// Initial Locations to show on map
var initialLocations = [{
        name: "Rogers Centre",
        lat: 43.6414378,
        lng: -79.3915419
    },
    {
        name: "Air Canada Center",
        lat: 43.6434661,
        lng: -79.3812876
    },
    {
        name: "BMO Field",
        lat: 43.6332226,
        lng: -79.4207509
    },
    {
        name: "AGO (Art Gallery of Ontario)",
        lat: 43.6536066,
        lng: -79.394701
    },
    {
        name: "Royal Ontario Museum",
        lat: 43.6677097,
        lng: -79.3969658
    },
    {
        name: "Ripley's Aquarium of Canada",
        lat: 43.642403,
        lng: -79.3881597
    },
    {
        name: "CN Tower",
        lat: 43.6425662,
        lng: -79.3892455
    },
    {
        name: "Ricoh Colliseum",
        lat: 43.6356272,
        lng: -79.4172187
    }
];

// Location Model
var LocationModel = function(data) {
    var self = this;
    var infoWindow = new google.maps.InfoWindow();
    this.venue_id = "";
    this.name = data.name;
    this.lat = data.lat;
    this.lng = data.lng
    this.address = "";
    this.city = "";
    this.province = "";
    this.phone = "";
    this.url = "";
    this.visible = ko.observable(true);
    this.content = ko.observable("");
    this.marker = new google.maps.Marker({
        position: {
            lat: data.lat,
            lng: data.lng
        }
    });
    this.marker.addListener('click', function() {
        infoWindow.setContent(`
        <div class="info-window p-4">
            <h4 class="b-3">${self.name}</h4>
        </div>
        `);
        infoWindow.open(map, this);
        self.marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function() {
            self.marker.setAnimation(null);
        }, 1000);
    });
    this.toggleMarkerVisible = ko.computed(function() {
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

    this.filter = ko.observable("");
    this.category = ko.observable("");
    this.allLocations = ko.observableArray([]);
    this.allCategories = ko.computed(function() {

        var categories = _.map(self.allLocations(), function(location) {
            return location.category;
        });

        categories.push({id: 0, name: "All categories"});

        var unique = _.uniqWith(categories, _.isEqual);

        return _.sortBy(unique, 'name');

    });

    this.filteredLocations = ko.computed(function() {

        var bounds = new google.maps.LatLngBounds();

        var filterString = self.filter().toLowerCase();

        var filtered = _.filter(self.allLocations(), function(location) {

            if ( self.category() != 0 ) {
                return _.startsWith(location.name.toLowerCase(), filterString) && location.category.id === self.category();
            }

            return _.startsWith(location.name.toLowerCase(), filterString);

        });

        _.each(self.allLocations(), function(location) {
            location.visible(false);
        });

        _.each(filtered, function(location) {
            location.visible(true);
            bounds.extend(location.marker.position);
        });

        map.fitBounds(bounds);
        var zoom = map.getZoom();
        map.setZoom(zoom > 13 ? 13 : zoom);

        return _.sortBy(filtered, 'name');

    }, self);

    this.showInfoWindow = function(location) {
        location.visible(true);
        google.maps.event.trigger(location.marker, 'click');
    }

    this.showMarkers = function() {
        self.filteredLocations().forEach(location => {
            location.visible(true);
        });
    }

    this.hideMarkers = function() {
        self.filteredLocations().forEach(location => {
            location.visible(false);
        });
    }

    this.clearNameFilter = function() {
        self.filter("");
    }

};

function start() {

    map = new google.maps.Map($('#map')[0], {
        center: {
            lat: 43.6565353,
            lng: -79.6010328
        },
        zoom: 10
    });

    app = new AppViewModel();

    initialLocations.forEach(location => {

        var model = new LocationModel(location);

        $.ajax({
            method: "GET",
            url: `${FOURSQUARE_API_BASE}venues/search?name=${model.name}&ll=${model.lat},${model.lng}&oauth_token=${FOURSQUARE_API_KEY}&intent=match&v=20180419`,
            success: function(result) {

                var venue = result.response.venues[0];

                model.venue_id = venue.id;
                model.address = venue.location.address;
                model.city = venue.location.city;
                model.province = venue.location.state;
                model.phone = venue.contact.formattedPhone;
                model.url = venue.url;
                model.content(`
                        <p class="p-0 m-0">${model.address}</p>
                        <p class="p-0 m-0 mb-2">${model.city} ${model.province}</p>
                        <p class="p-0 m-0"><a class="text-dark" href="tel:${model.phone}">${model.phone}</a></p>
                        <p class="p-0 m-0"><a class="text-dark" href="${model.url}" target="_new">${model.url}</a></p>
                    `);
                model.category = venue.categories[0];

                app.allLocations.push(model);

            }
        });
    });

    ko.applyBindings(app);

}
