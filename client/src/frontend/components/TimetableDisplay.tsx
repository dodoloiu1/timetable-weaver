import { useState } from "react";
import { Timetable, DAYS, PERIODS_PER_DAY } from "../../util/timetable";
import * as path from 'path';

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
  const [showFilenameDialog, setShowFilenameDialog] = useState(false);
  const [customFilename, setCustomFilename] = useState("");
  
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
  
  const handleInitiateExport = () => {
    // Default filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const defaultFilename = `timetable-${timestamp}`;
    setCustomFilename(defaultFilename);
    setShowFilenameDialog(true);
  };
  
  const handleExportToPDF = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    setExportError(null);
    setShowFilenameDialog(false);
    
    try {
      // Get the user's documents folder for the default path
      const homePath = window.navigator.platform.toLowerCase().includes('win') 
        ? import.meta.env.USERPROFILE || 'C:\\Users\\user\\Documents'
        : import.meta.env.HOME || '/home/user/Documents';
      const documentsPath = path.join(homePath, 'Documents');
      
      // Clean up filename to ensure it has .pdf extension
      const filename = customFilename.trim().endsWith('.pdf') 
        ? customFilename.trim() 
        : `${customFilename.trim()}.pdf`;
      
      const defaultPath = path.join(documentsPath, filename);
      
      // Show save dialog to let user choose location and filename
      const selectedPath = await backend.showSaveDialog(defaultPath);
      
      if (!selectedPath) {
        // User canceled the dialog
        setIsExporting(false);
        return;
      }
      
      // Generate HTML for the timetable
      const html = timetable.generateHtml();
      
      // Use the Electron backend to create PDF at the selected path
      const exportedFile = await backend.exportTimetablePdf(html, selectedPath);
      setExportSuccess(`Timetable exported to ${exportedFile}`);
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setExportError("Failed to export timetable to PDF. Check console for details.");
    } finally {
      setIsExporting(false);
    }
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
          
          {timetable.classes.map((cls, idx) => (
            <div key={idx} className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Class {cls.name}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border"></th>
                      {periodNames.map((period, idx) => (
                        <th key={idx} className="p-2 border text-center">{period}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayNames.map((day, dayIndex) => (
                      <tr key={dayIndex} className="hover:bg-gray-50">
                        <th className="p-2 border bg-gray-50">{day}</th>
                        {Array.from({ length: PERIODS_PER_DAY }, (_, periodIndex) => {
                          const lesson = timetable.schedule[cls.name][dayIndex][periodIndex];
                          return (
                            <td key={periodIndex} className="p-2 border text-center">
                              {lesson ? (
                                <div>
                                  <div className="font-medium">{lesson.name}</div>
                                  <div className="text-sm text-gray-600">{lesson.teacher.name}</div>
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
              onClick={handleInitiateExport}
              disabled={isExporting}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Export to PDF"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Filename Dialog */}
      {showFilenameDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Export Timetable to PDF</h3>
            <p className="mb-4 text-gray-600">
              Enter a name for your PDF file. You'll be able to choose where to save it in the next step.
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filename
              </label>
              <div className="flex items-center">
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="flex-1 p-2 border rounded"
                  placeholder="Enter filename"
                />
                <span className="ml-2 text-gray-500">.pdf</span>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowFilenameDialog(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleExportToPDF}
                disabled={!customFilename.trim()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableDisplay; 