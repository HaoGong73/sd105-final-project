mapboxgl.accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v11',
  center: [ -97.1554247, 49.8813312 ],
  zoom: 11
});
const accessToken = 'pk.eyJ1IjoiaGFvZ29uZyIsImEiOiJja3A1a2tnNXgwNTk1Mm9ydzYzdnpoMnc3In0.nLCurZfPXsXgaO2snpAmrw';
const apiKey = 'y3HnuYNUAqAbaf7rmLl9';
const marker = new mapboxgl.Marker();
const originsList = document.querySelector('.origins');
const destinationsList = document.querySelector('.destinations');
const tripPlans = document.querySelector('.bus-container');
tripPlans.innerHTML = '';
originsList.innerHTML = '';
destinationsList.innerHTML = '';


const winnipegCenter = { lat: 49.8813312, lon: -97.1554247};
const oriGeoObj = { lat: 100, lon: 0 };
const desGeoObj = { lat: 100, lon: 0 };

const getTripPlan = async (oriGeo, desGeo) => {
  const url = `https://api.winnipegtransit.com/v3/trip-planner.json?api-key=${apiKey}&origin=geo/${oriGeo.lat},${oriGeo.lon}&destination=geo/${desGeo.lat},${desGeo.lon}&usage=long`;
  const response = await fetch(url);
  const data = await response.json();

  console.log(data.plans.length);
  if(data.plans.length === 0) {
    throw new Error('No response for this query.');
  }
  return data.plans;
}

const getGeoPoints = async function(address) {
  const targetUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${address}.json?access_token=${accessToken}&limit=10&bbox=-97.325875, 49.766204, -96.953987, 49.99275`;
  const response = await fetch(targetUrl);
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

const renderOneDesItemHTML = (originItem) => {
  destinationsList.innerHTML += 
    `<li class="des-item" data-lon="${originItem.lon}" data-lat="${originItem.lat}" >
      <div class="name">${originItem.name}</div>
      <div>${originItem.street}</div>
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
  // console.log(oriGeoObj);
})

destinationsList.addEventListener('click', (event) => {
  const listItem = event.target.closest('li');
  document.querySelectorAll('.des-item').forEach(item => {
    item.classList.remove('selected');
  })
  listItem.classList.add('selected');
  desGeoObj.lat = listItem.dataset.lat;
  desGeoObj.lon = listItem.dataset.lon;
  // console.log(desGeoObj);
})

// sort rules: least time, least walk, least transfer
const getOneOrgnazedPlan =(plan) => {
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
    if (segment.type === 'walk' && plan.length === steps.length + 1) {
      formatRoute.nextStop = 'your destination';
    } else if (segment.type === 'walk') {
      formatRoute.nextStop = `stop #${segment.to.stop.key} - ${segment.to.stop.name}`;
    }

    if (segment.type === 'walk') { sortRules.walkTime += segment.times.durations.total }
    if (segment.type === 'transfer') { 
      sortRules.transferTimes += 1;
      formatRoute.transferFrom = `#${segment.from.stop.key}-${segment.from.stop.name}`;
      formatRoute.transferTo = `#${segment.to.stop.key}-${segment.to.stop.name}`;
    }
    if (segment.type === 'ride') { 
      formatRoute.route = segment.route.key;
      formatRoute.name = segment.route.name;
      formatRoute.bus = segment.bus.key;
    }
    sortRules.totalTime += segment.times.durations.total;
    steps.push(formatRoute);
  })

  onePlan.push(steps);
  onePlan.push(sortRules);

  return onePlan;
}

const sortPlans = (plans) => {
  let newPlansArray = [];
  plans.forEach( plan => {
    newPlansArray.push(getOneOrgnazedPlan(plan.segments));
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

const displayPlans = (sortPlans) => {
  let tempHTML = '';
  let sortByTotalTime = sortPlans.sort((a,b) => {return a[1].totalTime - b[1].totalTime})
  for (let i = 0; i < 2; i++) {
    tempHTML += `<ul class="my-trip">`;
    tempHTML += renderOnePlanHTML(sortByTotalTime[i][0]);
    tempHTML += `</ul>`;
  }
  tripPlans.innerHTML = tempHTML;
}

document.querySelector('.plan-trip').addEventListener('click', (event) => {
  if(oriGeoObj.lat === 100) {
    alert('Please choose your start points')
    return;
  }
  if(desGeoObj.lat === 100) {
    alert('Please choose your destination')
    return;
  } 
  getTripPlan(oriGeoObj ,desGeoObj)
  .then(data => {return sortPlans(data)})
  .then(sortPlans => displayPlans(sortPlans))
  .catch(error => alert(error));
  originsList.innerHTML = '';
  destinationsList.innerHTML = '';
  oriGeoObj.lat = 100;
  desGeoObj.lat = 100;
})