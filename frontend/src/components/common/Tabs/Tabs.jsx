import { useState } from 'react';
import './Tabs.css';

function Tabs({ tabs = [], defaultTab, onChange }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);

  const handleChange = (key) => {
    setActive(key);
    onChange?.(key);
  };

  const activeTab = tabs.find((t) => t.key === active);

  return (
    <div className="tabs">
      <div className="tabs__nav" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={tab.key === active}
            className={`tabs__tab ${tab.key === active ? 'tabs__tab--active' : ''}`}
            onClick={() => handleChange(tab.key)}
            disabled={tab.disabled}
          >
            {tab.icon && <span className="tabs__tab-icon">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs__panel" role="tabpanel">
        {activeTab?.content}
      </div>
    </div>
  );
}

export default Tabs;
