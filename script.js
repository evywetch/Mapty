'use strict';
const form = document.querySelector('.form');
const workoutsContainer = document.querySelector('.workouts');
const inputType = document.querySelector('.form_input_type');
const inputDistance = document.querySelector('.form_input_distance');
const inputDuration = document.querySelector('.form_input_duration');
const inputCadence = document.querySelector('.form_input_cadence');
const inputElevation = document.querySelector('.form_input_elevation');

// Parent class
class Workout {
  coords; // [latitude, longitude]
  distance; // km
  duration; // min
  date = new Date();
  // Create an id, take the last 10 numbers from the Date
  id = (Date.now() + '').slice(-10);
  constructor(coords, type, distance, duration) {
    this.coords = coords;
    this.type = type;
    this.distance = distance;
    this.duration = duration;
    this._setDescription();
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'Auguast',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}
// Child class
class Running extends Workout {
  cadence; // in spm
  pace; // in min/km
  constructor(coords, type, distance, duration, cadence) {
    super(coords, type, distance, duration);
    this.cadence = cadence;
    this.calcPace();
  }

  calcPace() {
    // in min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// Child class
class Cycling extends Workout {
  elevation; // in m
  speed; // in km/h
  constructor(coords, type, distance, duration, elevation) {
    super(coords, type, distance, duration);
    this.elevation = elevation;
    this.calcSpeed();
  }
  calcSpeed() {
    // in km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  constructor() {
    // A popup asks a user to allow or deny his current position
    this._getPosition();

    // Get all workouts
    this._getLocalStorage();

    /**********   All Event Listenners ***********/
    // Toggle 'Cadence and Elevation Gain' when user changes type of activity
    inputType.addEventListener('change', this._toggleElevationField);
    // Valuate, Save user data, Show the map mark up, form disappear when user submits the form
    form.addEventListener('submit', this._newWorkout.bind(this));
    // Move to the marker popup when user clicks on workout
    workoutsContainer.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position.');
        }
      );
    console.log('getPosition() is called');
  }

  _loadMap(position) {
    //  => get current position from "position" object
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    console.log(position);
    console.log('_loadMap is called');

    // => Load the map using Leaflet
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // Use map's tiles in the warm style
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // => Pop tthe form when user clicks on the map
    this.#map.on('click', this._showForm.bind(this));

    // Render the markers for all the workouts
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    console.log('mapE object', mapE);

    // remove 'hidden class' so the form will appear
    form.classList.remove('hidden');
    // set a cursor at "distance" input
    inputDistance.focus();
  }

  _toggleElevationField() {
    // toggle hidden class for Cadence and Elevation
    inputCadence.closest('.form_row').classList.toggle('form_row_hidden');
    inputElevation.closest('.form_row').classList.toggle('form_row_hidden');
  }
  _newWorkout(e) {
    console.log('_newWorkout() is called after submitting form');
    // Prevent reloading the page from submitting the form.
    e.preventDefault();
    // Create a function to validate if all values are numbers
    const validValues = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    // Create a function to validate if all numbers are positive
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    const type = inputType.value;
    const distance = +inputDistance.value; // use + to covert value to number
    const duration = +inputDuration.value; // use + to covert value to number
    //   Take coords from #mapEvent
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // Create a workout object base on type of activity
    if (type === 'running') {
      const cadence = +inputCadence.value; // use + to covert value to number
      if (
        !validValues(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], type, distance, duration, cadence);
    }

    if (type === 'cycling') {
      const elevation = +inputElevation.value; // use + to covert value to number
      if (
        !validValues(distance, duration, elevation) ||
        !allPositive(distance, duration, elevation)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], type, distance, duration, elevation);
    }
    // Store an object in an array
    this.#workouts.push(workout);
    console.log(this.#workouts);
    // Then store it in a local storage
    this._setLocalStorage();
    // Render workout marker on the map
    this._renderWorkoutMarker(workout);
    // Render Workout
    this._renderWorkout(workout);
    // Hide form
    this._hideForm();
  }

  _setLocalStorage() {
    // Store all workouts in Local Storage,
    // The 2nd argument has to be a string, so use JSON.stringify to turn object to string
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minwidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    // prettier-ignore
    let html = `<li class="workout workout_${workout.type}" data-id="${workout.id}">
    <h2 class="workout_title">${workout.description}</h2>
    <div class="workout_details">
      <span class="workout_icon">${workout.type === 'running' ? '🏃‍♂' : '🚴‍♀️'}</span>
      <span class="workout_value">${workout.distance}</span>
      <span class="workout_unit">km</span>
    </div>

    <div class="workout_details">
      <span class="workout_icon">🕑</span>
      <span class="workout_value">${workout.duration}</span>
      <span class="workout_unit">min</span>
    </div>`;
    // toFixed(1) = allow one decimal place
    if (workout.type === 'running')
      html += `<div class="workout_details">
    <span class="workout_icon">⚡️</span>
    <span class="workout_value">${workout.cadence.toFixed(1)}</span>  
    <span class="workout_unit">min/km</span>
  </div>

  <div class="workout_details">
    <span class="workout_icon">🦶</span>
    <span class="workout_value">${workout.pace}</span>
    <span class="workout_unit">spm</span>
  </div>
</li>`;

    if (workout.type === 'cycling')
      html += `<div class="workout_details">
    <span class="workout_icon">⚡️</span>
    <span class="workout_value">${workout.elevation.toFixed(1)}</span>
    <span class="workout_unit">km/h</span>
  </div>

  <div class="workout_details">
    <span class="workout_icon">🏔</span>
    <span class="workout_value">${workout.speed}</span>
    <span class="workout_unit">m</span>
  </div>
</li>`;

    // Insert html as sibling after the form('afterend') the latest element will stack above
    form.insertAdjacentHTML('afterend', html);
  }

  _hideForm() {
    // Clear all input values, so it won't appear when user clicks the map to fill the form again
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      '';
    /*
    Coz we have transform: translateY(-30rem); in the form.hidden(triggers animation), which makes the form doesn't disappear immediately when we add 'hidden' class to the form. So have to use display = none.  
    */
    // Make form disappears immediately
    form.style.display = 'none';
    // Hide the form
    form.classList.add('hidden');
    /* 
    Coz we set display = 'none' above, so we have so set the display back to 'grid', so the form can be seen when user clicks on map.
    */
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    // Find closest .workout element
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    // Find a workout object that has the same id as workoutEl
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // Move to popup using setView(coords, zoomInLevel, option object)
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1, // duration of animation
      },
    });
  }

  _getLocalStorage() {
    // Get workouts from Local Storage and covert into an object
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    // Render every workout
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
}

const app = new App();
