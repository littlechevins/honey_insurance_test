/* The maximum number of minutes in a period (a day) */

const MAX_IN_PERIOD = 1440;

/**
 * PART 1
 *
 * You have an appliance that uses energy, and you want to calculate how
 * much energy it uses over a period of time.
 *
 * As an input to your calculations, you have a series of events that contain
 * a timestamp and the new state (on or off). You are also given the initial
 * state of the appliance. From this information, you will need to calculate
 * the energy use of the appliance i.e. the amount of time it is switched on.
 *
 * The amount of energy it uses is measured in 1-minute intervals over the
 * period of a day. Given there is 1440 minutes in a day (24 * 60), if the
 * appliance was switched on the entire time, its energy usage would be 1440.
 * To simplify calculations, timestamps range from 0 (beginning of the day)
 * to 1439 (last minute of the day).
 *
 * HINT: there is an additional complication with the last two tests that
 * introduce spurious state change events (duplicates at different time periods).
 * Focus on getting these tests working after satisfying the first tests.
 *
 * The structure for `profile` looks like this (as an example):
 * ```
 * {
 *    initial: 'on',
 *    events: [
 *      { state: 'off', timestamp: 50 },
 *      { state: 'on', timestamp: 304 },
 *      { state: 'off', timestamp: 600 },
 *    ]
 * }
 * ```
 */

const STATE = {
  ON: 'on',
  OFF: 'off',
  AUTO: 'auto-off',
};

const FIRST_DAY = 1;
const LAST_DAY = 365;

/**
 * Handles the case when there are no events in a profile
 * @param {string} initialState The initial state
 * @returns {number} The energy usage for the initial state
 */
const handleEmptyEvents = (initialState) => {
  return getInitialStateResult(initialState);
};

/**
 * Calculates the epoch start and end timestamps for a given day
 * @param {number} day The day number
 * @returns {Object} Object containing epochDayStart and epochDayEnd
 */
const calculateEpochDayBoundaries = (day) => {
  return {
    epochDayStart: (day - 1) * MAX_IN_PERIOD,
    epochDayEnd: day * MAX_IN_PERIOD,
  };
};

/**
 * Validates that a day number is valid
 * @param {number} day The day number to validate
 * @throws {Error} When day is not an integer or out of range
 */
const validateDay = (day) => {
  if (!isInteger(day)) {
    throw new Error('must be an integer');
  }
  if (day < FIRST_DAY || day > LAST_DAY) {
    throw new Error('day out of range');
  }
};

/**
 * Validates that an initial state is valid
 * @param {string} initialState The initial state to validate
 * @throws {Error} When initial state is invalid
 */
const validateInitialState = (initialState) => {
  if (!Object.values(STATE).includes(initialState)) {
    throw new Error('invalid initial state');
  }
};

/**
 * Validates that a state is valid
 * @param {string} state The state to validate
 * @throws {Error} When state is invalid
 */
const validateState = (state) => {
  if (!Object.values(STATE).includes(state)) {
    throw new Error('invalid state');
  }
};

/**
 * Validates that a timestamp is within the valid range for a day
 * @param {number} timestamp The timestamp to validate
 * @param {number} maxPeriod The maximum period (defaults to MAX_IN_PERIOD)
 * @throws {Error} When timestamp is out of range
 */
const validateTimestamp = (timestamp) => {
  if (timestamp > MAX_IN_PERIOD || timestamp < 0) {
    throw new Error('events out of range');
  }
};

/**
 * Validates a usage profile object
 *
 * @param {Object} profile The usage profile to validate
 * @param {string} profile.initial The initial state of the appliance
 * @param {Array<Object>} profile.events Array of state change events
 * @throws {Error} When profile is invalid, missing required properties, or has invalid values
 */
const validateProfile = (profile) => {
  if (!profile || typeof profile !== 'object') {
    throw new Error('profile must be a valid object');
  }

  if (!profile.hasOwnProperty('initial')) {
    throw new Error('profile must have an initial state');
  }

  validateInitialState(profile.initial);

  if (!profile.hasOwnProperty('events')) {
    throw new Error('profile must have an events array');
  }

  if (!Array.isArray(profile.events)) {
    throw new Error('profile.events must be an array');
  }
};

const isInteger = (number) => Number.isInteger(number);

