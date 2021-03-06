mapboxgl.accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [-97.1554247, 49.8890312 ], // lon , lat [-97.1554247, 49.8890312 ] [ -97.0, 49.8890312 ]
  zoom: 10.3
});
const markerOri = new mapboxgl.Marker({ color: "#00FF7F" });
const markerDes = new mapboxgl.Marker({ color: "#FF0000" });
const accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const apiKey = 'y3HnuYNUAqAbaf7rmLl9';
const originsList = document.querySelector('.origins');
const destinationsList = document.querySelector('.destinations');
const tripPlans = document.querySelector('.bus-container');
tripPlans.innerHTML = '';
originsList.innerHTML = '';
destinationsList.innerHTML = '';

const oriGeoObj = { lat: 0, lon: 100 };
const desGeoObj = { lat: 0, lon: 100 };

const getTripPlan = async (oriGeo, desGeo) => {
  const url = `https://api.winnipegtransit.com/v3/trip-planner.json?api-key=${apiKey}&origin=geo/${oriGeo.lat},${oriGeo.lon}&destination=geo/${desGeo.lat},${desGeo.lon}&usage=long`;
  const response = await fetch(url);
  const data = await response.json();

  if(data.plans.length === 0) {
    throw new Error('No response for this query.');
  }
  return data.plans;
}

const getGeoPoints = async function(address) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${accessToken}&limit=10&bbox=-97.325875, 49.766204, -96.953987, 49.99275`;
  const response = await fetch(url);
  const data = await response.json();

  return data.features;
};

const renderOneOriItemHTML = (originItem) => {
  originsList.innerHTML += 
    `<li class="ori-item" data-lon="${originItem.lon}" data-lat="${originItem.lat}" >
      <div class="name">${originItem.name}</div>
      <div>${originItem.street}</div>
    </li>`
}

const renderOriListHTML = (oriListArray) => {
  originsList.innerHTML = '';
  oriListArray.forEach(element => {
    renderOneOriItemHTML(element);
  });
}

const renderOneDesItemHTML = (desginItem) => {
  destinationsList.innerHTML += 
    `<li class="des-item" data-lon="${desginItem.lon}" data-lat="${desginItem.lat}" >
      <div class="name">${desginItem.name}</div>
      <div>${desginItem.street}</div>
    </li>`
}

const renderDesListHTML = (desListArray) => {
  destinationsList.innerHTML = '';
  desListArray.forEach(element => {
    renderOneDesItemHTML(element);
  });
}

const prepareListObj = (data) => {
  let listArray = [];
  data.forEach( item => {
    let itemObj = {};
    itemObj.lon = item.center[0];
    itemObj.lat = item.center[1];
    itemObj.name = item.text;
    itemObj.street = item.properties.address;

    listArray.push(itemObj);
  })

  return listArray;
}

document.forms[0].addEventListener('submit', (event) => {
  event.preventDefault();
  getGeoPoints(event.target[0].value)
  .then(data => {return prepareListObj(data)})
  .then(listArray => renderOriListHTML(listArray))
  event.target[0].value = '';
  tripPlans.innerHTML = '';
})

document.forms[1].addEventListener('submit', (event) => {
  event.preventDefault();
  getGeoPoints(event.target[0].value)
  .then(data => {return prepareListObj(data)})
  .then(listArray => renderDesListHTML(listArray))
  event.target[0].value = '';
})

originsList.addEventListener('click', (event) => {
  const listItem = event.target.closest('li');
  document.querySelectorAll('.ori-item').forEach(item => {
    item.classList.remove('selected');
  })
  listItem.classList.add('selected');
  oriGeoObj.lat = listItem.dataset.lat;
  oriGeoObj.lon = listItem.dataset.lon;
  markerOri.setLngLat([oriGeoObj.lon, oriGeoObj.lat]).addTo(map);
  clearRouteOnMap();
})

destinationsList.addEventListener('click', (event) => {
  const listItem = event.target.closest('li');
  document.querySelectorAll('.des-item').forEach(item => {
    item.classList.remove('selected');
  })
  listItem.classList.add('selected');
  desGeoObj.lat = listItem.dataset.lat;
  desGeoObj.lon = listItem.dataset.lon;
  markerDes.setLngLat([desGeoObj.lon, desGeoObj.lat]).addTo(map);
  clearRouteOnMap();
})

// sort rules: least time, least walk, least transfer
const getOneOrgnaizedPlan =(plan) => {
  let onePlan = [];
  let steps = [];
  let sortRules = {};
  sortRules.totalTime = 0;
  sortRules.walkTime = 0;
  sortRules.transferTimes = 0;
  
  plan.forEach(segment => {
    let formatRoute = {};
    formatRoute.type = segment.type;
    formatRoute.time = segment.times.durations.total;

    if (segment.type === 'walk') {
      if (plan.length !== steps.length + 1) {
        formatRoute.nextStop = `stop #${segment.to.stop.key} - ${segment.to.stop.name}`;
      } else {
        formatRoute.nextStop = 'your destination';
      }
      sortRules.walkTime += segment.times.durations.total;
    }
    if (segment.type === 'transfer') { 
      sortRules.transferTimes += 1;
      formatRoute.transferFrom = `#${segment.from.stop.key}-${segment.from.stop.name}`;
      formatRoute.transferTo = `#${segment.to.stop.key}-${segment.to.stop.name}`;
    }
    if (segment.type === 'ride') { 
      formatRoute.route = segment.route.key;
      formatRoute.name = segment.route.name;
    }
    sortRules.totalTime += segment.times.durations.total;
    steps.push(formatRoute);
  })

  onePlan.push(steps);
  onePlan.push(sortRules);

  return onePlan;
}

