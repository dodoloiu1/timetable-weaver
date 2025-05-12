import { useCallback, useEffect, useState } from "react";
import { Scheduler, Teacher, Class, Timetable, Availability, DAYS, PERIODS_PER_DAY } from "../util/timetable";
import Sidebar from "./components/Sidebar";
import TeachersTab from "./components/TeachersTab";
import ClassesTab from "./components/ClassesTab";
import LessonsTab from "./components/LessonsTab";
import OverviewTab from "./components/OverviewTab";
import TimetableDisplay from "./components/TimetableDisplay";

// Type definition for the saved app state
interface AppState {
  activeTab: string;
  sidebarMode: "default" | "timetable";
  teachers: Teacher[];
  classes: Class[];
  generatedTimetable: Timetable | null;
}

// Helper to check if localStorage is available
const isLocalStorageAvailable = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error("localStorage not available:", e);
    return false;
  }
};

function App() {
  const [nodeVersion, setNodeVersion] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [sidebarMode, setSidebarMode] = useState<"default" | "timetable">("default");
  
  // Timetable creation state
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [generatedTimetable, setGeneratedTimetable] = useState<Timetable | null>(null);
  const [storageAvailable, setStorageAvailable] = useState<boolean>(true);

  // Check localStorage availability on mount
  useEffect(() => {
    const available = isLocalStorageAvailable();
    setStorageAvailable(available);
    console.log("LocalStorage available:", available);
  }, []);

  // Load state from localStorage on initial render
  useEffect(() => {
    if (!storageAvailable) return;
    
    try {
      console.log("Attempting to load from localStorage");
      const savedState = localStorage.getItem('timetableWeaverState');
      console.log("Raw saved state:", savedState ? "exists" : "null");
      
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        console.log("Parsed state has keys:", Object.keys(parsedState));
        
        // Reconstruct objects with their methods
        if (parsedState.teachers && Array.isArray(parsedState.teachers)) {
          console.log(`Reconstructing ${parsedState.teachers.length} teachers`);
          const reconstructedTeachers = parsedState.teachers.map((t: any) => {
            let teacherAvailability: Availability;
            if (t.availability && Array.isArray(t.availability.buffer)) {
              teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
              teacherAvailability.buffer = [...t.availability.buffer];
            } else {
              teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
            }
            return new Teacher(t.name, teacherAvailability);
          });
          setTeachers(reconstructedTeachers);
        }
        
        if (parsedState.classes && Array.isArray(parsedState.classes)) {
          console.log(`Reconstructing ${parsedState.classes.length} classes`);
          const reconstructedClasses = parsedState.classes.map((c: any) => {
            // First reconstruct all the teachers for the lessons
            const lessons = c.lessons.map((l: any) => {
              let teacherAvailability: Availability;
              if (l.teacher.availability && Array.isArray(l.teacher.availability.buffer)) {
                teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
                teacherAvailability.buffer = [...l.teacher.availability.buffer];
              } else {
                teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
              }
              const teacher = new Teacher(l.teacher.name, teacherAvailability);
              return { name: l.name, teacher, periodsPerWeek: l.periodsPerWeek };
            });
            return new Class(c.name, lessons);
          });
          setClasses(reconstructedClasses);
        }
        
        if (parsedState.generatedTimetable && parsedState.classes) {
          console.log("Reconstructing timetable");
          try {
            // Reconstruct classes first for the timetable
            const timetableClasses = parsedState.classes.map((c: any) => {
              const lessons = c.lessons.map((l: any) => {
                let teacherAvailability: Availability;
                if (l.teacher.availability && Array.isArray(l.teacher.availability.buffer)) {
                  teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
                  teacherAvailability.buffer = [...l.teacher.availability.buffer];
                } else {
                  teacherAvailability = new Availability(DAYS, PERIODS_PER_DAY);
                }
                const teacher = new Teacher(l.teacher.name, teacherAvailability);
                return { name: l.name, teacher, periodsPerWeek: l.periodsPerWeek };
              });
              return new Class(c.name, lessons);
            });
            
            const timetable = new Timetable(timetableClasses);
            if (parsedState.generatedTimetable.schedule) {
              timetable.schedule = parsedState.generatedTimetable.schedule;
            }
            setGeneratedTimetable(timetable);
          } catch (e) {
            console.error("Error reconstructing timetable:", e);
          }
        }

        if (parsedState.activeTab) {
          console.log("Setting active tab to:", parsedState.activeTab);
          setActiveTab(parsedState.activeTab);
        }
        
        if (parsedState.sidebarMode) {
          console.log("Setting sidebar mode to:", parsedState.sidebarMode);
          setSidebarMode(parsedState.sidebarMode);
        }
      } else {
        console.log("No saved state found in localStorage");
      }
    } catch (error) {
      console.error("Error loading state from localStorage:", error);
      // If there's an error loading state, just continue with default state
    }
  }, [storageAvailable]);
  
  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    if (!storageAvailable) return;
    
    try {
      console.log("Saving state to localStorage");
      const stateToSave: AppState = {
        activeTab,
        sidebarMode,
        teachers,
        classes,
        generatedTimetable
      };
      
      // To avoid saving empty state during initialization
      if (teachers.length === 0 && classes.length === 0 && !generatedTimetable) {
        // Only save the UI state, not the empty data
        const uiState = {
          activeTab,
          sidebarMode
        };
        
        // Check if we already have saved data
        const existingState = localStorage.getItem('timetableWeaverState');
        if (existingState) {
          try {
            const parsedExisting = JSON.parse(existingState);
            // Only save UI state if we have existing data
            if (parsedExisting.teachers?.length > 0 || parsedExisting.classes?.length > 0) {
              const mergedState = {
                ...parsedExisting,
                ...uiState
              };
              localStorage.setItem('timetableWeaverState', JSON.stringify(mergedState));
              console.log("Saved UI state while preserving existing data");
              return;
            }
          } catch (e) {
            // If parsing fails, continue with normal save
          }
        }
      }
      
      // Normal save with all data
      localStorage.setItem('timetableWeaverState', JSON.stringify(stateToSave));
      // Verify data was saved
      const savedData = localStorage.getItem('timetableWeaverState');
      console.log("Saved data size:", savedData ? savedData.length : 0, "bytes");
    } catch (error) {
      console.error("Error saving state to localStorage:", error);
    }
  }, [activeTab, sidebarMode, teachers, classes, generatedTimetable, storageAvailable]);

  const updateNodeVersion = useCallback(
    async () =>
      setNodeVersion(await backend.nodeVersion("Hello from App.tsx!")),
    [],
  );

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // If we switch to "home" from timetable creation mode, reset to default mode
    if (tab === "home" && sidebarMode === "timetable") {
      setSidebarMode("default");
    }
  };
  
  const handleCreateTimetable = () => {
    setSidebarMode("timetable");
    setActiveTab("teachers");
  };
  
  const handleTimetableGenerated = (timetable: Timetable | null) => {
    setGeneratedTimetable(timetable);
  };
  
  const handleCloseTimetable = () => {
    setGeneratedTimetable(null);
  };
  
  const handleClearData = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      if (storageAvailable) {
        localStorage.removeItem('timetableWeaverState');
        console.log("Cleared localStorage data");
      }
      setActiveTab("home");
      setSidebarMode("default");
      setTeachers([]);
      setClasses([]);
      setGeneratedTimetable(null);
    }
  };
  
  // Function to manually save current state for debugging
  const handleForceSave = () => {
    if (!storageAvailable) {
      alert("LocalStorage is not available in your browser");
      return;
    }
    
    try {
      const stateToSave: AppState = {
        activeTab,
        sidebarMode,
        teachers,
        classes,
        generatedTimetable
      };
      localStorage.setItem('timetableWeaverState', JSON.stringify(stateToSave));
      const savedData = localStorage.getItem('timetableWeaverState');
      if (savedData) {
        alert(`Successfully saved ${savedData.length} bytes to localStorage`);
      } else {
        alert("Failed to save data to localStorage");
      }
    } catch (error) {
      alert(`Error saving to localStorage: ${error}`);
    }
  };

  // Render the appropriate content based on the active tab and mode
  const renderContent = () => {
    // Default mode tabs
    if (sidebarMode === "default") {
      if (activeTab === "home") {
        return (
          <div className="p-6 text-center max-w-2xl mx-auto">
            <img src="./vite.svg" className="logo mx-auto mb-8" alt="Vite logo" />
            <h1 className="text-3xl font-bold mb-6">Welcome to Timetable Weaver</h1>
            <p className="mb-8 text-gray-600">
              Create optimal timetables for your school or institution with our intelligent scheduling system.
            </p>
            
            {!storageAvailable && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
                Warning: Local storage is not available. Your changes won't be saved between sessions.
              </div>
            )}
            
            <button
              onClick={handleCreateTimetable}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Create New Timetable
            </button>
            
            {(teachers.length > 0 || classes.length > 0) && (
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={handleClearData}
                  className="text-red-600 hover:text-red-800 underline text-sm"
                >
                  Clear Saved Data
                </button>
                <button
                  onClick={handleForceSave}
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  Force Save Data
                </button>
              </div>
            )}
            
            <div className="mt-10 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
              <button
                onClick={updateNodeVersion}
                className="underline text-blue-600"
              >
                Check Node Version
              </button>
              {nodeVersion && <p className="mt-2">Node version: {nodeVersion}</p>}
            </div>
          </div>
        );
      } else if (activeTab === "about") {
        return (
          <div className="text-center max-w-2xl mx-auto p-6">
            <h2 className="text-2xl mb-4">About Timetable Weaver</h2>
            <p className="mb-4">
              Timetable Weaver is a sophisticated scheduling application designed to create
              optimized timetables for schools and educational institutions.
            </p>
            <p className="mb-4">
              It intelligently arranges classes, teachers, and resources to minimize conflicts
              and maximize efficiency.
            </p>
            <p className="mb-4">
              Using advanced algorithms, it resolves scheduling conflicts and creates
              timetables that respect teacher availability while ensuring all required
              lessons are scheduled optimally.
            </p>
          </div>
        );
      }
    } 
    // Timetable creation mode tabs
    else if (sidebarMode === "timetable") {
      if (activeTab === "teachers") {
        return <TeachersTab 
          teachers={teachers} 
          classes={classes}
          onTeachersChange={setTeachers} 
          onClassesChange={setClasses}
        />;
      } else if (activeTab === "classes") {
        return <ClassesTab classes={classes} onClassesChange={setClasses} />;
      } else if (activeTab === "lessons") {
        return (
          <LessonsTab 
            classes={classes} 
            teachers={teachers} 
            onClassesChange={setClasses} 
          />
        );
      } else if (activeTab === "overview") {
        return (
          <OverviewTab 
            classes={classes} 
            teachers={teachers} 
            onTimetableGenerated={handleTimetableGenerated} 
          />
        );
      }
    }
    
    // Default fallback
    return <div>Page not found</div>;
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        onTabChange={handleTabChange} 
        mode={sidebarMode} 
        activeTab={activeTab}
      />
      
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {renderContent()}
      </div>
      
      {generatedTimetable && (
        <TimetableDisplay 
          timetable={generatedTimetable} 
          onClose={handleCloseTimetable} 
        />
      )}
    </div>
  );
}

export default App;