// Note: Can we guarantee that events are sorted? If so then we can skip this step.
// This mutates the original array. For large datasets we might need to consider pre-sorting

/**
 * Sorts events by timestamp in ascending order
 *
 * @param {Array<Object>} events Array of event objects
 * @returns {Array<Object>} The sorted array of events
 */
const sortEventByTimeStamp = (events) => {
  return events.sort((a, b) => a.timestamp - b.timestamp);
};

// Note: For small data this is ok but we can improve for bigger data sets by using
// a binary search to get the start and end date positions instead of looping the entire array
// O(n) -> O(logn)

/**
 * Finds the start and end positions in a sorted events array for a given time range
 *
 * @param {Array<Object>} events Sorted array of event objects
 * @param {number} epochDayStart Start timestamp
 * @param {number} epochDayEnd End timestamp
 * @returns {Object} Object containing startPosition and endPosition indices
 */
const calculateEpochStartEndPositions = (
  events,
  epochDayStart,
  epochDayEnd
) => {
  let startPosition = -1;
  let endPosition = -1;

  for (let i = 0; i < events.length; i++) {
    const timestamp = events[i].timestamp;
    // Find the first event that occurs at or after the start of the day
    if (epochDayStart <= timestamp && startPosition === -1) {
      startPosition = i;
    }
    // Find the first event that occurs at or after the end of the day
    if (epochDayEnd <= timestamp && endPosition === -1) {
      endPosition = i;
    }
  }

  // Handle edge cases where no events fall within the range
  if (startPosition === -1) {
    startPosition = 0;
  }
  if (endPosition === -1) {
    endPosition = events.length - 1;
  }

  return { startPosition, endPosition };
};

/**
 * Determines the initial state for a specific day based on the month's usage profile
 *
 * Uses the state from the last event of the previous day, or the month's initial state if no
 * previous events exist.
 *
 * @param {Object} monthProfile The month's usage profile
 * @param {number} day The day number
 * @param {number} startPosition The starting position of events for this day
 * @param {Array<Object>} sortedEvents The sorted events array
 * @returns {string} The initial state for the specified day
 */
const getDayInitialState = (monthProfile, day, startPosition, sortedEvents) => {
  if (day === 1) return monthProfile.initial;

  // If there are no events or the first event is for this day, use the month's initial state.
  if (sortedEvents.length === 0 || startPosition === 0) {
    return monthProfile.initial;
  }

  // Otherwise, use the state from the last event before this day.
  return sortedEvents[startPosition - 1].state;
};

// Note: I avoided using slice and map ie events.slice(start, end+1) as it's inefficient for large arrays.

/**
 * Normalizes events for a specific day by adjusting timestamps to relative values
 *
 * @param {Array<Object>} events Array of event objects
 * @param {number} startPosition Starting index in the events array
 * @param {number} endPosition Ending index in the events array (inclusive)
 * @param {number} day The day number for timestamp normalization
 * @returns {Array<Object>} Array of normalized events
 * @throws {Error} When startPosition or endPosition are out of bounds
 */
const normaliseEventsForDay = (events, startPosition, endPosition, day) => {
  const normalisedEvents = [];
  const dayOffset = MAX_IN_PERIOD * (day - 1);
  const dayEndTimestamp = day * MAX_IN_PERIOD;

  // Handle empty events or invalid positions
  if (!Array.isArray(events) || events.length === 0) {
    return [];
  }
  if (startPosition > endPosition) {
    return [];
  }
  if (startPosition < 0 || endPosition >= events.length) {
    throw new Error('startPosition or endPosition out of bounds');
  }

  for (let i = startPosition; i <= endPosition; i++) {
    const event = events[i];
    // Skip any events that are on the end day boundary as they belong to the next day
    // This is required as our endPositions are inclusive
    if (event.timestamp >= dayEndTimestamp) {
      continue;
    }
    normalisedEvents.push({
      state: event.state,
      timestamp: event.timestamp - dayOffset,
    });
  }
  return normalisedEvents;
};

/**
 * Calculates the energy usage for a given initial state
 * @param {string} initialState The initial state of the appliance ('on', 'off', or 'auto-off')
 * @returns {number} The energy usage in minutes (0 for off states, MAX_IN_PERIOD for on states)
 * @throws {Error} When initialState is not a valid state
 */
