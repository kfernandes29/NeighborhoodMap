'use strict';

// API Keys
const GOOGLE_API_KEY = "AIzaSyA_CKZ8N8Oqjoa7jRcIcIWPVIXwMIVCK4E";
const FOURSQUARE_API_KEY = "D2GMFWAGMWC0A2NDN5JCFSZ2S31PZEVTWDN3IR2RHEG3A0UW";
const URL_BASE = "https://api.foursquare.com/v2/";
const MAP_CENTER = {
    lat: 43.647823,
    lng: -79.381653
};

var searchUrl = `${URL_BASE}venues/explore?ll=${MAP_CENTER.lat},${MAP_CENTER.lng}&section=topPicks&radius=5000&limit=50&oauth_token=${FOURSQUARE_API_KEY}&v=20180421`;

// Global Variables
var map, app;

// Location Model
var LocationModel = function(data) {
    var self = this;
    var infoWindow = new google.maps.InfoWindow();
    this.name = data.name;
    this.lat = data.location.lat;
    this.lng = data.location.lng
    this.visible = ko.observable(true);
    this.content = ko.observable("");
    this.venue_id = data.id;
    this.address = data.location.address;
    this.city = data.location.city;
    this.province = data.location.state;
    this.phone = data.contact.formattedPhone;
    this.url = data.url
    this.category = data.categories[0];
    this.content(`
            <p class="p-0 m-0">${this.address}</p>
            <p class="p-0 m-0 mb-2">${this.city} ${this.province}</p>
            <p class="p-0 m-0"><a class="text-dark" href="tel:${this.phone}">${this.phone}</a></p>
            <p class="p-0 m-0"><a class="text-dark" href="${this.url}" target="_new">${this.url}</a></p>
        `);
    this.marker = new google.maps.Marker({
        position: {
            lat: data.location.lat,
            lng: data.location.lng
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

        var unique = _.uniqWith(categories, _.isEqual);

        var sorted = _.sortBy(unique, 'name');

        sorted.unshift({id: 0, name: "All categories"});

        return sorted;

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
        self.category(0);
    }

};

function start() {

    map = new google.maps.Map($('#map')[0], {
        center: MAP_CENTER,
        zoom: 13
    });

    $.ajax({
        method: 'GET',
        url: searchUrl,
        success: function(result) {

            app = new AppViewModel();

            result.response.groups[0].items.forEach(item => {

                app.allLocations.push(new LocationModel(item.venue));

            });

            ko.applyBindings(app);

        },
        error: function(error) {
            alert('There was a problem connecting to the FourSquare API');
        }
    });

}
