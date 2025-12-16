// ==================== STRETCHING ROUTINE PARSER ====================

/**
 * Parses LLM text output into exercise cards
 * @param {string} routineText - Raw text from LLM
 * @returns {Array} Array of exercise objects
 */
function parseRoutineToCards(routineText) {
    const exercises = [];
    const lines = routineText.split('\n');
    let currentExercise = null;
    
    for (let line of lines) {
        const match = line.match(/\*\*(.+?)\*\*\s*[-–—]\s*(.+)/);
        
        if (match) {
            if (currentExercise) {
                exercises.push(currentExercise);
            }
            currentExercise = {
                name: match[1].trim(),
                duration: match[2].trim(),
                description: ""
            };
        } else if (currentExercise && line.trim()) {
            currentExercise.description += line.trim() + ' ';
        }
    }
    
    if (currentExercise) {
        exercises.push(currentExercise);
    }
    
    return exercises;
}


// ==================== TRAINING PLAN PARSER ====================

/**
 * Parses training plan text into structured weeks/workouts
 * @param {string} text - Raw training plan text
 * @returns {Object} Structured plan with weeks array
 */
function parsePlanText(text) {
    const plan = { intro: '', weeks: [], tips: '' };
    const lines = text.split('\n');
    let currentWeek = null;
    let currentDay = null;
    let currentSection = 'intro';
    let currentWorkout = ''; // Buffer for multi-line workouts
    
    const flushWorkout = () => {
      if (currentWorkout && currentDay) {
        currentDay.workouts.push(currentWorkout.trim());
        currentWorkout = '';
      }
    };
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      // Check for week header
      const weekMatch = line.match(/\*\*Week\s+(\d+)/i);
      if (weekMatch) {
        flushWorkout();
        if (currentWeek) plan.weeks.push(currentWeek);
        currentWeek = { number: weekMatch[1], days: [], description: '' };
        currentDay = null;
        currentSection = 'week';
        continue;
      }
      
      // Check for day header
      const dayMatch = line.match(/\*\*(Day|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*(\d*)/i);
      if (dayMatch && currentWeek) {
        flushWorkout();
        if (currentDay) currentWeek.days.push(currentDay);
        currentDay = { name: line.replace(/\*\*/g, ''), workouts: [] };
        continue;
      }
      
      // Check for tips section
      if (line.match(/\*\*Tips|\*\*Advice|\*\*Notes|\*\*Important/i)) {
        flushWorkout();
        if (currentWeek) plan.weeks.push(currentWeek);
        currentWeek = null;
        currentDay = null;
        currentSection = 'tips';
        continue;
      }
      
      // Add content to appropriate section
      if (currentSection === 'intro' && !currentWeek) {
        plan.intro += line + ' ';
      } else if (currentDay) {
        // Check if this line starts a new workout (bullets, numbers, or workout type keywords)
        const isNewWorkout = /^[-•*\d]+[\.)]\s+|^\*\*[A-Z]|^(Rest|Easy|Recovery|Tempo|Interval|Long|Speed|Hill|Fartlek|Threshold)/i.test(line);
        
        if (isNewWorkout && currentWorkout) {
          // Flush previous workout
          flushWorkout();
        }
        
        // Add to current workout buffer (with space if continuing)
        currentWorkout += (currentWorkout ? ' ' : '') + line;
      } else if (currentWeek) {
        currentWeek.description += line + ' ';
      } else if (currentSection === 'tips') {
        plan.tips += line + ' ';
      }
    }
    
    flushWorkout();
    if (currentDay && currentWeek) currentWeek.days.push(currentDay);
    if (currentWeek) plan.weeks.push(currentWeek);
    
    return plan;
}

/**
 * Extracts clean workout name from workout text
 * @param {Array} workouts - Array of workout strings
 * @returns {string} Clean workout name
 */