const getInitialStateResult = (initialState) => {
  switch (initialState) {
    case STATE.OFF:
      return 0;
    case STATE.ON:
      return MAX_IN_PERIOD;
    case STATE.AUTO:
      return MAX_IN_PERIOD;
    default:
      throw new Error('invalid initial state');
  }
};

/**
 * Calculates the total energy usage of an appliance over a single day
 *
 * @param {Object} profile The usage profile containing initial state and events
 * @returns {number} Total energy usage in minutes
 * @throws {Error} When initial state is invalid or timestamps are out of range
 */
const calculateEnergyUsageSimple = (profile) => {
  validateProfile(profile);

  let totalDuration = 0;
  let applianceOnStartTime = -1;

  const events = profile.events;

  // If there are no events, usage is determined by the initial state.
  if (events.length === 0) {
    return handleEmptyEvents(profile.initial);
  }

  // If the appliance is initially on, start tracking usage from the beginning of the day.
  if (profile.initial === STATE.ON) {
    applianceOnStartTime = 0;
  }

  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i];
    const currentState = currentEvent.state;

    validateTimestamp(currentEvent.timestamp);

    if (currentState === STATE.OFF) {
      // If the appliance was previously 'on', add the duration it was on up to this event.
      if (applianceOnStartTime !== -1) {
        totalDuration += currentEvent.timestamp - applianceOnStartTime;
      }
      // Reset on start time
      applianceOnStartTime = -1;
    } else if (currentState === STATE.ON && applianceOnStartTime === -1) {
      // Start tracking 'on' time
      applianceOnStartTime = currentEvent.timestamp;
    }
    // Ignore duplicate 'on' events if the appliance is already on.
  }

  // If the last event leaves the appliance on, add usage until the end of the day.
  if (applianceOnStartTime !== -1) {
    totalDuration += MAX_IN_PERIOD - applianceOnStartTime;
  }

  return totalDuration;
};

/**
 * PART 2
 *
 * You purchase an energy-saving device for your appliance in order
 * to cut back on its energy usage. The device is smart enough to shut
 * off the appliance after it detects some period of disuse, but you
 * can still switch on or off the appliance as needed.
 *
 * You are keen to find out if your shiny new device was a worthwhile
 * purchase. Its success is measured by calculating the amount of
 * energy *saved* by device.
 *
 * To assist you, you now have a new event type that indicates
 * when the appliance was switched off by the device (as opposed to switched
 * off manually). Your new states are:
 * * 'on'
 * * 'off' (manual switch off)
 * * 'auto-off' (device automatic switch off)
 *
 * (The `profile` structure is the same, except for the new possible
 * value for `initial` and `state`.)
 *
 * Write a function that calculates the *energy savings* due to the
 * periods of time when the device switched off your appliance. You
 * should not include energy saved due to manual switch offs.
 *
 * You will need to account for redundant/non-sensical events e.g.
 * an off event after an auto-off event, which should still count as
 * an energy savings because the original trigger was the device
 * and not manual intervention.
 */

/**
 * Calculates the energy savings achieved by auto-off
 *
 * @param {Object} profile The usage profile
 * @returns {number} Total energy savings in minutes
 * @throws {Error} When any event state is invalid
 */
const calculateEnergySavings = (profile) => {
  validateProfile(profile);

  const events = profile.events;

  // If there are no events, savings depend only on the initial state
  if (events.length === 0) {
    if (profile.initial === STATE.ON || profile.initial === STATE.OFF) {
      return 0;
    }
    if (profile.initial === STATE.AUTO) {
      return MAX_IN_PERIOD;
    }
  }

  let previousAutoOffTimestamp = -1;
  let totalTimeSaved = 0;
  let isCurrentlyOn = false;
  let lastValidEventIsAutoOff = false;

  for (let i = 0; i < events.length; i++) {
    const currentEvent = events[i];
    const currentState = currentEvent.state;

    validateState(currentState);

    if (currentState === STATE.ON) {
      isCurrentlyOn = true;
      lastValidEventIsAutoOff = false;
      // If the previous state was auto-off, add savings from auto-off to this 'on'
      if (previousAutoOffTimestamp !== -1) {
        totalTimeSaved += currentEvent.timestamp - previousAutoOffTimestamp;
      }
    } else if (currentState === STATE.OFF) {
      // Manual turn off, reset auto-off tracking if appliance was on
      if (isCurrentlyOn) {
        previousAutoOffTimestamp = -1;
      }
    } else if (currentState === STATE.AUTO) {
      // Start tracking a new auto-off savings
      isCurrentlyOn = false;
      lastValidEventIsAutoOff = true;
      if (previousAutoOffTimestamp === -1) {
        previousAutoOffTimestamp = currentEvent.timestamp;
      }
    }
  }

  // If the last event was an auto-off, add savings until the end of the day
  if (lastValidEventIsAutoOff) {
    totalTimeSaved += MAX_IN_PERIOD - previousAutoOffTimestamp;
  }

  return totalTimeSaved;
};

