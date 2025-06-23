const {
  calculateEnergyUsageSimple,
  calculateEnergySavings,
  calculateEnergyUsageForDay,
  calculateEpochStartEndPositions,
  MAX_IN_PERIOD,
  validateProfile,
  getInitialStateResult,
  sortEventByTimeStamp,
  getDayInitialState,
  normaliseEventsForDay,
  validateDay,
  validateState,
  validateInitialState,
  validateTimestamp,
  calculateEpochDayBoundaries,
  handleEmptyEvents,
} = require('./index');

// Note: I've modified + addedsome tests to be more descriptive, and separated out some tests into describe blocks. Each it() should be a single test.

// Part 1
describe('calculateEnergyUsageSimple', () => {
  it('should calculate correctly for a simple usage profile with initial state = "on"', () => {
    const usageProfile1 = {
      initial: 'on',
      events: [
        { timestamp: 126, state: 'off' },
        { timestamp: 833, state: 'on' },
      ],
    };
    expect(calculateEnergyUsageSimple(usageProfile1)).toEqual(
      126 + (1440 - 833)
    );
  });

  it('should calculate correctly for a simple usage profile with initial state = "off"', () => {
    const usageProfile2 = {
      initial: 'off',
      events: [
        { timestamp: 30, state: 'on' },
        { timestamp: 80, state: 'off' },
        { timestamp: 150, state: 'on' },
        { timestamp: 656, state: 'off' },
      ],
    };
    expect(calculateEnergyUsageSimple(usageProfile2)).toEqual(
      80 - 30 + (656 - 150)
    );
  });

  it('should calculate correctly when the appliance is on the whole time', () => {
    const usageProfile3 = {
      initial: 'on',
      events: [],
    };
    expect(calculateEnergyUsageSimple(usageProfile3)).toEqual(1440);
  });

  it('should handle duplicate on events', () => {
    const usageProfile = {
      initial: 'off',
      events: [
        { timestamp: 30, state: 'on' },
        { timestamp: 80, state: 'on' },
        { timestamp: 150, state: 'off' },
        { timestamp: 656, state: 'on' },
      ],
    };
    expect(calculateEnergyUsageSimple(usageProfile)).toEqual(
      150 - 30 + (1440 - 656)
    );
  });

  it('should handle duplicate off events', () => {
    const usageProfile = {
      initial: 'on',
      events: [
        { timestamp: 30, state: 'on' },
        { timestamp: 80, state: 'off' },
        { timestamp: 150, state: 'off' },
        { timestamp: 656, state: 'on' },
      ],
    };
    expect(calculateEnergyUsageSimple(usageProfile)).toEqual(
      80 - 0 + (1440 - 656)
    );
  });

  it('should handle timestamps outside of minutes in a day', () => {
    const usageProfile = {
      initial: 'on',
      events: [
        { timestamp: -30, state: 'on' },
        { timestamp: 80, state: 'off' },
        { timestamp: 150, state: 'off' },
        { timestamp: 1500, state: 'on' },
      ],
    };

    expect(() => calculateEnergyUsageSimple(usageProfile)).toThrow(
      /events out of range/
    );
  });

  it('should handle invalid initial states', () => {
    const usageProfile = {
      initial: 'error',
      events: [{ timestamp: 20, state: 'on' }],
    };

    expect(() => calculateEnergyUsageSimple(usageProfile)).toThrow(
      /invalid initial state/
    );
  });
});

// Part 2

