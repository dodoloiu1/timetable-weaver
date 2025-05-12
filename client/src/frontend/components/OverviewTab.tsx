import { useState } from "react";
import { Class, Teacher, Timetable, Scheduler } from "../../util/timetable";

interface OverviewTabProps {
  classes: Class[];
  teachers: Teacher[];
  onTimetableGenerated: (timetable: Timetable | null) => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ 
  classes, 
  teachers,
  onTimetableGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const canGenerate = classes.length > 0 && 
                     teachers.length > 0 && 
                     classes.some(cls => cls.lessons.length > 0);
  
  const handleGenerateTimetable = () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Check if we have enough data to generate a timetable
      if (!canGenerate) {
        throw new Error("Not enough data to generate a timetable");
      }
      
      // Check if there are any classes with no lessons
      const emptyClasses = classes.filter(cls => cls.lessons.length === 0);
      if (emptyClasses.length > 0) {
        throw new Error(`These classes have no lessons: ${emptyClasses.map(c => c.name).join(', ')}`);
      }
      
      const scheduler = new Scheduler(classes);
      const timetable = scheduler.generateTimetable();
      
      onTimetableGenerated(timetable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      onTimetableGenerated(null);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-6">Overview</h2>
      
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h3 className="text-lg font-semibold mb-4">Current Setup</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium mb-2 text-blue-800">Teachers</h4>
            <p className="text-2xl font-bold text-blue-600">{teachers.length}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium mb-2 text-green-800">Classes</h4>
            <p className="text-2xl font-bold text-green-600">{classes.length}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium mb-2 text-purple-800">Total Lessons</h4>
            <p className="text-2xl font-bold text-purple-600">
              {classes.reduce((sum, cls) => sum + cls.lessons.length, 0)}
            </p>
          </div>
        </div>
        
        <div className="text-center">
          <button
            onClick={handleGenerateTimetable}
            disabled={!canGenerate || isGenerating}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Timetable"}
          </button>
          
          {!canGenerate && !isGenerating && (
            <p className="mt-2 text-red-500 text-sm">
              You need at least one class with lessons and one teacher to generate a timetable.
            </p>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
              {error}
            </div>
          )}
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Class Summary</h3>
        
        {classes.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Class</th>
                <th className="text-left p-2 border">Subjects</th>
                <th className="text-left p-2 border">Teachers</th>
                <th className="text-left p-2 border">Total Periods</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, index) => {
                const uniqueSubjects = new Set(cls.lessons.map(l => l.name));
                const uniqueTeachers = new Set(cls.lessons.map(l => l.teacher.name));
                
                return (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 border">{cls.name}</td>
                    <td className="p-2 border">{uniqueSubjects.size}</td>
                    <td className="p-2 border">{uniqueTeachers.size}</td>
                    <td className="p-2 border">{cls.getTotalPeriodsPerWeek()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="bg-gray-100 p-6 rounded-lg text-center">
            <p className="text-gray-500">No classes added yet. Go to the Classes tab to add classes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab; 