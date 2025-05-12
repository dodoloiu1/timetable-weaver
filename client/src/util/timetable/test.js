// /**
//  * @fileoverview Timetable generation utility for school scheduling
//  */

// const pdf = require('html-pdf');
// const fs = require('fs');

// /**
//  * Pads a string to the right with spaces
//  * @param {string|number} str - The string to pad
//  * @param {number} length - The target length
//  * @returns {string} - The padded string
//  */
// function padRight(str, length) {
//   if (str === undefined || str === null) {
//     str = "";
//   }
//   return String(str).padEnd(length);
// }

// const DAYS = 5;
// const PERIODS_PER_DAY = 6;

// /**
//  * @typedef {Object} TimeSlot
//  * @property {number} day - The day index (0-based)
//  * @property {number} period - The period index (0-based)
//  */

// /**
//  * Class representing availability of a teacher
//  */
// class Availability {
//   /**
//    * Create an availability instance
//    * @param {number} days - Number of days in the schedule
//    * @param {number} periodsPerDay - Number of periods per day
//    */
//   constructor(days, periodsPerDay) {
//     this.days = days;
//     this.periodsPerDay = periodsPerDay;

//     this.buffer = new Array(days).fill(0);
//   }

//   /**
//    * Set availability for a specific time slot
//    * @param {number} day - Day index
//    * @param {number} period - Period index
//    * @param {boolean} val - Whether the slot is available
//    */
//   set(day, period, val) {
//     let mask = 1 << period;
//     if (val) {
//       this.buffer[day] |= mask;
//     } else {
//       this.buffer[day] &= ~mask;
//     }
//   }

//   /**
//    * Set availability for an entire day
//    * @param {number} day - Day index
//    * @param {boolean} val - Whether the day is available
//    */
//   setDay(day, val) {
//     if (val) {
//       this.buffer[day] = (1 << this.periodsPerDay) - 1;
//     } else {
//       this.buffer[day] = 0;
//     }
//   }

//   /**
//    * Get availability for a specific time slot
//    * @param {number} day - Day index
//    * @param {number} period - Period index
//    * @returns {boolean} - Whether the slot is available
//    */
//   get(day, period) {
//     let mask = 1 << period;
//     return (this.buffer[day] & mask) != 0;
//   }

//   /**
//    * Print availability to console
//    */
//   print() {
//     const maxCellWidth = "Not Available".length;

//     for (let dayIdx = 0; dayIdx < this.buffer.length; dayIdx++) {
//       let dayAvailability = `Day ${dayIdx + 1}: `;

//       for (let periodIdx = 0; periodIdx < this.periodsPerDay; periodIdx++) {
//         if (this.get(dayIdx, periodIdx)) {
//           dayAvailability += ` ${padRight("Available", maxCellWidth)} |`;
//         } else {
//           dayAvailability += ` ${padRight("Not Available", maxCellWidth)} |`;
//         }
//       }
//       console.log(dayAvailability.slice(0, -1));
//     }
//   }

//   /**
//    * Get all available time slots
//    * @returns {TimeSlot[]} - Array of available slots
//    */
//   getAvailableSlots() {
//     const availableSlots = [];
//     for (let day = 0; day < this.days; day++) {
//       for (let period = 0; period < this.periodsPerDay; period++) {
//         if (this.get(day, period)) {
//           availableSlots.push({ day, period });
//         }
//       }
//     }
//     return availableSlots;
//   }
// }

// /**
//  * Class representing a teacher
//  */
// class Teacher {
//   /**
//    * Create a teacher
//    * @param {string} name - Teacher's name
//    * @param {Availability} availability - Teacher's availability
//    */
//   constructor(name, availability) {
//     this.name = name;
//     this.availability = availability;
//   }

//   /**
//    * Check if teacher is available at a specific time
//    * @param {number} day - Day index
//    * @param {number} period - Period index
//    * @returns {boolean} - Whether the teacher is available
//    */
//   isAvailable(day, period) {
//     return this.availability.get(day, period);
//   }
  
//   /**
//    * Get all time slots where the teacher is available
//    * @returns {TimeSlot[]} - Array of available slots
//    */
//   getAvailableSlots() {
//     return this.availability.getAvailableSlots();
//   }
// }

