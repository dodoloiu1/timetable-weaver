/**
 * @fileoverview Timetable generation utility for school scheduling
 */

// Add declaration for html-pdf module
declare module 'html-pdf';

import * as pdf from 'html-pdf';
import * as fs from 'fs';

/**
 * Pads a string to the right with spaces
 * @param str - The string to pad
 * @param length - The target length
 * @returns The padded string
 */
function padRight(str: string | number | null | undefined, length: number): string {
  if (str === undefined || str === null) {
    str = "";
  }
  return String(str).padEnd(length);
}

export const DAYS = 5;
export const PERIODS_PER_DAY = 6;

/**
 * Represents a time slot in the schedule
 */
export interface TimeSlot {
  day: number;
  period: number;
}

/**
 * Class representing availability of a teacher
 */
export class Availability {
  days: number;
  periodsPerDay: number;
  buffer: number[];

  /**
   * Create an availability instance
   * @param days - Number of days in the schedule
   * @param periodsPerDay - Number of periods per day
   */
  constructor(days: number, periodsPerDay: number) {
    this.days = days;
    this.periodsPerDay = periodsPerDay;

    this.buffer = new Array(days).fill(0);
  }

  /**
   * Set availability for a specific time slot
   * @param day - Day index
   * @param period - Period index
   * @param val - Whether the slot is available
   */
  set(day: number, period: number, val: boolean): void {
    let mask = 1 << period;
    if (val) {
      this.buffer[day] |= mask;
    } else {
      this.buffer[day] &= ~mask;
    }
  }

  /**
   * Set availability for an entire day
   * @param day - Day index
   * @param val - Whether the day is available
   */
  setDay(day: number, val: boolean): void {
    if (val) {
      this.buffer[day] = (1 << this.periodsPerDay) - 1;
    } else {
      this.buffer[day] = 0;
    }
  }

  /**
   * Get availability for a specific time slot
   * @param day - Day index
   * @param period - Period index
   * @returns Whether the slot is available
   */
  get(day: number, period: number): boolean {
    let mask = 1 << period;
    return (this.buffer[day] & mask) != 0;
  }

  /**
   * Print availability to console
   */
  print(): void {
    const maxCellWidth = "Not Available".length;

    for (let dayIdx = 0; dayIdx < this.buffer.length; dayIdx++) {
      let dayAvailability = `Day ${dayIdx + 1}: `;

      for (let periodIdx = 0; periodIdx < this.periodsPerDay; periodIdx++) {
        if (this.get(dayIdx, periodIdx)) {
          dayAvailability += ` ${padRight("Available", maxCellWidth)} |`;
        } else {
          dayAvailability += ` ${padRight("Not Available", maxCellWidth)} |`;
        }
      }
      console.log(dayAvailability.slice(0, -1));
    }
  }

  /**
   * Get all available time slots
   * @returns Array of available slots
   */
  getAvailableSlots(): TimeSlot[] {
    const availableSlots: TimeSlot[] = [];
    for (let day = 0; day < this.days; day++) {
      for (let period = 0; period < this.periodsPerDay; period++) {
        if (this.get(day, period)) {
          availableSlots.push({ day, period });
        }
      }
    }
    return availableSlots;
  }

  /**
   * Toggle availability for a specific time slot
   * @param day - Day index
   * @param period - Period index
   */
  toggle(day: number, period: number): void {
    let mask = 1 << period;
    this.buffer[day] ^= mask;
  }

  /**
   * Custom toJSON to ensure buffer is serialized
   */
  toJSON() {
    return {
      days: this.days,
      periodsPerDay: this.periodsPerDay,
      buffer: this.buffer,
    };
  }
}

/**
 * Class representing a teacher
 */
export class Teacher {
  name: string;
  availability: Availability;

  /**
   * Create a teacher
   * @param name - Teacher's name
   * @param availability - Teacher's availability
   */
  constructor(name: string, availability: Availability) {
    this.name = name;
    this.availability = availability;
  }

  /**
   * Check if teacher is available at a specific time
   * @param day - Day index
   * @param period - Period index
   * @returns Whether the teacher is available
   */
  isAvailable(day: number, period: number): boolean {
    return this.availability.get(day, period);
  }
  
