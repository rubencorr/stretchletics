// Export utilities for training plan formats

/**
 * Export training plan as FIT file
 */
function exportAsFIT(trainingPlanData, planName, planStartDate, selectedSport, parsePlanText, parseWorkoutDetails) {
  if (!trainingPlanData) {
    throw new Error('No training plan data available');
  }

  const parsedPlan = parsePlanText(trainingPlanData);
  const fitData = generateFITFile(parsedPlan, planStartDate, selectedSport, parseWorkoutDetails);
  
  // Create blob and download
  const blob = new Blob([fitData], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = (planName || 'training-plan').replace(/\s+/g, '-').toLowerCase();
  a.download = `${fileName}.fit`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate FIT file binary data
 */
function generateFITFile(plan, planStartDate, selectedSport, parseWorkoutDetails) {
  const workouts = [];
  
  if (plan.weeks && plan.weeks.length > 0) {
    plan.weeks.forEach((week, weekIndex) => {
      if (week.days) {
        week.days.forEach((day, dayIndex) => {
          if (day.workouts && day.workouts.length > 0) {
            const dateOffset = (weekIndex * 7) + dayIndex;
            const workoutDate = new Date(planStartDate);
            workoutDate.setDate(workoutDate.getDate() + dateOffset);
            
            day.workouts.forEach(workout => {
              const workoutDetails = parseWorkoutDetails(workout);
              workouts.push({
                date: workoutDate,
                name: workoutDetails.name || workout.substring(0, 50),
                sport: getSportType(selectedSport),
                distance: workoutDetails.distance,
                duration: estimateDuration(workoutDetails),
                description: workout
              });
            });
          }
        });
      }
    });
  }
  
  return encodeFITFile(workouts);
}

/**
 * Map sport names to FIT sport type codes
 */
function getSportType(sport) {
  const sportMap = {
    'running': 1,
    'cycling': 2,
    'swimming': 5,
    'triathlon': 1 // Default to running
  };
  return sportMap[sport] || 1;
}

/**
 * Estimate workout duration based on distance and pace
 */
function estimateDuration(details) {
  if (details.distance && details.pace) {
    const paceMinutes = parsePace(details.pace);
    if (paceMinutes > 0) {
      return Math.round(details.distance * paceMinutes * 60);
    }
  }
  
  // Default estimates based on distance
  if (details.distance) {
    if (details.distance <= 5) return 1800; // 30 min
    if (details.distance <= 10) return 3600; // 60 min
    if (details.distance <= 21) return 7200; // 2 hours
    return 10800; // 3 hours
  }
  return 3600; // Default 1 hour
}

/**
 * Parse pace string to minutes per km
 */
function parsePace(paceStr) {
  const match = paceStr.match(/(\d+):(\d+)/);
  if (match) {
    return parseInt(match[1]) + parseInt(match[2]) / 60;
  }
  return 0;
}

/**
 * Encode workouts into FIT file binary format
 */
function encodeFITFile(workouts) {
  const buffer = new ArrayBuffer(1024 + (workouts.length * 256));
  const view = new DataView(buffer);
  let offset = 0;
  
  // FIT File Header (14 bytes)
  view.setUint8(offset++, 14); // Header size
  view.setUint8(offset++, 0x10); // Protocol version
  view.setUint16(offset, 2105, true); offset += 2; // Profile version
  
  let dataSize = 0; // Will be updated later
  view.setUint32(offset, dataSize, true); offset += 4;
  
  // ".FIT" signature
  view.setUint8(offset++, 0x2E); // '.'
  view.setUint8(offset++, 0x46); // 'F'
  view.setUint8(offset++, 0x49); // 'I'
  view.setUint8(offset++, 0x54); // 'T'
  
  const dataStart = offset;
  
  // File ID Message (mandatory)
  offset = writeFileIdMessage(view, offset);
  
  // Write workout messages
  workouts.forEach((workout, index) => {
    offset = writeWorkoutMessage(view, offset, workout, index);
  });
  
  // Update data size
  dataSize = offset - dataStart;
  view.setUint32(4, dataSize, true);
  
  // Calculate CRC
  const crc = calculateCRC(new Uint8Array(buffer, 0, offset));
  view.setUint16(offset, crc, true); offset += 2;
  
  return buffer.slice(0, offset);
}

/**
 * Write FIT File ID message
 */
function writeFileIdMessage(view, offset) {
  // Definition message for File ID (message type 0)
  view.setUint8(offset++, 0x40); // Definition message, local message 0
  view.setUint8(offset++, 0x00); // Reserved
  view.setUint8(offset++, 0x00); // Architecture (little endian)
  view.setUint16(offset, 0, true); offset += 2; // Global message number (0 = file_id)
  view.setUint8(offset++, 4); // Number of fields
  
  // Field definitions
  view.setUint8(offset++, 0); // Field 0: type
  view.setUint8(offset++, 1); // Size 1 byte
  view.setUint8(offset++, 0x00); // Base type: enum
  
  view.setUint8(offset++, 1); // Field 1: manufacturer
  view.setUint8(offset++, 2); // Size 2 bytes
  view.setUint8(offset++, 0x84); // Base type: uint16
  
  view.setUint8(offset++, 2); // Field 2: product
  view.setUint8(offset++, 2); // Size 2 bytes
  view.setUint8(offset++, 0x84); // Base type: uint16
  
  view.setUint8(offset++, 4); // Field 4: time_created
  view.setUint8(offset++, 4); // Size 4 bytes
  view.setUint8(offset++, 0x86); // Base type: uint32
  
  // Data message for File ID
  view.setUint8(offset++, 0x00); // Data message, local message 0
  view.setUint8(offset++, 4); // Type: activity file
  view.setUint16(offset, 0xFFFF, true); offset += 2; // Manufacturer: development
  view.setUint16(offset, 0, true); offset += 2; // Product
  view.setUint32(offset, dateToFITTimestamp(new Date()), true); offset += 4; // Time created
  
  return offset;
}

/**
 * Write FIT Workout message
 */
function writeWorkoutMessage(view, offset, workout, index) {
  // Definition message for Workout (message type 26)
  view.setUint8(offset++, 0x41); // Definition message, local message 1
  view.setUint8(offset++, 0x00); // Reserved
  view.setUint8(offset++, 0x00); // Architecture (little endian)
  view.setUint16(offset, 26, true); offset += 2; // Global message number (26 = workout)
  view.setUint8(offset++, 3); // Number of fields
  
  // Field definitions
  view.setUint8(offset++, 4); // Field 4: sport
  view.setUint8(offset++, 1); // Size 1 byte
  view.setUint8(offset++, 0x00); // Base type: enum
  
  view.setUint8(offset++, 5); // Field 5: capabilities
  view.setUint8(offset++, 4); // Size 4 bytes
  view.setUint8(offset++, 0x8C); // Base type: uint32z
  
  view.setUint8(offset++, 8); // Field 8: wkt_name
  view.setUint8(offset++, 16); // Size 16 bytes
  view.setUint8(offset++, 0x07); // Base type: string
  
  // Data message for Workout
  view.setUint8(offset++, 0x01); // Data message, local message 1
  view.setUint8(offset++, workout.sport); // Sport type
  view.setUint32(offset, 0x00000020, true); offset += 4; // Capabilities
  
  // Workout name (16 bytes, null-terminated)
  const name = workout.name.substring(0, 15);
  for (let i = 0; i < 16; i++) {
    view.setUint8(offset++, i < name.length ? name.charCodeAt(i) : 0);
  }
  
  return offset;
}

/**
 * Convert JavaScript Date to FIT timestamp
 */
function dateToFITTimestamp(date) {
  // FIT timestamps are seconds since UTC 00:00 Dec 31 1989
  const fitEpoch = new Date('1989-12-31T00:00:00Z').getTime();
  return Math.floor((date.getTime() - fitEpoch) / 1000);
}

/**
 * Calculate CRC checksum for FIT file
 */
function calculateCRC(data) {
  const crcTable = new Uint16Array(16);
  for (let i = 0; i < 16; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
    }
    crcTable[i] = crc;
  }
  
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    let tmp = crcTable[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ crcTable[byte & 0xF];
    tmp = crcTable[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xF];
  }
  
  return crc;
}

/**
 * Export training plan as ICS (iCalendar) file
 */
function exportAsICS(trainingPlanData, planName, planStartDate, parsePlanText, parseWorkoutDetails) {
  if (!trainingPlanData) {
    throw new Error('No training plan data available');
  }

  const parsedPlan = parsePlanText(trainingPlanData);
  const icsData = generateICSFile(parsedPlan, planStartDate, planName, parseWorkoutDetails);
  
  // Create blob and download
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = (planName || 'training-plan').replace(/\s+/g, '-').toLowerCase();
  a.download = `${fileName}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate ICS (iCalendar) file content
 */
function generateICSFile(plan, planStartDate, planName, parseWorkoutDetails) {
  let ics = 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//Stretchletics//Training Plan//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:PUBLISH\r\n';
  ics += `X-WR-CALNAME:${planName || 'Training Plan'}\r\n`;
  ics += 'X-WR-TIMEZONE:UTC\r\n';
  
  if (plan.weeks && plan.weeks.length > 0) {
    plan.weeks.forEach((week, weekIndex) => {
      if (week.days) {
        week.days.forEach((day, dayIndex) => {
          if (day.workouts && day.workouts.length > 0) {
            const dateOffset = (weekIndex * 7) + dayIndex;
            const workoutDate = new Date(planStartDate);
            workoutDate.setDate(workoutDate.getDate() + dateOffset);
            
            day.workouts.forEach((workout, workoutIndex) => {
              const workoutDetails = parseWorkoutDetails(workout);
              const uid = `workout-${weekIndex}-${dayIndex}-${workoutIndex}@stretchletics.com`;
              
              ics += 'BEGIN:VEVENT\r\n';
              ics += `UID:${uid}\r\n`;
              ics += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
              ics += `DTSTART:${formatICSDate(workoutDate)}\r\n`;
              
              // Set end time (assume 1 hour if not specified)
              const endDate = new Date(workoutDate);
              endDate.setHours(endDate.getHours() + 1);
              ics += `DTEND:${formatICSDate(endDate)}\r\n`;
              
              const summary = workoutDetails.name || `Workout - Week ${weekIndex + 1} Day ${dayIndex + 1}`;
              ics += `SUMMARY:${escapeICSText(summary)}\r\n`;
              ics += `DESCRIPTION:${escapeICSText(workout)}\r\n`;
              ics += 'STATUS:CONFIRMED\r\n';
              ics += 'END:VEVENT\r\n';
            });
          }
        });
      }
    });
  }
  
  ics += 'END:VCALENDAR\r\n';
  return ics;
}

/**
 * Format date for ICS file (YYYYMMDDTHHMMSSZ)
 */
function formatICSDate(date) {
  const pad = (n) => n.toString().padStart(2, '0');
  return date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z';
}

/**
 * Escape special characters for ICS text fields
 */
function escapeICSText(text) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}