// /**
//  * Class representing a lesson
//  */
// class Lesson {
//   /**
//    * Create a lesson
//    * @param {string} name - Lesson name
//    * @param {Teacher} teacher - Teacher for this lesson
//    * @param {number} periodsPerWeek - Number of periods per week
//    */
//   constructor(name, teacher, periodsPerWeek) {
//     this.name = name;
//     this.teacher = teacher;
//     this.periodsPerWeek = periodsPerWeek;
//   }
// }

// /**
//  * Class representing a school class
//  */
// class Class {
//   /**
//    * Create a class
//    * @param {string} name - Class name
//    * @param {Lesson[]} lessons - Lessons for this class
//    */
//   constructor(name, lessons) {
//     this.name = name;
//     this.lessons = lessons;
//   }

//   /**
//    * Get total periods per week for all lessons
//    * @returns {number} - Total periods per week
//    */
//   getTotalPeriodsPerWeek() {
//     return this.lessons.reduce((sum, lesson) => sum + lesson.periodsPerWeek, 0);
//   }
// }

// /**
//  * Class representing a timetable
//  */
// class Timetable {
//   /**
//    * Create a timetable
//    * @param {Class[]} classes - Classes to schedule
//    */
//   constructor(classes) {
//     this.classes = classes;
//     this.schedule = this.createEmptySchedule();
//     this.initializeNoGaps();
//   }

//   /**
//    * Create an empty schedule
//    * @returns {Object} - Empty schedule object
//    * @private
//    */
//   createEmptySchedule() {
//     const schedule = {};
//     for (const cls of this.classes) {
//       schedule[cls.name] = Array.from({ length: DAYS }, () =>
//         Array(PERIODS_PER_DAY).fill(null)
//       );
//     }
//     return schedule;
//   }