function extractWorkoutName(workouts) {
    if (!workouts || workouts.length === 0) return '';
    
    let text = workouts[0];
    
    // Remove markdown formatting and clean up
    text = text.replace(/\*\*/g, '').trim();
    text = text.replace(/^\d+[\.\)]\s*/, ''); // Remove leading numbers
    text = text.replace(/^[-–—•*]+\s*/, ''); // Remove leading bullets
    
    // Pattern 1: Explicit workout type at start (e.g., "Easy Run: ..." or "Long Run - ...")
    const explicitMatch = text.match(/^((?:Easy|Long|Recovery|Tempo|Interval|Speed|Hill|Fartlek|Threshold|Base|Foundation|Endurance|Progressive)\s+(?:Run|Ride|Swim|Session|Workout))[:\-–—•]/i);
    if (explicitMatch) {
      return explicitMatch[1].trim();
    }
    
    // Pattern 2: Text before colon ("Morning Run: 5km...")
    const colonMatch = text.match(/^([^:]+?):\s/);
    if (colonMatch) {
      const name = colonMatch[1].trim();
      if (name.length >= 3 && name.length <= 50 && !/^\d+/.test(name) && !/(km|mi|bpm|zone|hr|pace)/i.test(name)) {
        return name;
      }
    }
    
    // Pattern 3: Text before em dash or bullet
    const dashMatch = text.match(/^([^–—•]+)[–—•]/);
    if (dashMatch) {
      const name = dashMatch[1].trim();
      if (name.length >= 3 && name.length <= 50 && !/^\d+/.test(name) && !/(km|mi|bpm|zone|hr|pace)/i.test(name)) {
        return name;
      }
    }
    
    // Pattern 4: Text before distance
    const distMatch = text.match(/^(.*?)\s+\d+(?:\.\d+)?\s*(?:km|k|mi|miles)/i);
    if (distMatch) {
      let name = distMatch[1].trim();
      name = name.replace(/[,\.]+$/, ''); // Remove trailing punctuation
      if (name.length >= 3 && name.length <= 50 && !/^\d+/.test(name)) {
        return name;
      }
    }
    
    // Pattern 5: Text before HR/Zone
    const hrMatch = text.match(/^(.*?)\s+(?:HR|Heart Rate|Zone|@)/i);
    if (hrMatch) {
      let name = hrMatch[1].trim();
      name = name.replace(/[,\.]+$/, '');
      if (name.length >= 3 && name.length <= 50 && !/^\d+/.test(name)) {
        return name;
      }
    }
    
    // Fallback: first 3-6 meaningful words, stopping at numbers/stats
    const words = text.split(/\s+/).filter(w => w.length > 0);
    let name = '';
    let wordCount = 0;
    for (let i = 0; i < words.length && wordCount < 6; i++) {
      const word = words[i];
      // Stop if we hit a stat, number, or long word (likely description)
      if (/^\d+/.test(word) || /^(?:km|k|mi|HR|Zone|Pace|@|bpm)/i.test(word) || word.length > 20) break;
      name += (name ? ' ' : '') + word;
      wordCount++;
      if (name.length > 40) break;
    }
    
    return name.trim() || text.substring(0, 40).trim();
}

/**
 * Parses detailed workout information
 * @param {string} workout - Workout text string
 * @returns {Object} Parsed workout details
 */
