import { useState } from "react";
import { ChipBar } from "./ChipBar";

const CHIPS = [
  { id: "friends", label: "친구" },
  { id: "news", label: "소식" },
];

export function TabNavigation({ darkMode = false }: { darkMode?: boolean }) {
  const [activeTab, setActiveTab] = useState("friends");

  return (
    <ChipBar chips={CHIPS} activeId={activeTab} onChange={setActiveTab} darkMode={darkMode} />
  );
}