  /**
   * Get all time slots where the teacher is available
   * @returns Array of available slots
   */
  getAvailableSlots(): TimeSlot[] {
    return this.availability.getAvailableSlots();
  }
}

/**
 * Class representing a lesson
 */
export class Lesson {
  name: string;
  teacher: Teacher;
  periodsPerWeek: number;

  /**
   * Create a lesson
   * @param name - Lesson name
   * @param teacher - Teacher for this lesson
   * @param periodsPerWeek - Number of periods per week
   */
  constructor(name: string, teacher: Teacher, periodsPerWeek: number) {
    this.name = name;
    this.teacher = teacher;
    this.periodsPerWeek = periodsPerWeek;
  }
}

/**
 * Class representing a school class
 */
export class Class {
  name: string;
  lessons: Lesson[];

  /**
   * Create a class
   * @param name - Class name
   * @param lessons - Lessons for this class
   */
  constructor(name: string, lessons: Lesson[]) {
    this.name = name;
    this.lessons = lessons;
  }

  /**
   * Get total periods per week for all lessons
   * @returns Total periods per week
   */
  getTotalPeriodsPerWeek(): number {
    return this.lessons.reduce((sum, lesson) => sum + lesson.periodsPerWeek, 0);
  }
}

/**
 * Type for timetable schedule
 */
export type TimetableSchedule = {
  [className: string]: (Lesson | null)[][];
};

// Define interface for PDF creation return value
interface PdfResult {
  filename: string;
}

/**
 * Class representing a timetable
 */
export class Timetable {
  classes: Class[];
  schedule: TimetableSchedule;

  /**
   * Create a timetable
   * @param classes - Classes to schedule
   */
  constructor(classes: Class[]) {
    this.classes = classes;
    this.schedule = this.createEmptySchedule();
    this.initializeNoGaps();
  }

  /**
   * Create an empty schedule
   * @returns Empty schedule object
   * @private
   */
  private createEmptySchedule(): TimetableSchedule {
    const schedule: TimetableSchedule = {};
    for (const cls of this.classes) {
      schedule[cls.name] = Array.from({ length: DAYS }, () =>
        Array(PERIODS_PER_DAY).fill(null)
      );
    }
    return schedule;
  }

