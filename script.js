'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
// const btnEdit = document.querySelector('.workout__edit');
// const btnEdit = document.querySelector('.ed-btn');
// const btnDelete = document.querySelector('.workout__delete');
const btnDelete = document.querySelector('.del-btn');
const controls = document.querySelector('.controls');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; //[lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // pace = min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    //km/hr
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

/////////////////////////////////////////
//APPLICATION ARCHITECTURE
class App {
  #map;
  #mapEvent;
  #mapZoomLevel = 13;
  #workouts = [];
  // lat;
  // lng;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local staorage
    this._getLocalStorage();

    // Delete individual workouts
    this._deleteWorkout();

    // Edit workouts
    // this._editWorkout();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          //Call back for if the position is not gotten
          alert('Could not get your position');
        }
      );
  }

  //Using leaflet API, pass in a position and load the map of that position
  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    console.log(this.#workouts);

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
      // this._moveToPopup(work);
    });
  }

  //Shows the form when there is a click on the map
  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  //Toggling between cycling and running
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  //Create and render workout
  _newWorkout(e) {
    e.preventDefault();
    //Helper functions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If data is running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs has to be a positive number');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If data is cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      // Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs has to be a positive number');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to wokout array
    this.#workouts.push(workout);
    console.log(this.#workouts);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workoout on
    this._renderWorkout(workout);

    // Hide form + Clear Input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        ` ${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description} `
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__controls">
            <span class="workout__edit"
              ><i class="fa fa-pencil-square ed-btn" aria-hidden="true"></i
            ></span>
            <span class="workout__delete"
              ><i class="fa fa-trash del-btn" aria-hidden="true"></i
            ></span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
       <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>
      `;

    if (workout.type === 'cycling')
      html += `
     <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed()}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `;

    // Insert the html to the DOM
    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    location.reload();
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
      // this._moveToPopup(work);
    });
  }

  _deleteWorkout() {
    const btnDelete = document.querySelectorAll('.workout__delete');
    let actions = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts = actions;
    btnDelete.forEach(btn =>
      btn.addEventListener('click', function (e) {
        const item = e.target.closest('.workout');
        actions = actions.filter(it => it.id != item.dataset.id);

        localStorage.setItem('workouts', JSON.stringify(actions));
        location.reload();
      })
    );
  }

  _edit(e) {
    // let { lat, lng } = this.#mapEvent.latlng;
    // show form
    this._showForm();

    // Grab objects from local storage
    let workouts = JSON.parse(localStorage.getItem('workouts'));
    this.#workouts = workouts;

    // Identify object to edit
    const objToEditId = e.target.closest('.workout').dataset.id;
    console.log(workouts, objToEditId);

    // Find it from the stored arrays
    const objToEdit = workouts.find(obj => obj.id === objToEditId);
    console.log(objToEdit);

    // Modify the values of the objects
    if (objToEdit) {
      // objToEdit.type = inputType.value;
      // objToEdit.distance = +inputDistance.value;
      // objToEdit.duration = +inputDuration.value;

      inputType.value = objToEdit.type;
      inputDistance.value = objToEdit.distance;
      inputDuration.value = objToEdit.duration;
      inputCadence.value = objToEdit.cadence;
      inputElevation.value = objToEdit.elevation;
      // [lat, lng] = objToEdit.coords;
      [this.lat, this.lng] = [objToEdit.coords[0], objToEdit.coords[1]];
      // this.lat = objToEdit.coords[0];
      // this.lng = objToEdit.coords[1];
      console.log(this.lat, this.lng);
      // [this.lat, this.lng] = objToEdit.coords;
    }
    // { lat, lng } = this.#mapEvent.latlng;

    // objToEdit.coords = this.coords;
    // objToEdit.lng = lng;
    this._newWorkout();
  }

  _editWorkout(e) {
    // Attach event listener to the btns
    const btnEdit = document.querySelectorAll('.workout__edit');
    btnEdit.forEach(btn =>
      btn.addEventListener('click', this._edit.bind(this))
    );
    // On click, open form
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
