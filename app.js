mapboxgl.accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-97.1384, 49.8951],
  zoom: 10
});
const accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const marker = new mapboxgl.Marker();