describe('calculateEnergySavings', () => {
  it('should return zero for always on', () => {
    const usageProfile = {
      initial: 'on',
      events: [],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(0);
  });

  it('should calculate zero for always switch off manually', () => {
    const usageProfile = {
      initial: 'off',
      events: [],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(0);
  });

  it('should calculate max period for always switched off automatically', () => {
    const usageProfile = {
      initial: 'auto-off',
      events: [],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(MAX_IN_PERIOD);
  });

  it('should calculate energy savings correctly on sensible data', () => {
    const usageProfile = {
      initial: 'off',
      events: [
        { state: 'on', timestamp: 100 },
        { state: 'off', timestamp: 150 },
        { state: 'on', timestamp: 200 },
        { state: 'auto-off', timestamp: 500 },
        { state: 'on', timestamp: 933 },
        { state: 'off', timestamp: 1010 },
        { state: 'on', timestamp: 1250 },
        { state: 'auto-off', timestamp: 1320 },
      ],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(
      933 - 500 + (MAX_IN_PERIOD - 1320)
    );
  });

  it('should calculate energy savings correctly on silly data (example 1)', () => {
    const usageProfile = {
      initial: 'off',
      events: [
        { state: 'on', timestamp: 100 },
        { state: 'off', timestamp: 150 },
        { state: 'on', timestamp: 200 },
        { state: 'auto-off', timestamp: 500 },
        { state: 'off', timestamp: 800 },
        { state: 'on', timestamp: 933 },
        { state: 'off', timestamp: 1010 },
        { state: 'on', timestamp: 1250 },
        { state: 'on', timestamp: 1299 },
        { state: 'auto-off', timestamp: 1320 },
      ],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(
      933 - 500 + (MAX_IN_PERIOD - 1320)
    );
  });

  it('should calculate energy savings correctly on silly data (example 2)', () => {
    const usageProfile = {
      initial: 'off',
      events: [
        { state: 'on', timestamp: 250 },
        { state: 'on', timestamp: 299 },
        { state: 'auto-off', timestamp: 320 },
        { state: 'off', timestamp: 500 },
      ],
    };
    expect(calculateEnergySavings(usageProfile)).toEqual(MAX_IN_PERIOD - 320);
  });

  it('should handle invalid states', () => {
    const usageProfile = {
      initial: 'off',
      events: [
        { state: 'on', timestamp: 250 },
        { state: 'on', timestamp: 299 },
        { state: 'error', timestamp: 320 },
        { state: 'auto-off', timestamp: 500 },
      ],
    };
    expect(() => calculateEnergySavings(usageProfile)).toThrow(/invalid state/);
  });
});

// Part 3
describe('calculateEnergyUsageForDay', () => {
  const monthProfile = {
    initial: 'on',
    events: [
      { state: 'off', timestamp: 500 },
      { state: 'on', timestamp: 900 },
      { state: 'off', timestamp: 1400 },
      { state: 'on', timestamp: 1700 },
      { state: 'off', timestamp: 1900 },
      { state: 'on', timestamp: 2599 },
      { state: 'off', timestamp: 2900 },
      { state: 'on', timestamp: 3000 },
      { state: 'off', timestamp: 3500 },
      { state: 'on', timestamp: 4000 },
      { state: 'off', timestamp: 4420 },
      { state: 'on', timestamp: 4500 },
    ],
  };

  describe('should calculate the energy usage for an empty set of events correctly', () => {
    it('should calculate the energy usage for an empty set when initial state is off', () => {
      expect(
        calculateEnergyUsageForDay({ initial: 'off', events: [] }, 10)
      ).toEqual(0);
    });
    it('should calculate the energy usage for an empty set when initial state is on', () => {
      expect(
        calculateEnergyUsageForDay({ initial: 'on', events: [] }, 5)
      ).toEqual(1440);
    });
  });

  it('should calculate day 1 correctly', () => {
    expect(calculateEnergyUsageForDay(monthProfile, 1)).toEqual(
      500 - 0 + (1400 - 900)
    );
  });

  it('should calculate day 2 correctly', () => {
    expect(calculateEnergyUsageForDay(monthProfile, 2)).toEqual(
      1900 - 1700 + (2880 - 2599)
    );
  });

  it('should calculate day 3 correctly', () => {
    expect(calculateEnergyUsageForDay(monthProfile, 3)).toEqual(
      2900 - 2880 + (3500 - 3000) + (4320 - 4000)
    );
    // 20 - 0 + (620 - 120) + (1440 - 1120)
  });

  it('should calculate day 4 correctly', () => {
    expect(calculateEnergyUsageForDay(monthProfile, 4)).toEqual(
      4420 - 4320 + (5760 - 4500)
    );
    // 100 - 0 + (1440 - 180)
  });

  it('should calculate day 5 correctly', () => {
    expect(calculateEnergyUsageForDay(monthProfile, 5)).toEqual(MAX_IN_PERIOD);
  });

  describe('should calculate day 2 correctly when the first event starts on day 4', () => {
    const monthProfile1 = {
      initial: 'off',
      events: [{ timestamp: 4500, state: 'on' }],
    };

    it('day 2 should be 0', () => {
      expect(calculateEnergyUsageForDay(monthProfile1, 2)).toEqual(0);
    });

    it('day 4 should be 1260', () => {
      expect(calculateEnergyUsageForDay(monthProfile1, 4)).toEqual(1260);
    });

    it('day 15 should be MAX', () => {
      expect(calculateEnergyUsageForDay(monthProfile1, 15)).toEqual(
        MAX_IN_PERIOD
      );
    });

    it('day 2 should be MAX when initial state is on', () => {
      const monthProfileIntialOn = {
        initial: 'on',
        events: [{ timestamp: 4500, state: 'off' }],
      };
      expect(calculateEnergyUsageForDay(monthProfileIntialOn, 2)).toEqual(
        MAX_IN_PERIOD
      );
    });
  });

  describe('should throw an error on an out of range day number', () => {
    // The regular expression matches the message of the Error(), which is
    // the first parameter to the Error class constructor.
    it('should throw an error on an out of range day number -5', () => {
      expect(() => calculateEnergyUsageForDay(monthProfile, -5)).toThrow(
        /day out of range/
      );
    });
    it('should throw an error on an out of range day number 0', () => {
      expect(() => calculateEnergyUsageForDay(monthProfile, 0)).toThrow(
        /day out of range/
      );
    });
    it('should throw an error on an out of range day number 366', () => {
      expect(() => calculateEnergyUsageForDay(monthProfile, 366)).toThrow(
        /day out of range/
      );
    });
  });

  it('should throw an error on a non-integer day number', () => {
    expect(() => calculateEnergyUsageForDay(3.76)).toThrow(
      /must be an integer/
    );
  });
});

describe('calculateEpochStartEndPositions', () => {
  const testCases = [
    {
      name: 'should find positions when both start and end timestamps exist in events',
      events: [
        { timestamp: 100 },
        { timestamp: 200 },
        { timestamp: 300 },
        { timestamp: 400 },
        { timestamp: 500 },
      ],
      epochDayStart: 200,
      epochDayEnd: 400,
      expected: { startPosition: 1, endPosition: 3 },
    },
    {
      name: 'should handle start timestamp before first event',
      events: [{ timestamp: 200 }, { timestamp: 300 }, { timestamp: 400 }],
      epochDayStart: 100,
      epochDayEnd: 350,
      expected: { startPosition: 0, endPosition: 2 },
    },
    {
      name: 'should handle end timestamp after last event',
      events: [{ timestamp: 100 }, { timestamp: 200 }, { timestamp: 300 }],
      epochDayStart: 150,
      epochDayEnd: 500,
      expected: { startPosition: 1, endPosition: 2 },
    },
    {
      name: 'should handle both timestamps outside event range',
      events: [{ timestamp: 200 }, { timestamp: 300 }, { timestamp: 400 }],
      epochDayStart: 100,
      epochDayEnd: 500,
      expected: { startPosition: 0, endPosition: 2 },
    },
    {
      name: 'should handle exact timestamp matches',
      events: [{ timestamp: 100 }, { timestamp: 200 }, { timestamp: 300 }],
      epochDayStart: 200,
      epochDayEnd: 200,
      expected: { startPosition: 1, endPosition: 1 },
    },
    {
      name: 'should handle empty events array',
      events: [],
      epochDayStart: 100,
      epochDayEnd: 200,
      expected: { startPosition: 0, endPosition: -1 },
    },
    {
      name: 'should handle single event with timestamps before it',
      events: [{ timestamp: 300 }],
      epochDayStart: 100,
      epochDayEnd: 200,
      expected: { startPosition: 0, endPosition: 0 },
    },
    {
      name: 'should handle single event with timestamps after it',
      events: [{ timestamp: 100 }],
      epochDayStart: 200,
      epochDayEnd: 300,
      expected: { startPosition: 0, endPosition: 0 },
    },
    {
      name: 'should handle timestamps between events',
      events: [{ timestamp: 100 }, { timestamp: 300 }, { timestamp: 500 }],
      epochDayStart: 200,
      epochDayEnd: 400,
      expected: { startPosition: 1, endPosition: 2 },
    },
    {
      name: 'should handle start timestamp equal to first event',
      events: [{ timestamp: 100 }, { timestamp: 200 }, { timestamp: 300 }],
      epochDayStart: 100,
      epochDayEnd: 250,
      expected: { startPosition: 0, endPosition: 2 },
    },
    {
      name: 'should handle end timestamp equal to last event',
      events: [{ timestamp: 100 }, { timestamp: 200 }, { timestamp: 300 }],
      epochDayStart: 150,
      epochDayEnd: 300,
      expected: { startPosition: 1, endPosition: 2 },
    },
    {
      name: 'should handle duplicate timestamps in events',
      events: [
        { timestamp: 100 },
        { timestamp: 200 },
        { timestamp: 200 },
        { timestamp: 300 },
      ],
      epochDayStart: 200,
      epochDayEnd: 200,
      expected: { startPosition: 1, endPosition: 1 },
    },
    {
      name: 'should handle unsorted events (function should work with sorted input)',
      events: [{ timestamp: 300 }, { timestamp: 100 }, { timestamp: 200 }],
      epochDayStart: 150,
      epochDayEnd: 250,
      expected: { startPosition: 0, endPosition: 0 },
    },
  ];

  testCases.forEach(
    ({ name, events, epochDayStart, epochDayEnd, expected }) => {
      it(name, () => {
        const result = calculateEpochStartEndPositions(
          events,
          epochDayStart,
          epochDayEnd
        );
        expect(result).toEqual(expected);
      });
    }
  );

  it('should handle edge case with zero timestamps', () => {
    const events = [{ timestamp: 0 }, { timestamp: 100 }, { timestamp: 200 }];
    const result = calculateEpochStartEndPositions(events, 0, 150);
    expect(result).toEqual({ startPosition: 0, endPosition: 2 });
  });

  it('should handle negative timestamps', () => {
    const events = [{ timestamp: -100 }, { timestamp: 0 }, { timestamp: 100 }];
    const result = calculateEpochStartEndPositions(events, -50, 50);
    expect(result).toEqual({ startPosition: 1, endPosition: 2 });
  });
});

describe('validateProfile', () => {
  it('should accept valid profile', () => {
    const validProfile = {
      initial: 'on',
      events: [{ state: 'off', timestamp: 100 }],
    };
    expect(() => validateProfile(validProfile)).not.toThrow();
  });

  it('should throw error for null profile', () => {
    expect(() => validateProfile(null)).toThrow(
      /profile must be a valid object/
    );
  });

  it('should throw error for missing initial state', () => {
    const profile = { events: [] };
    expect(() => validateProfile(profile)).toThrow(
      /profile must have an initial state/
    );
  });

  it('should throw error for invalid initial state', () => {
    const profile = { initial: 'invalid', events: [] };
    expect(() => validateProfile(profile)).toThrow(/invalid initial state/);
  });

  it('should throw error for missing events array', () => {
    const profile = { initial: 'on' };
    expect(() => validateProfile(profile)).toThrow(
      /profile must have an events array/
    );
  });

  it('should throw error for non-array events', () => {
    const profile = { initial: 'on', events: 'not an array' };
    expect(() => validateProfile(profile)).toThrow(
      /profile\.events must be an array/
    );
  });
});

describe('getInitialStateResult', () => {
  it('should return 0 for off state', () => {
    expect(getInitialStateResult('off')).toBe(0);
  });

  it('should return MAX_IN_PERIOD for on state', () => {
    expect(getInitialStateResult('on')).toBe(MAX_IN_PERIOD);
  });

  it('should return MAX_IN_PERIOD for auto-off state', () => {
    expect(getInitialStateResult('auto-off')).toBe(MAX_IN_PERIOD);
  });

  it('should throw error for invalid state', () => {
    expect(() => getInitialStateResult('invalid')).toThrow(
      /invalid initial state/
    );
  });
});

describe('sortEventByTimeStamp', () => {
  describe('should sort events by timestamp', () => {
    const events = [
      { timestamp: 300, state: 'on' },
      { timestamp: 100, state: 'off' },
      { timestamp: 200, state: 'on' },
    ];
    const sorted = sortEventByTimeStamp(events);
    it('should sort events by timestamp 1', () => {
      expect(sorted[0].timestamp).toBe(100);
    });
    it('should sort events by timestamp 2', () => {
      expect(sorted[1].timestamp).toBe(200);
    });
    it('should sort events by timestamp 3', () => {
      expect(sorted[2].timestamp).toBe(300);
    });
  });

  it('should handle already sorted events', () => {
    const events = [
      { timestamp: 100, state: 'on' },
      { timestamp: 200, state: 'off' },
    ];
    const sorted = sortEventByTimeStamp(events);
    expect(sorted).toEqual(events);
  });

  it('should handle empty array', () => {
    expect(sortEventByTimeStamp([])).toEqual([]);
  });

  it('should handle single event', () => {
    const events = [{ timestamp: 100, state: 'on' }];
    expect(sortEventByTimeStamp(events)).toEqual(events);
  });
});

describe('getDayInitialState', () => {
  const monthProfile = {
    initial: 'off',
    events: [
      { state: 'on', timestamp: 1440 },
      { state: 'off', timestamp: 2880 },
      { state: 'on', timestamp: 4320 },
    ],
  };

  it('should return month initial state for day 1', () => {
    const result = getDayInitialState(monthProfile, 1, 0, monthProfile.events);
    expect(result).toBe('off');
  });

  it('should return previous event state for day 2', () => {
    const result = getDayInitialState(monthProfile, 2, 1, monthProfile.events);
    expect(result).toBe('on');
  });

  it('should return month initial state when no previous events', () => {
    const result = getDayInitialState(monthProfile, 2, 0, monthProfile.events);
    expect(result).toBe('off');
  });

  it('should handle empty events array', () => {
    const emptyProfile = { initial: 'on', events: [] };
    const result = getDayInitialState(emptyProfile, 5, 0, []);
    expect(result).toBe('on');
  });
});

describe('normaliseEventsForDay', () => {
  const events = [
    { state: 'on', timestamp: 720 }, // Day 1, middle
    { state: 'off', timestamp: 2160 }, // Day 2, middle
    { state: 'on', timestamp: 3600 }, // Day 3, middle
    { state: 'off', timestamp: 5040 }, // Day 4, middle
  ];

  it('should handle empty events array', () => {
    expect(normaliseEventsForDay([], 0, 0, 1)).toEqual([]);
  });

  it('should handle invalid positions', () => {
    expect(() => normaliseEventsForDay(events, 0, 10, 1)).toThrow(
      /out of bounds/
    );
  });

  it('should handle startPosition > endPosition', () => {
    expect(normaliseEventsForDay(events, 2, 1, 1)).toEqual([]);
  });

  it('should normalize events for day 1 correctly', () => {
    const result = normaliseEventsForDay(events, 0, 1, 1);
    expect(result).toEqual([{ state: 'on', timestamp: 720 }]);
  });

  it('should normalize events for day 2 correctly', () => {
    const result = normaliseEventsForDay(events, 1, 2, 2);
    expect(result).toEqual([{ state: 'off', timestamp: 720 }]);
  });

  it('should skip events on day boundary', () => {
    const boundaryEvents = [
      { state: 'on', timestamp: 1440 }, // Day 1 boundary
      { state: 'off', timestamp: 2160 }, // Day 2 middle
    ];
    const result = normaliseEventsForDay(boundaryEvents, 0, 1, 1);
    expect(result).toEqual([]);
  });
});

describe('validateDay', () => {
  describe('should accept valid day numbers', () => {
    it('should accept day 1', () => {
      expect(() => validateDay(1)).not.toThrow();
    });

    it('should accept day 365', () => {
      expect(() => validateDay(365)).not.toThrow();
    });
  });

  describe('should throw error for non-integer days', () => {
    it('should throw error for decimal day', () => {
      expect(() => validateDay(3.5)).toThrow(/must be an integer/);
    });

    it('should throw error for string day', () => {
      expect(() => validateDay('5')).toThrow(/must be an integer/);
    });

    it('should throw error for null day', () => {
      expect(() => validateDay(null)).toThrow(/must be an integer/);
    });
  });

  // Note: Yes some of the below tests are very similar to tests above, but I've left them in for clarity.

  describe('should throw error for out of range days', () => {
    it('should throw error for day 0', () => {
      expect(() => validateDay(0)).toThrow(/day out of range/);
    });

    it('should throw error for day -1', () => {
      expect(() => validateDay(-1)).toThrow(/day out of range/);
    });

    it('should throw error for day 366', () => {
      expect(() => validateDay(366)).toThrow(/day out of range/);
    });
  });
});

describe('validateState', () => {
  describe('should accept valid states', () => {
    it('should accept on state', () => {
      expect(() => validateState('on')).not.toThrow();
    });

    it('should accept off state', () => {
      expect(() => validateState('off')).not.toThrow();
    });

    it('should accept auto-off state', () => {
      expect(() => validateState('auto-off')).not.toThrow();
    });
  });

  describe('should throw error for invalid states', () => {
    it('should throw error for invalid state', () => {
      expect(() => validateState('invalid')).toThrow(/invalid state/);
    });

    it('should throw error for null state', () => {
      expect(() => validateState(null)).toThrow(/invalid state/);
    });

    it('should throw error for empty string state', () => {
      expect(() => validateState('')).toThrow(/invalid state/);
    });
  });
});

describe('validateInitialState', () => {
  describe('should accept valid initial states', () => {
    it('should accept on initial state', () => {
      expect(() => validateInitialState('on')).not.toThrow();
    });

    it('should accept off initial state', () => {
      expect(() => validateInitialState('off')).not.toThrow();
    });

    it('should accept auto-off initial state', () => {
      expect(() => validateInitialState('auto-off')).not.toThrow();
    });
  });

  describe('should throw error for invalid initial states', () => {
    it('should throw error for invalid initial state', () => {
      expect(() => validateInitialState('invalid')).toThrow(
        /invalid initial state/
      );
    });

    it('should throw error for null initial state', () => {
      expect(() => validateInitialState(null)).toThrow(/invalid initial state/);
    });

    it('should throw error for empty string initial state', () => {
      expect(() => validateInitialState('')).toThrow(/invalid initial state/);
    });
  });
});

describe('validateTimestamp', () => {
  describe('should accept valid timestamps', () => {
    it('should accept timestamp 0', () => {
      expect(() => validateTimestamp(0)).not.toThrow();
    });

    it('should accept timestamp 1439', () => {
      expect(() => validateTimestamp(1439)).not.toThrow();
    });
  });

  describe('should throw error for invalid timestamps', () => {
    it('should throw error for negative timestamp', () => {
      expect(() => validateTimestamp(-1)).toThrow(/events out of range/);
    });

    it('should throw error for timestamp 1440', () => {
      expect(() => validateTimestamp(1441)).toThrow(/events out of range/);
    });

    it('should throw error for timestamp 2000', () => {
      expect(() => validateTimestamp(2000)).toThrow(/events out of range/);
    });
  });
});

describe('calculateEpochDayBoundaries', () => {
  describe('should calculate correct boundaries for different days', () => {
    it('should calculate boundaries for day 1', () => {
      const result = calculateEpochDayBoundaries(1);
      expect(result).toEqual({ epochDayStart: 0, epochDayEnd: 1440 });
    });

    it('should calculate boundaries for day 2', () => {
      const result = calculateEpochDayBoundaries(2);
      expect(result).toEqual({ epochDayStart: 1440, epochDayEnd: 2880 });
    });

    it('should calculate boundaries for day 10', () => {
      const result = calculateEpochDayBoundaries(10);
      expect(result).toEqual({ epochDayStart: 12960, epochDayEnd: 14400 });
    });
  });

  describe('should handle edge cases', () => {
    it('should calculate boundaries for day 365', () => {
      const result = calculateEpochDayBoundaries(365);
      expect(result).toEqual({ epochDayStart: 524160, epochDayEnd: 525600 });
    });
  });
});

describe('handleEmptyEvents', () => {
  describe('should return correct energy usage for different initial states', () => {
    it('should return 0 for off state', () => {
      const result = handleEmptyEvents('off');
      expect(result).toBe(0);
    });

    it('should return MAX_IN_PERIOD for on state', () => {
      const result = handleEmptyEvents('on');
      expect(result).toBe(MAX_IN_PERIOD);
    });

    it('should return MAX_IN_PERIOD for auto-off state', () => {
      const result = handleEmptyEvents('auto-off');
      expect(result).toBe(MAX_IN_PERIOD);
    });
  });

  describe('should throw error for invalid states', () => {
    it('should throw error for invalid state', () => {
      expect(() => handleEmptyEvents('invalid')).toThrow(
        /invalid initial state/
      );
    });
  });
});
