import { useState } from "react";
import { Class, Lesson } from "../../util/timetable";

interface ClassesTabProps {
  classes: Class[];
  onClassesChange: (classes: Class[]) => void;
}

const ClassesTab: React.FC<ClassesTabProps> = ({ classes, onClassesChange }) => {
  const [newClassName, setNewClassName] = useState("");
  const [editingClassIndex, setEditingClassIndex] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState("");

  const handleAddClass = () => {
    if (newClassName.trim()) {
      const newClass = new Class(newClassName.trim(), []);
      onClassesChange([...classes, newClass]);
      setNewClassName("");
    }
  };

  const handleRemoveClass = (index: number) => {
    const updatedClasses = [...classes];
    updatedClasses.splice(index, 1);
    onClassesChange(updatedClasses);
  };
  
  const handleStartEdit = (index: number) => {
    setEditingClassIndex(index);
    setEditingClassName(classes[index].name);
  };
  
  const handleSaveEdit = () => {
    if (editingClassIndex !== null && editingClassName.trim()) {
      const oldClassName = classes[editingClassIndex].name;
      const newClassName = editingClassName.trim();
      
      // If name hasn't changed, no need to update
      if (oldClassName === newClassName) {
        setEditingClassIndex(null);
        return;
      }

      const updatedClasses = [...classes];
      updatedClasses[editingClassIndex] = new Class(
        newClassName,
        updatedClasses[editingClassIndex].lessons
      );
      onClassesChange(updatedClasses);
      setEditingClassIndex(null);
    }
  };
  
  const handleCancelEdit = () => {
    setEditingClassIndex(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-6">Manage Classes</h2>
      
      <div className="mb-8 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Add New Class</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            placeholder="Class name (e.g., '10A', '11B')"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleAddClass}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Add Class
          </button>
        </div>
      </div>
      
      {classes.length > 0 ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Class List</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border">Name</th>
                <th className="text-left p-2 border">Number of Lessons</th>
                <th className="text-left p-2 border">Total Periods</th>
                <th className="p-2 border w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-2 border">
                    {editingClassIndex === index ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editingClassName}
                          onChange={(e) => setEditingClassName(e.target.value)}
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
                        <span>{cls.name}</span>
                        <button
                          onClick={() => handleStartEdit(index)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="p-2 border">{cls.lessons.length}</td>
                  <td className="p-2 border">{cls.getTotalPeriodsPerWeek()} periods</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleRemoveClass(index)}
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
          <p className="text-gray-500">No classes added yet. Add your first class above.</p>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Note: You'll assign lessons to classes in the Lessons tab.</p>
      </div>
    </div>
  );
};

export default ClassesTab; 