function parseWorkoutDetails(workout) {
    const details = {
      name: '',
      distance: '',
      heartRate: '',
      pace: '',
      description: ''
    };
    
    // Clean up the text
    let text = workout.replace(/\*\*/g, '').trim();
    text = text.replace(/^\d+\.?\s*[-–—•]\s*/, '');
    
    // ========== EXTRACT NAME ==========
    let nameMatch = text.match(/^([^:•]+?):/);
    if (!nameMatch) nameMatch = text.match(/^([^•]+?)•/);
    if (!nameMatch) nameMatch = text.match(/^(.*?)(?=\s+\d+(?:\.\d+)?\s*(?:km|k|mi|miles))/i);
    if (!nameMatch) nameMatch = text.match(/^(.*?)(?=\s+(?:HR|Heart Rate|Zone|Pace))/i);
    
    if (nameMatch) {
      details.name = nameMatch[1].trim();
    } else {
      const words = text.split(/\s+/);
      let name = '';
      for (let i = 0; i < Math.min(5, words.length); i++) {
        if (/^\d/.test(words[i])) break;
        name += (name ? ' ' : '') + words[i];
      }
      details.name = name || 'Workout';
    }
    
    // ========== EXTRACT DISTANCE ==========
    const distPatterns = [
      /(\d+(?:\.\d+)?)\s*km(?!\w)/i,
      /(\d+(?:\.\d+)?)\s*k(?!\w)/i,
      /(\d+(?:\.\d+)?)\s*kilometers?/i,
      /(\d+(?:\.\d+)?)\s*miles?/i,
      /(\d+(?:\.\d+)?)\s*mi(?!\w)/i
    ];
    
    for (const pattern of distPatterns) {
      const match = text.match(pattern);
      if (match) {
        details.distance = match[1] + 'km';
        break;
      }
    }
    
    // ========== EXTRACT HEART RATE ==========
    const hrPatterns = [
      /HR[:\s]+(\d+\s*-\s*\d+)\s*(?:bpm|%)?/i,
      /Heart\s*Rate[:\s]+(\d+\s*-\s*\d+)\s*(?:bpm|%)?/i,
      /Zone\s+(\d+)/i,
      /(\d+\s*-\s*\d+)\s*bpm/i,
      /(\d+\s*-\s*\d+)\s*%\s*(?:max|MHR)/i,
      /HR[:\s]+Zone\s+(\d+)/i,
      /HR[:\s]+(\d+-\d+)/i
    ];
    
    for (const pattern of hrPatterns) {
      const match = text.match(pattern);
      if (match) {
        let hr = match[1];
        if (/^Zone\s+\d+/i.test(match[0])) {
          details.heartRate = `Zone ${hr}`;
        } else if (/^\d+$/.test(hr)) {
          details.heartRate = `Zone ${hr}`;
        } else {
          details.heartRate = hr;
        }
        break;
      }
    }
    
    // ========== EXTRACT PACE ==========
    const pacePatterns = [
      /Pace[:\s]+(\d+:\d+)\s*(?:\/|per)?\s*km/i,
      /Pace[:\s]+(easy|moderate|tempo|steady|recovery|comfortable|conversational|fast|slow)/i,
      /@\s*(\d+:\d+)\s*(?:\/|per)?\s*km/i,
      /(\d+:\d+)\s*(?:\/|per)\s*km/i,
      /(?:at|@)\s+(?:an?\s+)?(easy|moderate|tempo|steady|recovery|comfortable|conversational)\s*pace/i
    ];
    
    for (const pattern of pacePatterns) {
      const match = text.match(pattern);
      if (match) {
        let pace = match[1];
        if (!/\d/.test(pace)) {
          pace = pace.charAt(0).toUpperCase() + pace.slice(1).toLowerCase() + ' pace';
        }
        details.pace = pace;
        break;
      }
    }
    
    // ========== EXTRACT DESCRIPTION ==========
    let description = text;
    
    // Remove the name part if present
    if (details.name) {
      const nameEscaped = details.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      description = description.replace(new RegExp('^' + nameEscaped + '[:\\s•\-–—]*', 'i'), '');
    }
    
    // Remove all stats but keep descriptive text
    description = description.replace(/\d+(?:\.\d+)?\s*(?:km|k|kilometers?|miles?|mi)(?!\s*\/)/gi, '');
    description = description.replace(/HR[:\s]+\d+\s*-?\s*\d*\s*(?:bpm|%)?/gi, '');
    description = description.replace(/Heart\s*Rate[:\s]+\d+\s*-?\s*\d*\s*(?:bpm|%)?/gi, '');
    description = description.replace(/Zone\s+\d+(?:-\d+)?/gi, '');
    description = description.replace(/(?:Pace|@)[:\s]+\d+:\d+\s*(?:min\s*)?(?:\/|per)?\s*km/gi, '');
    description = description.replace(/[:\-–—•]+/g, '').trim();
    description = description.replace(/\s+/g, ' ');
    description = description.replace(/^[\s,\.]+/, '');
    
    // Extract 2-4 sentences to include benefits/purpose
    const sentences = description.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 0) {
      // Take up to 4 sentences to capture workout purpose and benefits
      const numSentences = Math.min(4, sentences.length);
      description = sentences.slice(0, numSentences).join(' ').trim();
    } else if (description.length > 0) {
      // No clear sentence structure - take up to 300 chars
      description = description.substring(0, 300).trim();
      if (text.length > 300) description += '...';
    } else {
      description = 'Complete this workout as prescribed to build your fitness and progress toward your goals.';
    }
    
    details.description = description;
    
    return details;
}

/**
 * Detects workout intensity from text
 * @param {string} text - Workout text
 * @returns {string} Intensity level (easy, moderate, hard, recovery)
 */
function detectIntensity(text) {
    const lowerText = text.toLowerCase();
    if (/easy|recovery|light|warm.*up|cool.*down/i.test(lowerText)) return 'easy';
    if (/hard|intense|max|threshold|vo2/i.test(lowerText)) return 'hard';
    if (/moderate|tempo|steady/i.test(lowerText)) return 'moderate';
    if (/rest/i.test(lowerText)) return 'recovery';
    return 'moderate';
}

/**
 * Maps workouts to calendar dates
 * @param {Object} plan - Parsed plan object with weeks array
 * @param {Date} startDate - Plan start date
 * @returns {Object} Map of date strings to workout arrays
 */
function mapWorkoutsToCalendar(plan) {
    const workoutMap = {};
    let currentDate = new Date(planStartDate);
    
    plan.weeks.forEach(week => {
      week.days.forEach(day => {
        const dateStr = currentDate.toISOString().split('T')[0];
        workoutMap[dateStr] = day.workouts;
        currentDate.setDate(currentDate.getDate() + 1);
      });
    });
    
    return workoutMap;
}

/**
 * Extracts workout statistics for calendar week summaries
 * @param {Array} workouts - Array of workout strings
 * @returns {Object} Stats object with distance and duration
 */
function extractWorkoutStats(workouts) {
    let distance = 0;
    let duration = 0;
    
    workouts.forEach(workout => {
      const lower = workout.toLowerCase();
      
      // Extract distance (km or miles)
      const distMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:km|k|miles?|mi)/i);
      if (distMatch) {
        distance += parseFloat(distMatch[1]);
      }
      
      // Extract duration (minutes or hours)
      const durMatch = lower.match(/(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
      if (durMatch) {
        const value = parseInt(durMatch[1]);
        if (lower.includes('hr') || lower.includes('hour')) {
          duration += value * 60;
        } else {
          duration += value;
        }
      }
    });
    
    return { distance, duration };
}