/**
 * PART 3
 *
 * The process of producing metrics usually requires handling multiple days of data. The
 * examples so far have produced a calculation assuming the day starts at '0' for a single day.
 *
 * In this exercise, the timestamp field contains the number of minutes since a
 * arbitrary point in time (the "Epoch"). To simplify calculations, assume:
 *  - the Epoch starts at the beginning of the month (i.e. midnight on day 1 is timestamp 0)
 *  - our calendar simply has uniform length 'days' - the first day is '1' and the last day is '365'
 *  - the usage profile data will not extend more than one month
 *
 * Your function should calculate the energy usage over a particular day, given that
 * day's number. It will have access to the usage profile over the month.
 *
 * It should also throw an error if the day value is invalid i.e. if it is out of range
 * or not an integer. Specific error messages are expected - see the tests for details.
 *
 * (The `profile` structure is the same as part 1, but remember that timestamps now extend
 * over multiple days)
 *
 * HINT: You are encouraged to re-use `calculateEnergyUsageSimple` from PART 1 by
 * constructing a usage profile for that day by slicing up and rewriting up the usage profile you have
 * been given for the month.
 */

/**
 * Calculates the energy usage for a specific day from a month usage profile
 *
 * @param {Object} monthUsageProfile
 * @param {Array<Object>} monthUsageProfile.events
 * @param {number} day
 * @returns {number} The energy usage in minutes
 * @throws {Error} When day is not an integer or out of range
 */
const calculateEnergyUsageForDay = (monthUsageProfile, day) => {
  validateDay(day);
  validateProfile(monthUsageProfile);

  // If there are no events, usage is determined by the initial state for the month.
  if (monthUsageProfile.events.length === 0) {
    return handleEmptyEvents(monthUsageProfile.initial);
  }

  const epochDayStart = (day - 1) * MAX_IN_PERIOD;
  const epochDayEnd = day * MAX_IN_PERIOD;

  // If the day is before the first event, usage is determined by the initial state.
  if (epochDayEnd <= monthUsageProfile.events[0].timestamp) {
    return getInitialStateResult(monthUsageProfile.initial);
  }

  // If the day is after the last event and the last event is 'on', usage is max for the day.
  const lastEvent = monthUsageProfile.events.at(-1);
  if (epochDayStart >= lastEvent.timestamp && lastEvent.state === STATE.ON) {
    return MAX_IN_PERIOD;
  }

  // We sort every time calculateEnergyUsageForDay is called. A better implementation would be to ensure events are sorted before calling
  const sortedEvents = sortEventByTimeStamp(monthUsageProfile.events);
  const { startPosition, endPosition } = calculateEpochStartEndPositions(
    sortedEvents,
    epochDayStart,
    epochDayEnd
  );

  const normalisedEvents = normaliseEventsForDay(
    sortedEvents,
    startPosition,
    endPosition,
    day
  );
  const initialState = getDayInitialState(
    monthUsageProfile,
    day,
    startPosition,
    sortedEvents
  );

  const dayProfile = {
    initial: initialState,
    events: normalisedEvents,
  };

  return calculateEnergyUsageSimple(dayProfile);
};

module.exports = {
  calculateEnergyUsageSimple,
  calculateEnergySavings,
  calculateEnergyUsageForDay,
  calculateEpochStartEndPositions,
  getDayInitialState,
  normaliseEventsForDay,
  validateProfile,
  getInitialStateResult,
  sortEventByTimeStamp,
  validateDay,
  validateState,
  validateInitialState,
  validateTimestamp,
  calculateEpochDayBoundaries,
  handleEmptyEvents,
  MAX_IN_PERIOD,
  STATE,
};
