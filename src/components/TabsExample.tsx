import { Tabs } from './ui/tabs';

/**
 * Example usage of the enhanced Tabs component with rich page-like transitions
 */
export function TabsExample() {
  const tabs = [
    {
      label: 'Overview',
      content: (
        <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 rounded-lg min-h-[400px]">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Welcome to Overview
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            This tab demonstrates the smooth page-like transition effect.
            Notice how the content slides in from the right when you switch
            from a previous tab, and slides out to the left when moving forward.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-700 p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Feature 1</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Smooth spring animations
              </p>
            </div>
            <div className="bg-white dark:bg-gray-700 p-4 rounded shadow">
              <h3 className="font-semibold mb-2">Feature 2</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Blur and scale effects
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Analytics',
      content: (
        <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 rounded-lg min-h-[400px]">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Experience the app-like navigation as you switch between tabs.
            The content transitions feel natural and fluid.
          </p>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Users</span>
                <span className="text-2xl font-bold">12,345</span>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Sessions</span>
                <span className="text-2xl font-bold">8,901</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Settings',
      content: (
        <div className="p-8 bg-gradient-to-br from-green-50 to-teal-50 dark:from-gray-900 dark:to-gray-800 rounded-lg min-h-[400px]">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            Settings Panel
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            The sliding animation creates a sense of navigating between different
            screens, similar to mobile app experiences.
          </p>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option>Light</option>
                <option>Dark</option>
                <option>Auto</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600">
                <option>English</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      label: 'Profile',
      content: (
        <div className="p-8 bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 rounded-lg min-h-[400px]">
          <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
            User Profile
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Watch how the underline indicator smoothly glides to the active tab,
            while the content transitions with blur, scale, and slide effects.
          </p>
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full" />
            <div>
              <h3 className="text-xl font-semibold">John Doe</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                john.doe@example.com
              </p>
            </div>
          </div>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Edit Profile
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8 text-center text-gray-900 dark:text-white">
        Enhanced Tabs Component
      </h1>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
        Click between tabs to experience the smooth page-like transitions
      </p>
      
      <Tabs tabs={tabs} defaultActive={0} />
    </div>
  );
}

/**
 * Minimal Usage Example
 */
export function MinimalExample() {
  const simpleTabs = [
    {
      label: 'Tab 1',
      content: <div className="p-8">Content for tab 1</div>,
    },
    {
      label: 'Tab 2',
      content: <div className="p-8">Content for tab 2</div>,
    },
    {
      label: 'Tab 3',
      content: <div className="p-8">Content for tab 3</div>,
    },
  ];

  return <Tabs tabs={simpleTabs} defaultActive={0} />;
}

export default TabsExample;
