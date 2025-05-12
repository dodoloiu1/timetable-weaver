import { useState } from "react";
import { Class, Lesson, Teacher } from "../../util/timetable";

interface LessonsTabProps {
  classes: Class[];
  teachers: Teacher[];
  onClassesChange: (classes: Class[]) => void;
}

interface EditingLesson {
  classIndex: number;
  lessonIndex: number;
  name: string;
  teacherIndex: number;
  periodsPerWeek: number;
}

const LessonsTab: React.FC<LessonsTabProps> = ({ classes, teachers, onClassesChange }) => {
  const [selectedClassIndex, setSelectedClassIndex] = useState<number | null>(null);
  const [newLessonName, setNewLessonName] = useState("");
  const [selectedTeacherIndex, setSelectedTeacherIndex] = useState<number | null>(null);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(1);
  const [editingLesson, setEditingLesson] = useState<EditingLesson | null>(null);
  
  const handleAddLesson = () => {
    if (
      selectedClassIndex !== null &&
      newLessonName.trim() &&
      selectedTeacherIndex !== null &&
      periodsPerWeek > 0
    ) {
      const newLesson = new Lesson(
        newLessonName.trim(),
        teachers[selectedTeacherIndex],
        periodsPerWeek
      );
      
      const updatedClasses = [...classes];
      const currentClass = updatedClasses[selectedClassIndex];
      
      // Create a new class object with the updated lessons array
      updatedClasses[selectedClassIndex] = new Class(
        currentClass.name,
        [...currentClass.lessons, newLesson]
      );
      
      onClassesChange(updatedClasses);
      
      // Reset form
      setNewLessonName("");
      setPeriodsPerWeek(1);
    }
  };
  
  const handleRemoveLesson = (classIndex: number, lessonIndex: number) => {
    const updatedClasses = [...classes];
    const currentClass = updatedClasses[classIndex];
    const updatedLessons = [...currentClass.lessons];
    
    updatedLessons.splice(lessonIndex, 1);
    
    // Create a new class object with the updated lessons array
    updatedClasses[classIndex] = new Class(currentClass.name, updatedLessons);
    
    onClassesChange(updatedClasses);
  };
  
  const handleStartEditLesson = (classIndex: number, lessonIndex: number) => {
    const lesson = classes[classIndex].lessons[lessonIndex];
    const teacherIndex = teachers.findIndex(t => t.name === lesson.teacher.name);
    
    if (teacherIndex !== -1) {
      setEditingLesson({
        classIndex,
        lessonIndex,
        name: lesson.name,
        teacherIndex,
        periodsPerWeek: lesson.periodsPerWeek
      });
    }
  };
  
  const handleSaveEditLesson = () => {
    if (editingLesson && teachers[editingLesson.teacherIndex]) {
      const updatedClasses = [...classes];
      const currentClass = updatedClasses[editingLesson.classIndex];
      const updatedLessons = [...currentClass.lessons];
      
      updatedLessons[editingLesson.lessonIndex] = new Lesson(
        editingLesson.name.trim(),
        teachers[editingLesson.teacherIndex],
        editingLesson.periodsPerWeek
      );
      
      updatedClasses[editingLesson.classIndex] = new Class(
        currentClass.name,
        updatedLessons
      );
      
      onClassesChange(updatedClasses);
      setEditingLesson(null);
    }
  };
  
  const handleCancelEditLesson = () => {
    setEditingLesson(null);
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-6">Manage Lessons</h2>
      
      {classes.length === 0 ? (
        <div className="bg-yellow-100 p-6 rounded-lg text-center border border-yellow-300">
          <p className="text-yellow-800">You need to add at least one class first in the Classes tab.</p>
        </div>
      ) : teachers.length === 0 ? (
        <div className="bg-yellow-100 p-6 rounded-lg text-center border border-yellow-300">
          <p className="text-yellow-800">You need to add at least one teacher first in the Teachers tab.</p>
        </div>
      ) : (
        <>
          <div className="mb-8 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Add New Lesson</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class
                </label>
                <select
                  value={selectedClassIndex !== null ? selectedClassIndex : ""}
                  onChange={(e) => setSelectedClassIndex(e.target.value ? Number(e.target.value) : null)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls, index) => (
                    <option key={index} value={index}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesson Name
                </label>
                <input
                  type="text"
                  value={newLessonName}
                  onChange={(e) => setNewLessonName(e.target.value)}
                  placeholder="Lesson name (e.g., 'Math', 'English')"
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teacher
                </label>
                <select
                  value={selectedTeacherIndex !== null ? selectedTeacherIndex : ""}
                  onChange={(e) => setSelectedTeacherIndex(e.target.value ? Number(e.target.value) : null)}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select a teacher</option>
                  {teachers.map((teacher, index) => (
                    <option key={index} value={index}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Periods Per Week
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={periodsPerWeek}
                  onChange={(e) => setPeriodsPerWeek(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
            
            <button
              onClick={handleAddLesson}
              disabled={
                selectedClassIndex === null ||
                !newLessonName.trim() ||
                selectedTeacherIndex === null
              }
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Add Lesson
            </button>
          </div>
          
          {classes.some(cls => cls.lessons.length > 0) ? (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Class Lessons</h3>
              
              {classes.map((cls, classIndex) => (
                cls.lessons.length > 0 && (
                  <div key={classIndex} className="mb-6 last:mb-0">
                    <h4 className="font-medium text-lg mb-2">Class: {cls.name}</h4>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left p-2 border">Lesson</th>
                          <th className="text-left p-2 border">Teacher</th>
                          <th className="text-left p-2 border">Periods/Week</th>
                          <th className="p-2 border w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cls.lessons.map((lesson, lessonIndex) => (
                          <tr key={lessonIndex} className="border-b hover:bg-gray-50">
                            {editingLesson && 
                             editingLesson.classIndex === classIndex && 
                             editingLesson.lessonIndex === lessonIndex ? (
                              <td colSpan={4} className="p-2 border">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Lesson Name
                                    </label>
                                    <input
                                      type="text"
                                      value={editingLesson.name}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        name: e.target.value
                                      })}
                                      className="w-full p-1 border rounded text-sm"
                                    />
                                  </div>
                                  
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Teacher
                                    </label>
                                    <select
                                      value={editingLesson.teacherIndex}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        teacherIndex: Number(e.target.value)
                                      })}
                                      className="w-full p-1 border rounded text-sm"
                                    >
                                      {teachers.map((teacher, index) => (
                                        <option key={index} value={index}>
                                          {teacher.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Periods/Week
                                    </label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={editingLesson.periodsPerWeek}
                                      onChange={(e) => setEditingLesson({
                                        ...editingLesson,
                                        periodsPerWeek: Math.max(1, parseInt(e.target.value) || 1)
                                      })}
                                      className="w-full p-1 border rounded text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex justify-end gap-2 mt-2">
                                  <button
                                    onClick={handleSaveEditLesson}
                                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEditLesson}
                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            ) : (
                              <>
                                <td className="p-2 border">
                                  <div className="flex justify-between items-center">
                                    <span>{lesson.name}</span>
                                    <button
                                      onClick={() => handleStartEditLesson(classIndex, lessonIndex)}
                                      className="text-blue-500 hover:text-blue-700 text-sm"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                </td>
                                <td className="p-2 border">{lesson.teacher.name}</td>
                                <td className="p-2 border">{lesson.periodsPerWeek}</td>
                                <td className="p-2 border text-center">
                                  <button
                                    onClick={() => handleRemoveLesson(classIndex, lessonIndex)}
                                    className="text-red-500 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="bg-gray-100 p-6 rounded-lg text-center">
              <p className="text-gray-500">No lessons added yet. Add your first lesson above.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LessonsTab; 