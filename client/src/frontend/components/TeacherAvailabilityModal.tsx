import React, { useState } from "react";
import { Availability, DAYS, PERIODS_PER_DAY } from "../../util/timetable";

interface TeacherAvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  availability: Availability;
  onSave: (newAvailability: Availability) => void;
}

const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TeacherAvailabilityModal: React.FC<TeacherAvailabilityModalProps> = ({
  isOpen,
  onClose,
  availability,
  onSave,
}) => {
  // Clone the availability for editing
  const [editAvailability, setEditAvailability] = useState<Availability>(
    new Availability(DAYS, PERIODS_PER_DAY)
  );

  React.useEffect(() => {
    // Deep copy the passed availability
    const copy = new Availability(DAYS, PERIODS_PER_DAY);
    copy.buffer = [...availability.buffer];
    setEditAvailability(copy);
  }, [availability, isOpen]);

  const handleCellClick = (day: number, period: number) => {
    const newAvail = new Availability(DAYS, PERIODS_PER_DAY);
    newAvail.buffer = [...editAvailability.buffer];
    newAvail.toggle(day, period);
    setEditAvailability(newAvail);
  };

  const handleSave = () => {
    onSave(editAvailability);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 min-w-[400px] max-w-full">
        <h2 className="text-xl font-bold mb-4">Edit Teacher Availability</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse w-full">
            <thead>
              <tr>
                <th className="p-2 border"></th>
                {Array.from({ length: PERIODS_PER_DAY }, (_, p) => (
                  <th key={p} className="p-2 border text-center">Period {p + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: DAYS }, (_, d) => (
                <tr key={d}>
                  <th className="p-2 border text-left bg-gray-50">{dayNames[d]}</th>
                  {Array.from({ length: PERIODS_PER_DAY }, (_, p) => {
                    const available = editAvailability.get(d, p);
                    return (
                      <td
                        key={p}
                        className={`p-2 border text-center cursor-pointer select-none ${
                          available ? "bg-green-400" : "bg-red-400"
                        }`}
                        onClick={() => handleCellClick(d, p)}
                        title={available ? "Available" : "Not available"}
                      >
                        {available ? "✔" : "✗"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            onClick={handleSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherAvailabilityModal; 