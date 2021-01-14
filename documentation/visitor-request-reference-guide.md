# Visitor Request Reference Guide

The event object provided to your override's `compute(event)` function has a `visitor` attribute which contains properties about the user who made the request to your page. Below are the visitor properties that you can access:

* city `string` 
  * City of incoming request, e.g. "San Juan".

* colo `string`
  * The three-letter airport code of the data center that the request hit, e.g. "DUB".

* continent: `string` 
  * Continent of incoming request, e.g. "Asia".

* country: `string` 
  * Country of incoming request. This is a two-letter country code in the request, e.g. "CA".

* device: `string` 
  * Mobile, tablet, desktop of incoming request, e.g. "mobile".

* latitude: `string`
  * Latitude of incoming request, e.g. "30.51540".

* longitude: `string`
  * Longitude of incoming request, e.g. "-97.66890".

* metroCode: `string`
  * Metro code of incoming request, e.g. "635".

* postalCode: `string`
  * Postal code of incoming request, e.g. "78665".

* region: `string`
  * the [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2) name for the first level region associated with the IP address of the incoming request, e.g. "Texas".

* regionCode: `string`
  * the [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2) name for the first level region abbreviation associated with the IP address of the incoming request, e.g. "TX".

* timezone `string`
  * Timezone of incoming request, e.g. "America/Chicago".
