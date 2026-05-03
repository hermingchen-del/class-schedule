window.Scheduler = (function() {
  const PERSONS = ['A', 'B', 'C', 'D'];

  function getValidPairs(excludePerson = null) {
    const pairs = [
      ['A', 'B'], ['A', 'C'], ['A', 'D'],
      ['B', 'C'], ['C', 'D']
    ]; // ['B', 'D'] is intentionally excluded
    if (!excludePerson) return pairs;
    return pairs.filter(p => !p.includes(excludePerson));
  }

  function getValidTriples() {
    return [
      ['A', 'B', 'C'],
      ['A', 'B', 'D'],
      ['B', 'C', 'D']
    ];
  }

  function hasSplitShift(m, a, n) {
    for (let p of PERSONS) {
      if (m.includes(p) && n.includes(p) && !a.includes(p)) {
        return true;
      }
    }
    return false;
  }

  function generateDayConfigs(dayType) {
    let configs = [];
    let mCandidates, aCandidates, nCandidates;

    if (dayType === 'TueFri') {
      mCandidates = [...getValidTriples(), ...getValidPairs()];
      aCandidates = getValidPairs();
      nCandidates = getValidPairs();
    } else if (dayType === 'Sat1') {
      mCandidates = getValidPairs('D');
      aCandidates = getValidPairs('D');
      nCandidates = getValidPairs('D');
    } else if (dayType === 'Sat2') {
      mCandidates = getValidPairs('A');
      aCandidates = getValidPairs('A');
      nCandidates = getValidPairs('A');
    } else if (dayType === 'Sat3') {
      mCandidates = getValidPairs('B');
      aCandidates = getValidPairs('B');
      nCandidates = getValidPairs('B');
    } else if (dayType === 'Sat4') {
      mCandidates = getValidPairs('C');
      aCandidates = getValidPairs('C');
      nCandidates = getValidPairs('C');
    } else {
      mCandidates = getValidPairs();
      aCandidates = getValidPairs();
      nCandidates = getValidPairs();
    }

    for (let m of mCandidates) {
      for (let a of aCandidates) {
        for (let n of nCandidates) {
          if (!hasSplitShift(m, a, n)) {
            configs.push({ m, a, n });
          }
        }
      }
    }
    return configs;
  }

  const CONFIGS = {
    'Regular': generateDayConfigs('Regular'),
    'TueFri': generateDayConfigs('TueFri'),
    'Sat1': generateDayConfigs('Sat1'),
    'Sat2': generateDayConfigs('Sat2'),
    'Sat3': generateDayConfigs('Sat3'),
    'Sat4': generateDayConfigs('Sat4')
  };

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function calculateScore(schedule) {
    let totalCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    let nightCounts = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };

    for (let day of schedule) {
      if (day.type === 'Sun') continue;
      
      for (let p of day.config.m) totalCounts[p]++;
      for (let p of day.config.a) totalCounts[p]++;
      for (let p of day.config.n) {
        totalCounts[p]++;
        nightCounts[p]++;
      }
    }

    function variance(counts) {
      let vals = Object.values(counts);
      let mean = vals.reduce((a,b)=>a+b, 0) / vals.length;
      return vals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
    }

    // Heavy penalty for uneven shifts
    return variance(totalCounts) * 2 + variance(nightCounts) * 5;
  }

  function getStats(schedule) {
    let total = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
    let night = { 'A': 0, 'B': 0, 'C': 0, 'D': 0 };

    for (let day of schedule) {
      if (day.type === 'Sun') continue;
      for (let p of day.config.m) total[p]++;
      for (let p of day.config.a) total[p]++;
      for (let p of day.config.n) {
        total[p]++;
        night[p]++;
      }
    }
    return { total, night };
  }

  function arraysEqualUnordered(a, b) {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
  }

  function filterConfigsByLocks(configs, locks) {
    if (!locks) return configs;
    return configs.filter(c => {
      if (locks.m && !arraysEqualUnordered(c.m, locks.m)) return false;
      if (locks.a && !arraysEqualUnordered(c.a, locks.a)) return false;
      if (locks.n && !arraysEqualUnordered(c.n, locks.n)) return false;
      return true;
    });
  }

  function generate(year, month, lockedShifts = {}) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let initialSchedule = [];
    let satCount = 0;
    
    let validConfigsPerDay = {};

    for (let date = 1; date <= daysInMonth; date++) {
      let dateObj = new Date(year, month - 1, date);
      let dayOfWeek = dateObj.getDay();

      let type = '';
      if (dayOfWeek === 0) {
        type = 'Sun';
      } else if (dayOfWeek === 2 || dayOfWeek === 5) {
        type = 'TueFri';
      } else if (dayOfWeek === 6) {
        satCount++;
        if (satCount === 1) type = 'Sat1';
        else if (satCount === 2) type = 'Sat2';
        else if (satCount === 3) type = 'Sat3';
        else if (satCount === 4) type = 'Sat4';
        else type = 'Regular';
      } else {
        type = 'Regular';
      }

      if (type === 'Sun') {
        initialSchedule.push({ date, dayOfWeek, type, config: null });
        validConfigsPerDay[date] = [];
      } else {
        let validConfigs = CONFIGS[type];
        if (lockedShifts[date]) {
          validConfigs = filterConfigsByLocks(validConfigs, lockedShifts[date]);
          if (validConfigs.length === 0) {
            throw new Error(`${month}月${date}日的鎖定條件發生衝突（可能違反規則或人數錯誤），請解除部分鎖定後重試。`);
          }
        }
        validConfigsPerDay[date] = validConfigs;
        initialSchedule.push({ date, dayOfWeek, type, config: randomChoice(validConfigs) });
      }
    }

    let bestSchedule = JSON.parse(JSON.stringify(initialSchedule));
    let bestScore = calculateScore(bestSchedule);
    
    let currentSchedule = JSON.parse(JSON.stringify(bestSchedule));
    let currentScore = bestScore;

    const ITERATIONS = 100000;
    let temp = 100.0;
    const coolingRate = Math.pow(0.01 / temp, 1.0 / ITERATIONS);
    
    for (let i = 0; i < ITERATIONS; i++) {
      let mutDayIndex = Math.floor(Math.random() * daysInMonth);
      if (currentSchedule[mutDayIndex].type === 'Sun') continue;

      let date = currentSchedule[mutDayIndex].date;
      let validConfigs = validConfigsPerDay[date];
      
      if (validConfigs.length <= 1) continue;
      
      let oldConfig = currentSchedule[mutDayIndex].config;
      let newConfig = randomChoice(validConfigs);
      while (newConfig === oldConfig && validConfigs.length > 1) {
        newConfig = randomChoice(validConfigs);
      }
      
      currentSchedule[mutDayIndex].config = newConfig;
      let newScore = calculateScore(currentSchedule);
      
      let delta = newScore - currentScore;
      
      // Simulated Annealing acceptance criteria
      if (delta <= 0 || Math.random() < Math.exp(-delta / temp)) {
        currentScore = newScore;
        if (newScore < bestScore) {
          bestScore = newScore;
          bestSchedule = JSON.parse(JSON.stringify(currentSchedule));
        }
      } else {
        currentSchedule[mutDayIndex].config = oldConfig;
      }

      temp *= coolingRate;
      if (bestScore === 0) break;
    }

    return {
      schedule: bestSchedule,
      stats: getStats(bestSchedule)
    };
  }

  return {
    generate,
    getStats
  };
})();
