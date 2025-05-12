import { useState } from "react";
import { Teacher, Availability, DAYS, PERIODS_PER_DAY, Class, Lesson } from "../../util/timetable";
import TeacherAvailabilityModal from "./TeacherAvailabilityModal";

interface TeachersTabProps {
  teachers: Teacher[];
  classes: Class[];
  onTeachersChange: (teachers: Teacher[]) => void;
  onClassesChange: (classes: Class[]) => void;
}

const TeachersTab: React.FC<TeachersTabProps> = ({ 
  teachers, 
  classes, 
  onTeachersChange,
  onClassesChange 
}) => {
  const [newTeacherName, setNewTeacherName] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTeacherIndex, setModalTeacherIndex] = useState<number | null>(null);
  const [editingTeacherIndex, setEditingTeacherIndex] = useState<number | null>(null);
  const [editingTeacherName, setEditingTeacherName] = useState("");

  const handleAddTeacher = () => {
    if (newTeacherName.trim()) {
      const availability = new Availability(DAYS, PERIODS_PER_DAY);
      // By default, make all slots available
      for (let day = 0; day < DAYS; day++) {
        availability.setDay(day, true);
      }
      const newTeacher = new Teacher(newTeacherName.trim(), availability);
      onTeachersChange([...teachers, newTeacher]);
      setNewTeacherName("");
    }
  };

  const handleRemoveTeacher = (index: number) => {
    const updatedTeachers = [...teachers];
    updatedTeachers.splice(index, 1);
    onTeachersChange(updatedTeachers);
  };

  const handleEditAvailability = (index: number) => {
    setModalTeacherIndex(index);
    setModalOpen(true);
  };

  const handleSaveAvailability = (newAvailability: Availability) => {
    if (modalTeacherIndex !== null) {
      const updatedTeachers = [...teachers];
      updatedTeachers[modalTeacherIndex] = new Teacher(
        updatedTeachers[modalTeacherIndex].name,
        newAvailability
      );
      onTeachersChange(updatedTeachers);
    }
  };
  
  const handleStartEdit = (index: number) => {
    setEditingTeacherIndex(index);
    setEditingTeacherName(teachers[index].name);
  };
  
  const handleSaveEdit = () => {
    if (editingTeacherIndex !== null && editingTeacherName.trim()) {
      const oldTeacherName = teachers[editingTeacherIndex].name;
      const newTeacherName = editingTeacherName.trim();
      
      // If name hasn't changed, no need to propagate updates
      if (oldTeacherName === newTeacherName) {
        setEditingTeacherIndex(null);
        return;
      }
      
      // First update the teacher's name
      const updatedTeachers = [...teachers];
      updatedTeachers[editingTeacherIndex] = new Teacher(
        newTeacherName,
        updatedTeachers[editingTeacherIndex].availability
      );
      
      // Now we need to update all classes that use this teacher
      const updatedClasses = classes.map(cls => {
        // Check if any lessons in this class use the teacher
        const hasTeacher = cls.lessons.some(lesson => 
          lesson.teacher.name === oldTeacherName
        );
        
        if (!hasTeacher) return cls; // No changes needed
        
        // Update lessons that use this teacher
        const updatedLessons = cls.lessons.map(lesson => {
          if (lesson.teacher.name === oldTeacherName) {
            // Create a new lesson with the updated teacher
            return new Lesson(
              lesson.name,
              updatedTeachers[editingTeacherIndex], // Use the updated teacher
              lesson.periodsPerWeek
            );
          }
          return lesson;
        });
        
        // Return a new class with the updated lessons
        return new Class(cls.name, updatedLessons);
      });
      
      // Save all the changes
      onTeachersChange(updatedTeachers);
      onClassesChange(updatedClasses);
      setEditingTeacherIndex(null);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingTeacherIndex(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-6">Manage Teachers</h2>
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add New Teacher</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="Teacher name"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleAddTeacher}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Add Teacher
          </button>
        </div>
      </div>
      {teachers.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Teacher List</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Available Slots</th>
                <th className="text-left p-2 border">Edit Availability</th>
                <th className="p-2 border w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((teacher, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">
                    {editingTeacherIndex === index ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingTeacherName}
                          onChange={(e) => setEditingTeacherName(e.target.value)}
                          className="flex-1 p-1 border rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <span>{teacher.name}</span>
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-2 border">{teacher.getAvailableSlots().length} periods</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleEditAvailability(index)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleRemoveTeacher(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-gray-500">No teachers added yet. Add your first teacher above.</p>
        </div>
      )}
      <TeacherAvailabilityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        availability={modalTeacherIndex !== null ? teachers[modalTeacherIndex].availability : new Availability(DAYS, PERIODS_PER_DAY)}
        onSave={handleSaveAvailability}
      />
    </div>
  );
};

export default TeachersTab; 