  /**
   * Initialize schedule with no gaps
   * @private
   */
  private initializeNoGaps(): void {
    for (const cls of this.classes) {
      const schedule = this.schedule[cls.name];
      let lessonQueue: Lesson[] = [];
      for (const lesson of cls.lessons) {
        for (let i = 0; i < lesson.periodsPerWeek; i++) {
          lessonQueue.push(lesson);
        }
      }
      for (let i = lessonQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lessonQueue[i], lessonQueue[j]] = [lessonQueue[j], lessonQueue[i]];
      }
      let idx = 0;
      let unscheduledLessons: string[] = [];
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (idx < lessonQueue.length) {
            const lesson = lessonQueue[idx];
            if (
              lesson.teacher.isAvailable(day, period) &&
              !this.isTeacherBusy(lesson.teacher, day, period, cls.name)
            ) {
              schedule[day][period] = lesson;
              idx++;
            } else {
              let found = false;
              for (let d = day; d < DAYS && !found; d++) {
                for (let p = (d === day ? period + 1 : 0); p < PERIODS_PER_DAY; p++) {
                  if (
                    schedule[d][p] === null &&
                    lesson.teacher.isAvailable(d, p) &&
                    !this.isTeacherBusy(lesson.teacher, d, p, cls.name)
                  ) {
                    schedule[d][p] = lesson;
                    idx++;
                    found = true;
                    break;
                  }
                }
              }
              if (!found) {
                unscheduledLessons.push(lesson.name + ' (' + lesson.teacher.name + ')');
                idx++;
              }
            }
          }
        }
      }
      if (unscheduledLessons.length > 0) {
        console.warn(`Class ${cls.name}: Could not schedule lessons due to teacher conflicts or availability: ${unscheduledLessons.join(', ')}`);
      }
    }
    this.compactSchedule();
  }

  /**
   * Check if a teacher is busy at a specific time
   * @param teacher - The teacher to check
   * @param day - Day index
   * @param period - Period index
   * @param skipClassName - Class name to skip in the check
   * @returns Whether the teacher is busy
   * @private
   */
  private isTeacherBusy(teacher: Teacher, day: number, period: number, skipClassName: string): boolean {
    for (const cls of this.classes) {
      if (cls.name === skipClassName) continue;
      if (this.schedule[cls.name][day][period] && this.schedule[cls.name][day][period]?.teacher === teacher) {
        return true;
      }
    }
    return false;
  }

  /**
   * Compact the schedule to avoid gaps
   */
  compactSchedule(): void {
    for (const cls of this.classes) {
      const schedule = this.schedule[cls.name];
      
      for (let day = 0; day < DAYS; day++) {
        const lessonsForDay: (Lesson | null)[] = [];
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (schedule[day][period] !== null) {
            lessonsForDay.push(schedule[day][period]);
            schedule[day][period] = null;
          }
        }
        
        for (let i = 0; i < lessonsForDay.length; i++) {
          schedule[day][i] = lessonsForDay[i];
        }
      }
    }
  }

  /**
   * Shuffle an array in place
   * @param array - Array to shuffle
   * @private
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  /**
   * Create a clone of this timetable
   * @returns Cloned timetable
   */
  clone(): Timetable {
    const clone = new Timetable(this.classes);
    
    for (const cls of this.classes) {
      clone.schedule[cls.name] = Array.from({ length: DAYS }, (_, dayIndex) =>
        Array.from({ length: PERIODS_PER_DAY }, (_, periodIndex) => 
          this.schedule[cls.name][dayIndex][periodIndex]
        )
      );
    }
    
    return clone;
  }

  /**
   * Count teacher conflicts in the schedule
   * @returns Number of conflicts
   */
  countTeacherConflicts(): number {
    let conflicts = 0;
    
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS_PER_DAY; period++) {
        const teacherMap = new Map<string, number>();
        
        for (const cls of this.classes) {
          const lesson = this.schedule[cls.name][day][period];
          if (lesson) {
            const teacher = lesson.teacher;
            
            // Check if teacher is available, safely handling if isAvailable is not a function
            if (teacher) {
              // First check if isAvailable is a function
              if (typeof teacher.isAvailable === 'function') {
                if (!teacher.isAvailable(day, period)) {
                  conflicts++;
                }
              } else if (teacher.availability) {
                // Fallback: try to use availability directly
                if (typeof teacher.availability.get === 'function') {
                  if (!teacher.availability.get(day, period)) {
                    conflicts++;
                  }
                } else if (teacher.availability.buffer && Array.isArray(teacher.availability.buffer)) {
                  // Final fallback: check availability directly from buffer
                  const mask = 1 << period;
                  if ((teacher.availability.buffer[day] & mask) === 0) {
                    conflicts++;
                  }
                }
              }
            }
            
            if (teacherMap.has(teacher.name)) {
              teacherMap.set(teacher.name, teacherMap.get(teacher.name)! + 1);
            } else {
              teacherMap.set(teacher.name, 1);
            }
          }
        }
        
        for (const [_, count] of teacherMap.entries()) {
          if (count > 1) {
            conflicts += (count - 1);
          }
        }
      }
    }
    
    let distributionPenalty = 0;
    for (const cls of this.classes) {
      const schedule = this.schedule[cls.name];
      
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS_PER_DAY - 1; period++) {
          const current = schedule[day][period];
          const next = schedule[day][period + 1];
          
          if (current && next && current.name === next.name) {
            distributionPenalty += 0.5;
          }
        }
      }
    }
    
    return conflicts + distributionPenalty;
  }

  /**
   * Count unscheduled periods
   * @returns Number of unscheduled periods
   */
  countUnscheduledPeriods(): number {
    let unscheduled = 0;
    
    for (const cls of this.classes) {
      const requiredPeriods = cls.getTotalPeriodsPerWeek();
      let scheduledPeriods = 0;
      
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (this.schedule[cls.name][day][period] !== null) {
            scheduledPeriods++;
          }
        }
      }
      
      unscheduled += (requiredPeriods - scheduledPeriods);
    }
    
    return unscheduled;
  }
  
  /**
   * Calculate penalty for empty spaces
   * @returns Empty space penalty
   */
  countEmptySpacePenalty(): number {
    let penalty = 0;
    
    for (const cls of this.classes) {
      const schedule = this.schedule[cls.name];
      
      for (let day = 0; day < DAYS; day++) {
        let firstLessonPeriod = -1;
        let lastLessonPeriod = -1;
        
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (schedule[day][period] !== null) {
            if (firstLessonPeriod === -1) {
              firstLessonPeriod = period;
            }
            lastLessonPeriod = period;
          }
        }
        
        if (firstLessonPeriod !== -1) {
          for (let period = firstLessonPeriod; period <= lastLessonPeriod; period++) {
            if (schedule[day][period] === null) {
              penalty += 1000;
            }
          }
        }
      }
    }
    
    return penalty;
  }

  /**
   * Create a mutated copy of this timetable
   * @returns Mutated timetable
   */
  mutate(): Timetable {
    const clone = this.clone();
    const mutationType = Math.random();
    
    // Choose a random class and day for mutation
    const randomClassIndex = Math.floor(Math.random() * this.classes.length);
    const randomClass = this.classes[randomClassIndex];
    const randomDay = Math.floor(Math.random() * DAYS);
    
    if (mutationType < 0.4) {
      // Swap two random periods within the same day for a class
      const schedule = clone.schedule[randomClass.name];
      
      // Find periods that have lessons
      const periodsWithLessons: number[] = [];
      for (let period = 0; period < PERIODS_PER_DAY; period++) {
        if (schedule[randomDay][period] !== null) {
          periodsWithLessons.push(period);
        }
      }
      
      if (periodsWithLessons.length >= 2) {
        // Pick two random periods to swap
        this.shuffleArray(periodsWithLessons);
        const period1 = periodsWithLessons[0];
        const period2 = periodsWithLessons[1];
        
        // Swap the lessons
        [schedule[randomDay][period1], schedule[randomDay][period2]] = 
          [schedule[randomDay][period2], schedule[randomDay][period1]];
      }
    } else if (mutationType < 0.7) {
      // Try to resolve a teacher conflict by moving a lesson
      let conflictFound = false;
      
      // Find a conflict to resolve
      for (let day = 0; day < DAYS && !conflictFound; day++) {
        for (let period = 0; period < PERIODS_PER_DAY && !conflictFound; period++) {
          // Check for teacher conflicts in this time slot
          const teacherUsage = new Map<string, {count: number, className: string}>();
          
          for (const cls of this.classes) {
            const lesson = clone.schedule[cls.name][day][period];
            if (lesson) {
              const teacher = lesson.teacher;
              
              // Check teacher availability
              if (!teacher.isAvailable(day, period)) {
                // Found a teacher assigned to a slot they're not available in
                // Try to move this lesson to a slot where the teacher is available
                conflictFound = this.moveLessonToAvailableSlot(clone, cls.name, day, period);
                if (conflictFound) break;
              }
              
              // Check for double-booked teachers
              if (!teacherUsage.has(teacher.name)) {
                teacherUsage.set(teacher.name, {count: 1, className: cls.name});
              } else {
                const usage = teacherUsage.get(teacher.name)!;
                usage.count++;
                
                if (usage.count > 1) {
                  // Found a teacher assigned to multiple classes in the same slot
                  // Try to move this lesson to a different time slot
                  conflictFound = this.moveLessonToAvailableSlot(clone, cls.name, day, period);
                  if (conflictFound) break;
                }
              }
            }
          }
        }
      }
      
      // If no conflicts were found or couldn't be resolved, try random swaps
      if (!conflictFound) {
        // Find two random days
        const day1 = Math.floor(Math.random() * DAYS);
        let day2 = Math.floor(Math.random() * DAYS);
        if (day1 === day2) day2 = (day2 + 1) % DAYS;
        
        // Find periods with lessons on both days
        const periods1: number[] = [];
        const periods2: number[] = [];
        
        for (let p = 0; p < PERIODS_PER_DAY; p++) {
          if (clone.schedule[randomClass.name][day1][p] !== null) {
            periods1.push(p);
          }
          if (clone.schedule[randomClass.name][day2][p] !== null) {
            periods2.push(p);
          }
        }
        
        if (periods1.length > 0 && periods2.length > 0) {
          const period1 = periods1[Math.floor(Math.random() * periods1.length)];
          const period2 = periods2[Math.floor(Math.random() * periods2.length)];
          
          // Swap the lessons between days
          [clone.schedule[randomClass.name][day1][period1], clone.schedule[randomClass.name][day2][period2]] = 
            [clone.schedule[randomClass.name][day2][period2], clone.schedule[randomClass.name][day1][period1]];
        }
      }
    } else {
      // Try a more aggressive mutation to solve difficult conflicts
      // Randomly select a class that has conflicts
      let conflictingClasses: string[] = [];
      
      for (let day = 0; day < DAYS; day++) {
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          const teacherMap = new Map<string, string[]>();
          
          for (const cls of this.classes) {
            const lesson = clone.schedule[cls.name][day][period];
            if (lesson) {
              const teacher = lesson.teacher;
              
              // Check availability
              if (!teacher.isAvailable(day, period)) {
                if (!conflictingClasses.includes(cls.name)) {
                  conflictingClasses.push(cls.name);
                }
              }
              
              // Check double booking
              if (!teacherMap.has(teacher.name)) {
                teacherMap.set(teacher.name, [cls.name]);
              } else {
                teacherMap.get(teacher.name)!.push(cls.name);
                
                // Add all classes with this teacher in this time slot
                for (const conflictClass of teacherMap.get(teacher.name)!) {
                  if (!conflictingClasses.includes(conflictClass)) {
                    conflictingClasses.push(conflictClass);
                  }
                }
              }
            }
          }
        }
      }
      
      if (conflictingClasses.length > 0) {
        const targetClass = conflictingClasses[Math.floor(Math.random() * conflictingClasses.length)];
        
        // Reset and rebuild schedule for this class
        for (let day = 0; day < DAYS; day++) {
          for (let period = 0; period < PERIODS_PER_DAY; period++) {
            clone.schedule[targetClass][day][period] = null;
          }
        }
        
        // Get all lessons for this class
        const classObj = this.classes.find(c => c.name === targetClass)!;
        let lessonQueue: Lesson[] = [];
        for (const lesson of classObj.lessons) {
          for (let i = 0; i < lesson.periodsPerWeek; i++) {
            lessonQueue.push(lesson);
          }
        }
        
        this.shuffleArray(lessonQueue);
        
        // Try to place lessons in conflict-free slots
        for (const lesson of lessonQueue) {
          let placed = false;
          
          // First try to place in slots where teacher is available and not busy
          for (let day = 0; day < DAYS && !placed; day++) {
            for (let period = 0; period < PERIODS_PER_DAY && !placed; period++) {
              if (clone.schedule[targetClass][day][period] === null && 
                  lesson.teacher.isAvailable(day, period) && 
                  !this.isTeacherBusy(lesson.teacher, day, period, targetClass)) {
                clone.schedule[targetClass][day][period] = lesson;
                placed = true;
              }
            }
          }
          
          // If still not placed, try any available slot
          if (!placed) {
            for (let day = 0; day < DAYS && !placed; day++) {
              for (let period = 0; period < PERIODS_PER_DAY && !placed; period++) {
                if (clone.schedule[targetClass][day][period] === null) {
                  clone.schedule[targetClass][day][period] = lesson;
                  placed = true;
                }
              }
            }
          }
        }
        
        // Compact to avoid gaps
        clone.compactSchedule();
      }
    }
    
    return clone;
  }

  /**
   * Attempt to move a lesson to a slot where the teacher is available
   * @param timetable - The timetable to modify
   * @param className - The name of the class containing the lesson
   * @param day - Current day of the lesson
   * @param period - Current period of the lesson
   * @returns Whether the operation was successful
   * @private
   */
  private moveLessonToAvailableSlot(timetable: Timetable, className: string, day: number, period: number): boolean {
    const lesson = timetable.schedule[className][day][period];
    if (!lesson) return false;
    
    const teacher = lesson.teacher;
    
    // Find slots where the teacher is available and not busy with other classes
    for (let newDay = 0; newDay < DAYS; newDay++) {
      for (let newPeriod = 0; newPeriod < PERIODS_PER_DAY; newPeriod++) {
        if (timetable.schedule[className][newDay][newPeriod] === null &&
            teacher.isAvailable(newDay, newPeriod) &&
            !this.isTeacherBusy(teacher, newDay, newPeriod, className)) {
          
          // Move the lesson to the new slot
          timetable.schedule[className][newDay][newPeriod] = lesson;
          timetable.schedule[className][day][period] = null;
          
          // Compact to avoid gaps
          timetable.compactSchedule();
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Print the timetable to console
   */
  print(): void {
    const isValid = this.validateNoGaps();
    if (!isValid) {
      console.error("WARNING: TIMETABLE CONTAINS GAPS!");
    }
    
    const maxLessonNameLength = Math.max(
      ...this.classes.map(cls =>
        Math.max(...cls.lessons.map(lesson => lesson.name.length), "Free".length)
      )
    );
    const maxTeacherNameLength = Math.max(
      ...this.classes.map(cls =>
        Math.max(...cls.lessons.map(lesson => lesson.teacher.name.length), 0)
      )
    );
    const maxCellWidth = maxLessonNameLength + maxTeacherNameLength + 3;

    for (const cls of this.classes) {
      console.log(`Class ${cls.name}:`);
      const schedule = this.schedule[cls.name];

      let headerRow = "        ";
      for (let period = 0; period < PERIODS_PER_DAY; period++) {
        headerRow += ` ${padRight(`Period ${period + 1}`, maxCellWidth)} |`;
      }
      console.log(headerRow.slice(0, -1));
      console.log("-".repeat(headerRow.length - 1));

      for (let day = 0; day < DAYS; day++) {
        let daySchedule = `Day ${day + 1}: `;
        
        let lessonCount = 0;
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (schedule[day][period] !== null) {
            lessonCount++;
          }
        }

        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          const lesson = schedule[day][period];
          const isGap = lesson === null && period < lessonCount;
          
          if (lesson) {
            const lessonStr = `${lesson.name} (${lesson.teacher.name})`;
            daySchedule += ` ${padRight(lessonStr, maxCellWidth)} |`;
          } else {
            if (isGap) {
              daySchedule += ` ${padRight("GAP ERROR", maxCellWidth)} |`;
            } else {
              daySchedule += ` ${padRight("Free", maxCellWidth)} |`;
            }
          }
        }

        console.log(daySchedule.slice(0, -1));
      }

      console.log("");
    }
    
    const conflicts = this.countTeacherConflicts();
    const unscheduled = this.countUnscheduledPeriods();
    const emptySpaces = this.countEmptySpacePenalty();
    
    console.log("Schedule Quality Metrics:");
    console.log(`- Teacher conflicts: ${conflicts}`);
    console.log(`- Unscheduled periods: ${unscheduled}`);
    console.log(`- Empty space penalties: ${emptySpaces > 0 ? "ERROR: " + emptySpaces : 0}`);
    console.log(`- Total penalties: ${conflicts + unscheduled + emptySpaces}`);
    if (emptySpaces > 0) {
      console.error("ERROR: SCHEDULE CONTAINS GAPS BETWEEN LESSONS!");
    } else {
      console.log("✓ No gaps in class schedules");
    }
    console.log("");
  }

  /**
   * Validate that the schedule has no gaps
   * @returns Whether the schedule is valid
   */
  validateNoGaps(): boolean {
    let hasGaps = false;
    
    for (const cls of this.classes) {
      const schedule = this.schedule[cls.name];
      
      for (let day = 0; day < DAYS; day++) {
        let firstNull = -1;
        let lessonAfterNull = false;
        
        for (let period = 0; period < PERIODS_PER_DAY; period++) {
          if (schedule[day][period] === null) {
            if (firstNull === -1) {
              firstNull = period;
            }
          } else if (firstNull !== -1) {
            lessonAfterNull = true;
            break;
          }
        }
        
        if (firstNull !== -1 && lessonAfterNull) {
          console.error(`FOUND GAP in Class ${cls.name}, Day ${day + 1}: lesson after period ${firstNull}`);
          hasGaps = true;
        }
      }
    }
    
    return !hasGaps;
  }

  /**
   * Generate HTML for timetable export
   * @returns HTML string representation of the timetable
   */
  generateHtml(): string {
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    
    let html = `
      <html>
      <head>
        <title>School Timetable</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333366; }
          h2 { color: #333366; margin-top: 20px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
          th, td { border: 1px solid #dddddd; text-align: left; padding: 8px; }
          th { background-color: #f2f2f2; }
          .free { color: #999999; }
          .metrics { margin-top: 30px; border-top: 1px solid #dddddd; padding-top: 20px; }
          .error { color: red; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>School Timetable</h1>
    `;
    
    for (const cls of this.classes) {
      html += `<h2>Class ${cls.name}</h2>`;
      html += '<table><tr><th></th>';
      
      // Display days as column headers
      for (let day = 0; day < DAYS; day++) {
        html += `<th>${dayNames[day]}</th>`;
      }
      html += '</tr>';
      
      const schedule = this.schedule[cls.name];
      
      // Display periods as row headers
      for (let period = 0; period < PERIODS_PER_DAY; period++) {
        html += `<tr><th>Period ${period + 1}</th>`;
        
        for (let day = 0; day < DAYS; day++) {
          const lesson = schedule[day][period];
          if (lesson) {
            html += `<td>${lesson.name}<br/>(${lesson.teacher.name})</td>`;
          } else {
            html += '<td class="free">Free</td>';
          }
        }
        
        html += '</tr>';
      }
      
      html += '</table>';
    }
    
    const conflicts = this.countTeacherConflicts();
    const unscheduled = this.countUnscheduledPeriods();
    const emptySpaces = this.countEmptySpacePenalty();
    
    html += `
      <div class="metrics">
        <h2>Schedule Quality Metrics</h2>
        <p>• Teacher conflicts: ${conflicts}</p>
        <p>• Unscheduled periods: ${unscheduled}</p>
        <p class="${emptySpaces > 0 ? 'error' : ''}">• Empty space penalties: ${emptySpaces > 0 ? "ERROR: " + emptySpaces : "0"}</p>
        <p>• Total penalties: ${conflicts + unscheduled + emptySpaces}</p>
        ${emptySpaces > 0 
          ? '<p class="error">ERROR: SCHEDULE CONTAINS GAPS BETWEEN LESSONS!</p>' 
          : '<p>✓ No gaps in class schedules</p>'}
      </div>
    `;
    
    html += '</body></html>';
    
    return html;
  }

  /**
   * Export the timetable to a PDF file (old version using direct Node.js modules)
   * @deprecated Use backend.exportTimetablePdf instead
   * @param filename - Output filename
   * @returns Promise resolving to the filename
   */
  exportToPDF(filename = 'timetable.pdf'): Promise<string> {
    console.warn("This method is deprecated. Use backend.exportTimetablePdf instead.");
    
    // Return a promise that resolves with the filename, but does nothing
    // This is kept for compatibility with existing code
    return Promise.resolve(filename);
  }
}

/**
 * Class for scheduling timetables
 */
export class Scheduler {
  classes: Class[];
  maxIterations: number;
  maxStagnantIterations: number;

  /**
   * Create a scheduler
   * @param classes - Classes to schedule
   * @param maxIterations - Maximum iterations
   * @param maxStagnantIterations - Maximum iterations without improvement
   */
  constructor(classes: Class[] = [], maxIterations = 1000, maxStagnantIterations = 100) {
    this.classes = classes;
    this.maxIterations = maxIterations;
    this.maxStagnantIterations = maxStagnantIterations;
  }

  /**
   * Generate a timetable
   * @returns Generated timetable
   */
  generateTimetable(): Timetable {
    // Increase default iterations for better results
    const maxIterations = this.maxIterations * 2;
    const maxStagnantIterations = this.maxStagnantIterations * 2;
    
    let current = new Timetable(this.classes);
    
    let currentFitness = this.calculateFitness(current);
    let best = current.clone();
    let bestFitness = currentFitness;
    
    let temperature = 1.0;
    const coolingRate = 0.997; // Slower cooling for more thorough search
    const minTemperature = 0.001; // Lower min temperature for more thorough search
    
    let stagnantIterations = 0;
    
    console.log("Starting optimization...");
    
    for (let i = 0; i < maxIterations && temperature > minTemperature; i++) {
      const mutated = current.mutate();
      
      const mutatedFitness = this.calculateFitness(mutated);
      
      const emptySpacePenalty = mutated.countEmptySpacePenalty();
      if (emptySpacePenalty > 0) {
        continue;
      }
      
      // Always accept improvement
      if (mutatedFitness < currentFitness) {
        current = mutated;
        currentFitness = mutatedFitness;
        
        if (mutatedFitness < bestFitness) {
          best = mutated.clone();
          bestFitness = mutatedFitness;
          stagnantIterations = 0;
          
          // If we found a perfect solution (no conflicts), break early
          if (bestFitness === 0) {
            console.log(`Perfect solution found at iteration ${i}`);
            break;
          }
        } else {
          stagnantIterations++;
        }
      } else {
        // For non-improvements, use simulated annealing with adaptive acceptance
        const acceptanceProbability = this.calculateAcceptanceProbability(
          currentFitness, 
          mutatedFitness, 
          temperature
        );
        
        if (Math.random() < acceptanceProbability) {
          current = mutated;
          currentFitness = mutatedFitness;
          stagnantIterations++;
        } else {
          stagnantIterations++;
        }
      }
      
      if (i % 100 === 0 || i === maxIterations - 1) {
        console.log(`Iteration ${i}, Temperature: ${temperature.toFixed(4)}, Current Fitness: ${currentFitness}, Best Fitness: ${bestFitness}`);
      }
      
      // Adaptive restart if we're stuck in a local minimum and still have conflicts
      if (stagnantIterations > maxStagnantIterations / 2 && bestFitness > 0) {
        console.log(`Adaptive restart at iteration ${i}, fitness ${bestFitness}`);
        
        // Start from the best solution found so far
        current = best.clone();
        currentFitness = bestFitness;
        
        // Use a more aggressive mutation to escape local minimum
        for (let m = 0; m < 5; m++) {
          current = current.mutate();
        }
        
        currentFitness = this.calculateFitness(current);
        temperature = Math.min(0.5, temperature * 2); // Increase temperature
        stagnantIterations = 0;
      } else if (stagnantIterations >= maxStagnantIterations) {
        console.log(`No improvement for ${maxStagnantIterations} iterations, stopping`);
        break;
      }
      
      temperature *= coolingRate;
    }
    
    // If we still have conflicts, try a final targeted optimization pass focused only on conflicts
    if (best.countTeacherConflicts() > 0) {
      console.log("Starting targeted conflict elimination pass...");
      
      let conflictBest = best.clone();
      let conflictBestScore = best.countTeacherConflicts();
      
      // Short focused pass to try to eliminate remaining conflicts
      for (let i = 0; i < 500 && conflictBestScore > 0; i++) {
        const mutated = conflictBest.mutate();
        const conflicts = mutated.countTeacherConflicts();
        
        // Only accept if it reduces conflicts or keeps them the same without creating gaps
        if (conflicts <= conflictBestScore && mutated.countEmptySpacePenalty() === 0) {
          conflictBest = mutated;
          conflictBestScore = conflicts;
          
          if (conflicts === 0) {
            console.log(`All conflicts eliminated at iteration ${i}`);
            break;
          }
        }
      }
      
      best = conflictBest;
    }
    
    best.compactSchedule();
    
    return best;
  }
  
  /**
   * Calculate fitness of a timetable
   * @param timetable - Timetable to evaluate
   * @returns Fitness score (lower is better)
   * @private
   */
  private calculateFitness(timetable: Timetable): number {
    const conflicts = timetable.countTeacherConflicts();
    const unscheduled = timetable.countUnscheduledPeriods();
    const emptySpacePenalty = timetable.countEmptySpacePenalty();
    
    // Heavily prioritize eliminating teacher conflicts
    return (conflicts * 10) + (unscheduled * 2) + emptySpacePenalty;
  }
  
  /**
   * Calculate probability of accepting a new solution
   * @param currentFitness - Current fitness
   * @param newFitness - New fitness
   * @param temperature - Current temperature
   * @returns Acceptance probability
   * @private
   */
  private calculateAcceptanceProbability(currentFitness: number, newFitness: number, temperature: number): number {
    if (newFitness < currentFitness) {
      return 1.0;
    }
    
    const delta = currentFitness - newFitness;
    return Math.exp(delta / temperature);
  }
} 