const rebuildPlansArray = (plans) => {
  let newPlansArray = [];
  plans.forEach( plan => {
    newPlansArray.push(getOneOrgnaizedPlan(plan.segments));
  })
  return newPlansArray;
}

const renderOnePlanHTML = (plan) => {
  let tripPlanHTML = '';

  plan.forEach(steps => {
    if(steps.type === 'walk') {
      tripPlanHTML += 
      `<li>
      <i class="fas fa-walking" aria-hidden="true"></i>Walk for ${steps.time} minutes
      to ${steps.nextStop}
      </li>`;
    }
    if(steps.type === 'transfer') {
      tripPlanHTML += 
      `<li>
      <i class="fas fa-ticket-alt" aria-hidden="true"></i>Transfer from stop
      ${steps.transferFrom} to stop ${steps.transferTo}
      </li>`;
    }
    if(steps.type === 'ride') {
      tripPlanHTML += 
      `<li>
        <i class="fas fa-bus" aria-hidden="true"></i>Ride the Route ${steps.route}
        ${steps.name} for ${steps.time} minutes.
      </li>`;
    }
  })
  return tripPlanHTML;
}

const displayTop2Plans = (unsortedPlans) => {
  let tempHTML = '';
  // in this case I chose the rule : least time
  let sortByTotalTime = unsortedPlans.sort((a,b) => {return a[1].totalTime - b[1].totalTime})
  for (let i = 0; i < 2; i++) {
    tempHTML += `<ul class="my-trip">`;
    tempHTML += renderOnePlanHTML(sortByTotalTime[i][0]);
    tempHTML += `</ul>`;
  }
  tripPlans.innerHTML = tempHTML;
}

const getRoute = async (oriPoint, desPoint) => {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${oriPoint.lon},${oriPoint.lat};${desPoint.lon},${desPoint.lat}?steps=true&geometries=geojson&access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();

  return data.routes;
}

const clearRouteOnMap = () => {
  let route = [];
  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route
    }
  };

  if (map.getSource('route')) {
    map.getSource('route').setData(geojson);
  }
}

const drawLineForRoute = (data) => {
  // route array item'structure : [-97.226806, 49.902397]
  const route = data[0].geometry.coordinates;
  // in order to make the route line consistant
  route.unshift([oriGeoObj.lon, oriGeoObj.lat]);
  route.push([desGeoObj.lon, desGeoObj.lat]);
  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route
    }
  };

  if (map.getSource('route')) {
    map.getSource('route').setData(geojson);
  } else { 
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geojson
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#3887be',
        'line-width': 5,
        'line-opacity': 0.8
      }
    });
  }
} 

const drawRouteOnMap = () => {
  getRoute(oriGeoObj, desGeoObj)
  .then(data => drawLineForRoute(data))
  .catch(error => console.log(error));
}

document.querySelector('.plan-trip').addEventListener('click', (event) => {
  if(oriGeoObj.lon === 100) {
    alert('Please choose your start points')
    return;
  }
  if(desGeoObj.lon === 100) {
    alert('Please choose your destination')
    return;
  } 
  drawRouteOnMap();
  getTripPlan(oriGeoObj ,desGeoObj)
  .then(data => {return rebuildPlansArray(data)})
  .then(unsortedPlansArray => displayTop2Plans(unsortedPlansArray))
  .catch(error => alert(error));
  originsList.innerHTML = '';
  destinationsList.innerHTML = '';
  map.flyTo({center: [-97.0, 49.8890312 ]});
})