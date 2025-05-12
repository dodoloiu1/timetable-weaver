import { useState, useEffect } from "react";
import { Timetable, DAYS, PERIODS_PER_DAY } from "../../util/timetable";

interface TimetableDisplayProps {
  timetable: Timetable;
  onClose: () => void;
}

const TimetableDisplay: React.FC<TimetableDisplayProps> = ({ timetable, onClose }) => {
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periodNames = Array.from({ length: PERIODS_PER_DAY }, (_, i) => `Period ${i + 1}`);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [conflictDetails, setConflictDetails] = useState<{conflicts: number, teacherConflicts: {[key: string]: number}}>({
    conflicts: 0,
    teacherConflicts: {}
  });
  
  useEffect(() => {
    // Calculate detailed conflict information on component mount
    calculateDetailedConflicts();
  }, [timetable]);
  
  const calculateDetailedConflicts = () => {
    const teacherConflictMap: {[key: string]: number} = {};
    let totalConflicts = 0;
    
    // Check for teacher double-booking and availability conflicts
    for (let day = 0; day < DAYS; day++) {
      for (let period = 0; period < PERIODS_PER_DAY; period++) {
        const teacherUsage: {[key: string]: number} = {};
        
        // Count teachers in this time slot
        for (const cls of timetable.classes) {
          const lesson = timetable.schedule[cls.name][day][period];
          if (lesson) {
            const teacher = lesson.teacher;
            
            // Check teacher availability
            if (!teacher.isAvailable(day, period)) {
              totalConflicts++;
              teacherConflictMap[teacher.name] = (teacherConflictMap[teacher.name] || 0) + 1;
            }
            
            // Count teachers for double-booking
            teacherUsage[teacher.name] = (teacherUsage[teacher.name] || 0) + 1;
          }
        }
        
        // Count double-bookings as conflicts
        for (const [teacherName, count] of Object.entries(teacherUsage)) {
          if (count > 1) {
            teacherConflictMap[teacherName] = (teacherConflictMap[teacherName] || 0) + (count - 1);
            totalConflicts += (count - 1);
          }
        }
      }
    }
    
    setConflictDetails({
      conflicts: totalConflicts,
      teacherConflicts: teacherConflictMap
    });
  };
  
  const getConflicts = () => {
    const conflicts = timetable.countTeacherConflicts();
    const unscheduled = timetable.countUnscheduledPeriods();
    const emptySpaces = timetable.countEmptySpacePenalty();
    
    return {
      conflicts,
      unscheduled,
      emptySpaces,
      total: conflicts + unscheduled + emptySpaces
    };
  };
  
  const handleExportToPDF = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    setExportError(null);
    
    try {
      // Default filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const filename = `timetable-${timestamp}.pdf`;
      
      // Generate HTML for the timetable
      const html = timetable.generateHtml();
      
      // Use the Electron backend to create PDF
      const exportedFile = await backend.exportTimetablePdf(html, filename);
      setExportSuccess(`Timetable exported to ${exportedFile}`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setExportError("Failed to export timetable to PDF. Check console for details.");
    } finally {
      setIsExporting(false);
    }
  };
  
  // Check if a specific cell has a conflict
  const hasCellConflict = (className: string, day: number, period: number) => {
    const lesson = timetable.schedule[className][day][period];
    if (!lesson) return false;
    
    // Check if teacher is available at this time
    if (!lesson.teacher.isAvailable(day, period)) {
      return true;
    }
    
    // Check if teacher is double-booked
    for (const cls of timetable.classes) {
      if (cls.name === className) continue;
      
      const otherLesson = timetable.schedule[cls.name][day][period];
      if (otherLesson && otherLesson.teacher.name === lesson.teacher.name) {
        return true;
      }
    }
    
    return false;
  };
  
  const metrics = getConflicts();
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-100 p-4 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Generated Timetable</h2>
          <button 
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded"
          >
            Close
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-lg border ${metrics.conflicts > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <h4 className="font-medium mb-1">Teacher Conflicts</h4>
              <p className={`text-xl font-bold ${metrics.conflicts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.conflicts}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${metrics.unscheduled > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <h4 className="font-medium mb-1">Unscheduled Periods</h4>
              <p className={`text-xl font-bold ${metrics.unscheduled > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {metrics.unscheduled}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${metrics.emptySpaces > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <h4 className="font-medium mb-1">Empty Space Penalties</h4>
              <p className={`text-xl font-bold ${metrics.emptySpaces > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {metrics.emptySpaces}
              </p>
            </div>
            
            <div className={`p-4 rounded-lg border ${metrics.total > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <h4 className="font-medium mb-1">Quality Score</h4>
              <p className={`text-xl font-bold ${metrics.total > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                {metrics.total === 0 ? 'Perfect!' : `${metrics.total} issues`}
              </p>
            </div>
          </div>
          
          {/* Show conflict details if any conflicts exist */}
          {metrics.conflicts > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-700 mb-2">Teacher Conflict Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(conflictDetails.teacherConflicts).map(([teacher, count]) => (
                  <div key={teacher} className="flex justify-between items-center border-b border-red-100 py-1">
                    <span className="font-medium">{teacher}</span>
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded">{count} conflicts</span>
                  </div>
                ))}
                {Object.keys(conflictDetails.teacherConflicts).length === 0 && (
                  <p className="text-gray-600 italic">No specific teacher conflicts found.</p>
                )}
              </div>
            </div>
          )}
          
          {timetable.classes.map((cls, idx) => (
            <div key={idx} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Class {cls.name}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border"></th>
                      {dayNames.map((day, idx) => (
                        <th key={idx} className="p-2 border text-center">{day}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {periodNames.map((period, periodIndex) => (
                      <tr key={periodIndex} className="hover:bg-gray-50">
                        <th className="p-2 border bg-gray-50">{period}</th>
                        {dayNames.map((_, dayIndex) => {
                          const lesson = timetable.schedule[cls.name][dayIndex][periodIndex];
                          const hasConflict = hasCellConflict(cls.name, dayIndex, periodIndex);
                          
                          return (
                            <td 
                              key={dayIndex} 
                              className={`p-2 border text-center ${hasConflict ? 'bg-red-100' : ''}`}
                            >
                              {lesson ? (
                                <div>
                                  <div className={`font-medium ${hasConflict ? 'text-red-700' : ''}`}>
                                    {lesson.name}
                                  </div>
                                  <div className={`text-sm ${hasConflict ? 'text-red-600' : 'text-gray-600'}`}>
                                    {lesson.teacher.name}
                                    {hasConflict && (
                                      <span className="ml-1 text-xs bg-red-200 text-red-800 px-1 rounded">
                                        Conflict
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Free</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          {exportSuccess && (
            <div className="mt-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded">
              {exportSuccess}
            </div>
          )}
          
          {exportError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {exportError}
            </div>
          )}
          
          <div className="flex justify-center mt-6 gap-4">
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors"
            >
              Return to Editor
            </button>
            
            <button
              onClick={handleExportToPDF}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Export to PDF"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableDisplay; 