//   /**
//    * Initialize schedule with no gaps
//    * @private
//    */
//   initializeNoGaps() {
//     for (const cls of this.classes) {
//       const schedule = this.schedule[cls.name];
//       let lessonQueue = [];
//       for (const lesson of cls.lessons) {
//         for (let i = 0; i < lesson.periodsPerWeek; i++) {
//           lessonQueue.push(lesson);
//         }
//       }
//       for (let i = lessonQueue.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1));
//         [lessonQueue[i], lessonQueue[j]] = [lessonQueue[j], lessonQueue[i]];
//       }
//       let idx = 0;
//       let unscheduledLessons = [];
//       for (let day = 0; day < DAYS; day++) {
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (idx < lessonQueue.length) {
//             const lesson = lessonQueue[idx];
//             if (
//               lesson.teacher.isAvailable(day, period) &&
//               !this.isTeacherBusy(lesson.teacher, day, period, cls.name)
//             ) {
//               schedule[day][period] = lesson;
//               idx++;
//             } else {
//               let found = false;
//               for (let d = day; d < DAYS && !found; d++) {
//                 for (let p = (d === day ? period + 1 : 0); p < PERIODS_PER_DAY; p++) {
//                   if (
//                     schedule[d][p] === null &&
//                     lesson.teacher.isAvailable(d, p) &&
//                     !this.isTeacherBusy(lesson.teacher, d, p, cls.name)
//                   ) {
//                     schedule[d][p] = lesson;
//                     idx++;
//                     found = true;
//                     break;
//                   }
//                 }
//               }
//               if (!found) {
//                 unscheduledLessons.push(lesson.name + ' (' + lesson.teacher.name + ')');
//                 idx++;
//               }
//             }
//           }
//         }
//       }
//       if (unscheduledLessons.length > 0) {
//         console.warn(`Class ${cls.name}: Could not schedule lessons due to teacher conflicts or availability: ${unscheduledLessons.join(', ')}`);
//       }
//     }
//     this.compactSchedule();
//   }

//   /**
//    * Check if a teacher is busy at a specific time
//    * @param {Teacher} teacher - The teacher to check
//    * @param {number} day - Day index
//    * @param {number} period - Period index
//    * @param {string} skipClassName - Class name to skip in the check
//    * @returns {boolean} - Whether the teacher is busy
//    * @private
//    */
//   isTeacherBusy(teacher, day, period, skipClassName) {
//     for (const cls of this.classes) {
//       if (cls.name === skipClassName) continue;
//       if (this.schedule[cls.name][day][period] && this.schedule[cls.name][day][period].teacher === teacher) {
//         return true;
//       }
//     }
//     return false;
//   }

//   /**
//    * Compact the schedule to avoid gaps
//    * @private
//    */
//   compactSchedule() {
//     for (const cls of this.classes) {
//       const schedule = this.schedule[cls.name];
      
//       for (let day = 0; day < DAYS; day++) {
//         const lessonsForDay = [];
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (schedule[day][period] !== null) {
//             lessonsForDay.push(schedule[day][period]);
//             schedule[day][period] = null;
//           }
//         }
        
//         for (let i = 0; i < lessonsForDay.length; i++) {
//           schedule[day][i] = lessonsForDay[i];
//         }
//       }
//     }
//   }

//   /**
//    * Shuffle an array in place
//    * @param {Array} array - Array to shuffle
//    * @private
//    */
//   shuffleArray(array) {
//     for (let i = array.length - 1; i > 0; i--) {
//       const j = Math.floor(Math.random() * (i + 1));
//       [array[i], array[j]] = [array[j], array[i]];
//     }
//   }

//   /**
//    * Create a clone of this timetable
//    * @returns {Timetable} - Cloned timetable
//    */
//   clone() {
//     const clone = new Timetable(this.classes);
    
//     for (const cls of this.classes) {
//       clone.schedule[cls.name] = Array.from({ length: DAYS }, (_, dayIndex) =>
//         Array.from({ length: PERIODS_PER_DAY }, (_, periodIndex) => 
//           this.schedule[cls.name][dayIndex][periodIndex]
//         )
//       );
//     }
    
//     return clone;
//   }

//   /**
//    * Count teacher conflicts in the schedule
//    * @returns {number} - Number of conflicts
//    */
//   countTeacherConflicts() {
//     let conflicts = 0;
    
//     for (let day = 0; day < DAYS; day++) {
//       for (let period = 0; period < PERIODS_PER_DAY; period++) {
//         const teacherMap = new Map();
        
//         for (const cls of this.classes) {
//           const lesson = this.schedule[cls.name][day][period];
//           if (lesson) {
//             const teacher = lesson.teacher;
            
//             if (!teacher.isAvailable(day, period)) {
//               conflicts++;
//             }
            
//             if (teacherMap.has(teacher.name)) {
//               teacherMap.set(teacher.name, teacherMap.get(teacher.name) + 1);
//             } else {
//               teacherMap.set(teacher.name, 1);
//             }
//           }
//         }
        
//         for (const [_, count] of teacherMap.entries()) {
//           if (count > 1) {
//             conflicts += (count - 1);
//           }
//         }
//       }
//     }
    
//     let distributionPenalty = 0;
//     for (const cls of this.classes) {
//       const schedule = this.schedule[cls.name];
      
//       for (let day = 0; day < DAYS; day++) {
//         for (let period = 0; period < PERIODS_PER_DAY - 1; period++) {
//           const current = schedule[day][period];
//           const next = schedule[day][period + 1];
          
//           if (current && next && current.name === next.name) {
//             distributionPenalty += 0.5;
//           }
//         }
//       }
//     }
    
//     return conflicts + distributionPenalty;
//   }

//   /**
//    * Count unscheduled periods
//    * @returns {number} - Number of unscheduled periods
//    */
//   countUnscheduledPeriods() {
//     let unscheduled = 0;
    
//     for (const cls of this.classes) {
//       const requiredPeriods = cls.getTotalPeriodsPerWeek();
//       let scheduledPeriods = 0;
      
//       for (let day = 0; day < DAYS; day++) {
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (this.schedule[cls.name][day][period] !== null) {
//             scheduledPeriods++;
//           }
//         }
//       }
      
//       unscheduled += (requiredPeriods - scheduledPeriods);
//     }
    
//     return unscheduled;
//   }
  
//   /**
//    * Calculate penalty for empty spaces
//    * @returns {number} - Empty space penalty
//    */
//   countEmptySpacePenalty() {
//     let penalty = 0;
    
//     for (const cls of this.classes) {
//       const schedule = this.schedule[cls.name];
      
//       for (let day = 0; day < DAYS; day++) {
//         let firstLessonPeriod = -1;
//         let lastLessonPeriod = -1;
        
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (schedule[day][period] !== null) {
//             if (firstLessonPeriod === -1) {
//               firstLessonPeriod = period;
//             }
//             lastLessonPeriod = period;
//           }
//         }
        
//         if (firstLessonPeriod !== -1) {
//           for (let period = firstLessonPeriod; period <= lastLessonPeriod; period++) {
//             if (schedule[day][period] === null) {
//               penalty += 1000;
//             }
//           }
//         }
//       }
//     }
    
//     return penalty;
//   }

//   /**
//    * Create a mutated copy of this timetable
//    * @returns {Timetable} - Mutated timetable
//    */
//   mutate() {
//     return this.clone();
//   }

//   /**
//    * Print the timetable to console
//    */
//   print() {
//     const isValid = this.validateNoGaps();
//     if (!isValid) {
//       console.error("WARNING: TIMETABLE CONTAINS GAPS!");
//     }
    
//     const maxLessonNameLength = Math.max(
//       ...this.classes.map(cls =>
//         Math.max(...cls.lessons.map(lesson => lesson.name.length), "Free".length)
//       )
//     );
//     const maxTeacherNameLength = Math.max(
//       ...this.classes.map(cls =>
//         Math.max(...cls.lessons.map(lesson => lesson.teacher.name.length), 0)
//       )
//     );
//     const maxCellWidth = maxLessonNameLength + maxTeacherNameLength + 3;

//     for (const cls of this.classes) {
//       console.log(`Class ${cls.name}:`);
//       const schedule = this.schedule[cls.name];

//       let headerRow = "        ";
//       for (let period = 0; period < PERIODS_PER_DAY; period++) {
//         headerRow += ` ${padRight(`Period ${period + 1}`, maxCellWidth)} |`;
//       }
//       console.log(headerRow.slice(0, -1));
//       console.log("-".repeat(headerRow.length - 1));

//       for (let day = 0; day < DAYS; day++) {
//         let daySchedule = `Day ${day + 1}: `;
        
//         let lessonCount = 0;
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (schedule[day][period] !== null) {
//             lessonCount++;
//           }
//         }

//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           const lesson = schedule[day][period];
//           const isGap = lesson === null && period < lessonCount;
          
//           if (lesson) {
//             const lessonStr = `${lesson.name} (${lesson.teacher.name})`;
//             daySchedule += ` ${padRight(lessonStr, maxCellWidth)} |`;
//           } else {
//             if (isGap) {
//               daySchedule += ` ${padRight("GAP ERROR", maxCellWidth)} |`;
//             } else {
//               daySchedule += ` ${padRight("Free", maxCellWidth)} |`;
//             }
//           }
//         }

//         console.log(daySchedule.slice(0, -1));
//       }

//       console.log("");
//     }
    
//     const conflicts = this.countTeacherConflicts();
//     const unscheduled = this.countUnscheduledPeriods();
//     const emptySpaces = this.countEmptySpacePenalty();
    
//     console.log("Schedule Quality Metrics:");
//     console.log(`- Teacher conflicts: ${conflicts}`);
//     console.log(`- Unscheduled periods: ${unscheduled}`);
//     console.log(`- Empty space penalties: ${emptySpaces > 0 ? "ERROR: " + emptySpaces : 0}`);
//     console.log(`- Total penalties: ${conflicts + unscheduled + emptySpaces}`);
//     if (emptySpaces > 0) {
//       console.error("ERROR: SCHEDULE CONTAINS GAPS BETWEEN LESSONS!");
//     } else {
//       console.log("✓ No gaps in class schedules");
//     }
//     console.log("");
//   }

//   /**
//    * Validate that the schedule has no gaps
//    * @returns {boolean} - Whether the schedule is valid
//    */
//   validateNoGaps() {
//     let hasGaps = false;
    
//     for (const cls of this.classes) {
//       const schedule = this.schedule[cls.name];
      
//       for (let day = 0; day < DAYS; day++) {
//         let firstNull = -1;
//         let lessonAfterNull = false;
        
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           if (schedule[day][period] === null) {
//             if (firstNull === -1) {
//               firstNull = period;
//             }
//           } else if (firstNull !== -1) {
//             lessonAfterNull = true;
//             break;
//           }
//         }
        
//         if (firstNull !== -1 && lessonAfterNull) {
//           console.error(`FOUND GAP in Class ${cls.name}, Day ${day + 1}: lesson after period ${firstNull}`);
//           hasGaps = true;
//         }
//       }
//     }
    
//     return !hasGaps;
//   }

//   /**
//    * Export the timetable to a PDF file
//    * @param {string} [filename='timetable.pdf'] - Output filename
//    * @returns {Promise<string>} - Promise resolving to the filename
//    */
//   exportToPDF(filename = 'timetable.pdf') {
//     let html = `
//       <html>
//       <head>
//         <title>School Timetable</title>
//         <style>
//           body { font-family: Arial, sans-serif; margin: 20px; }
//           h1 { color: #333366; }
//           h2 { color: #333366; margin-top: 20px; }
//           table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
//           th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
//           th { background-color: #f2f2f2; }
//           .free { color: #999999; }
//           .metrics { margin-top: 30px; border-top: 1px solid #dddddd; padding-top: 20px; }
//           .error { color: red; font-weight: bold; }
//         </style>
//       </head>
//       <body>
//         <h1>School Timetable</h1>
//     `;
    
//     for (const cls of this.classes) {
//       html += `<h2>Class ${cls.name}</h2>`;
//       html += '<table><tr><th>Day/Period</th>';
      
//       for (let period = 0; period < PERIODS_PER_DAY; period++) {
//         html += `<th>Period ${period + 1}</th>`;
//       }
//       html += '</tr>';
      
//       const schedule = this.schedule[cls.name];
//       for (let day = 0; day < DAYS; day++) {
//         html += `<tr><th>Day ${day + 1}</th>`;
        
//         for (let period = 0; period < PERIODS_PER_DAY; period++) {
//           const lesson = schedule[day][period];
//           if (lesson) {
//             html += `<td>${lesson.name}<br/>(${lesson.teacher.name})</td>`;
//           } else {
//             html += '<td class="free">Free</td>';
//           }
//         }
        
//         html += '</tr>';
//       }
      
//       html += '</table>';
//     }
    
//     const conflicts = this.countTeacherConflicts();
//     const unscheduled = this.countUnscheduledPeriods();
//     const emptySpaces = this.countEmptySpacePenalty();
    
//     html += `
//       <div class="metrics">
//         <h2>Schedule Quality Metrics</h2>
//         <p>• Teacher conflicts: ${conflicts}</p>
//         <p>• Unscheduled periods: ${unscheduled}</p>
//         <p class="${emptySpaces > 0 ? 'error' : ''}">• Empty space penalties: ${emptySpaces > 0 ? "ERROR: " + emptySpaces : "0"}</p>
//         <p>• Total penalties: ${conflicts + unscheduled + emptySpaces}</p>
//         ${emptySpaces > 0 
//           ? '<p class="error">ERROR: SCHEDULE CONTAINS GAPS BETWEEN LESSONS!</p>' 
//           : '<p>✓ No gaps in class schedules</p>'}
//       </div>
//     `;
    
//     html += '</body></html>';
    
//     const htmlFile = 'timetable.html';
//     fs.writeFileSync(htmlFile, html);
    
//     const options = { 
//       format: 'A4',
//       orientation: 'landscape',
//       border: {
//         top: '10mm',
//         right: '10mm',
//         bottom: '10mm',
//         left: '10mm'
//       }
//     };
    
//     return new Promise((resolve, reject) => {
//       pdf.create(html, options).toFile(filename, (err, res) => {
//         if (err) {
//           console.error("Error generating PDF:", err);
//           reject(err);
//         } else {
//           console.log(`Timetable exported to ${filename}`);
//           try {
//             fs.unlinkSync(htmlFile);
//           } catch (e) {
//             console.warn("Could not remove temporary HTML file:", e);
//           }
//           resolve(filename);
//         }
//       });
//     });
//   }
// }

// /**
//  * Class for scheduling timetables
//  */
// class Scheduler {
//   /**
//    * Create a scheduler
//    * @param {Class[]} classes - Classes to schedule
//    * @param {number} [maxIterations=1000] - Maximum iterations
//    * @param {number} [maxStagnantIterations=100] - Maximum iterations without improvement
//    */
//   constructor(classes, maxIterations = 1000, maxStagnantIterations = 100) {
//     this.classes = classes;
//     this.maxIterations = maxIterations;
//     this.maxStagnantIterations = maxStagnantIterations;
//   }

//   /**
//    * Generate a timetable
//    * @returns {Timetable} - Generated timetable
//    */
//   generateTimetable() {
//     let current = new Timetable(this.classes);
    
//     let currentFitness = this.calculateFitness(current);
//     let best = current.clone();
//     let bestFitness = currentFitness;
    
//     let temperature = 1.0;
//     const coolingRate = 0.995;
//     const minTemperature = 0.01;
    
//     let stagnantIterations = 0;
    
//     console.log("Starting optimization...");
    
//     for (let i = 0; i < this.maxIterations && temperature > minTemperature; i++) {
//       const mutated = current.mutate();
      
//       const mutatedFitness = this.calculateFitness(mutated);
      
//       const emptySpacePenalty = mutated.countEmptySpacePenalty();
//       if (emptySpacePenalty > 0) {
//         continue;
//       }
      
//       const acceptanceProbability = this.calculateAcceptanceProbability(
//         currentFitness, 
//         mutatedFitness, 
//         temperature
//       );
      
//       if (Math.random() < acceptanceProbability) {
//         current = mutated;
//         currentFitness = mutatedFitness;
        
//         if (mutatedFitness < bestFitness) {
//           best = mutated.clone();
//           bestFitness = mutatedFitness;
//           stagnantIterations = 0;
//         } else {
//           stagnantIterations++;
//         }
//       } else {
//         stagnantIterations++;
//       }
      
//       if (i % 100 === 0 || i === this.maxIterations - 1) {
//         console.log(`Iteration ${i}, Temperature: ${temperature.toFixed(4)}, Current Fitness: ${currentFitness}, Best Fitness: ${bestFitness}`);
//       }
      
//       if (bestFitness === 0) {
//         console.log(`Perfect solution found at iteration ${i}`);
//         break;
//       }
      
//       if (stagnantIterations >= this.maxStagnantIterations) {
//         console.log(`No improvement for ${this.maxStagnantIterations} iterations, stopping`);
//         break;
//       }
      
//       temperature *= coolingRate;
//     }
    
//     best.compactSchedule();
    
//     return best;
//   }
  
//   /**
//    * Calculate fitness of a timetable
//    * @param {Timetable} timetable - Timetable to evaluate
//    * @returns {number} - Fitness score (lower is better)
//    * @private
//    */
//   calculateFitness(timetable) {
//     const conflicts = timetable.countTeacherConflicts();
//     const unscheduled = timetable.countUnscheduledPeriods();
//     const emptySpacePenalty = timetable.countEmptySpacePenalty();
    
//     return conflicts + (unscheduled * 2) + emptySpacePenalty;
//   }
  
//   /**
//    * Calculate probability of accepting a new solution
//    * @param {number} currentFitness - Current fitness
//    * @param {number} newFitness - New fitness
//    * @param {number} temperature - Current temperature
//    * @returns {number} - Acceptance probability
//    * @private
//    */
//   calculateAcceptanceProbability(currentFitness, newFitness, temperature) {
//     if (newFitness < currentFitness) {
//       return 1.0;
//     }
    
//     const delta = currentFitness - newFitness;
//     return Math.exp(delta / temperature);
//   }
// }

// // Export the classes and constants
// module.exports = {
//   DAYS,
//   PERIODS_PER_DAY,
//   Availability,
//   Teacher,
//   Lesson,
//   Class,
//   Timetable,
//   Scheduler
// };
