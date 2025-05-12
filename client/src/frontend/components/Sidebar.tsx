import { useState, useEffect } from "react";

interface SidebarProps {
  onTabChange?: (tab: string) => void;
  mode: "default" | "timetable";
  activeTab?: string;
}

interface SidebarTab {
  id: string;
  label: string;
}

const Sidebar: React.FC<SidebarProps> = ({ onTabChange, mode, activeTab: propActiveTab }) => {
  const [activeTab, setActiveTab] = useState<string>(propActiveTab || "home");
  
  const defaultTabs: SidebarTab[] = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" }
  ];
  
  const timetableTabs: SidebarTab[] = [
    { id: "teachers", label: "Teachers" },
    { id: "classes", label: "Classes" },
    { id: "lessons", label: "Lessons" },
    { id: "overview", label: "Overview" }
  ];
  
  const tabs = mode === "timetable" ? timetableTabs : defaultTabs;
  
  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab);
    }
  }, [propActiveTab]);
  
  useEffect(() => {
    // When mode changes, set the active tab to the first tab in the new tab set
    if (mode === "timetable" && !timetableTabs.some(tab => tab.id === activeTab)) {
      const firstTab = timetableTabs[0].id;
      setActiveTab(firstTab);
      if (onTabChange) {
        onTabChange(firstTab);
      }
    } else if (mode === "default" && !defaultTabs.some(tab => tab.id === activeTab)) {
      const firstTab = defaultTabs[0].id;
      setActiveTab(firstTab);
      if (onTabChange) {
        onTabChange(firstTab);
      }
    }
  }, [mode]);
  
  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onTabChange) {
      onTabChange(tabId);
    }
  };
  
  return (
    <div className="h-full w-64 bg-zinc-800 text-white flex flex-col">
      <div className="p-4 border-b border-zinc-700">
        <h1 className="text-xl font-bold">Timetable Weaver</h1>
        {mode === "timetable" && (
          <p className="text-sm text-zinc-400 mt-1">Creating New Timetable</p>
        )}
      </div>
      
      <div className="flex flex-col flex-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`p-4 text-left hover:bg-zinc-700 transition-colors ${
              activeTab === tab.id ? "bg-zinc-700 border-l-4 border-blue-500" : ""
            }`}
            onClick={() => handleTabClick(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {mode === "timetable" && (
        <div className="p-4 border-t border-zinc-700">
          <button 
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            onClick={() => {
              if (onTabChange) {
                onTabChange("home");
              }
            }}
          >
            Cancel Timetable
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar; 