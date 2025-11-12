# Tabs Component Integration Guide

## ✅ Setup Verification Complete

Your project has all required dependencies:

- ✅ **TypeScript**: v5.9.3 - Configured
- ✅ **Tailwind CSS**: v4.1.17 - Configured  
- ✅ **shadcn/ui structure**: Components in `src/components/ui/`
- ✅ **Motion library**: v12.23.24 - Installed
- ✅ **Utils function**: `src/lib/utils.ts` exists

## 📦 Files Created

### 1. **Tabs Component** 
`src/components/ui/tabs.tsx`
- Animated tab component with 3D perspective effects
- Uses motion/react for smooth animations
- Supports custom styling via className props

### 2. **Demo Component**
`src/components/tabs-demo.tsx`
- Example implementation showing 5 tabs
- Ready to use in your app
- Demonstrates gradient backgrounds and content layouts

### 3. **CSS Updates**
`src/index.css`
- Added `.no-visible-scrollbar` utility class
- Hides scrollbar while maintaining scroll functionality

## 🎯 Component Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── tabs.tsx          ← Main tabs component
│   │   ├── button.tsx        ← Existing
│   │   ├── card.tsx          ← Existing
│   │   └── ...
│   └── tabs-demo.tsx         ← Demo/example component
```

## 🚀 Usage

### Basic Implementation

```tsx
import { Tabs } from "@/components/ui/tabs";

function MyComponent() {
  const tabs = [
    {
      title: "Tab 1",
      value: "tab1",
      content: (
        <div className="p-10">
          <h2>Tab 1 Content</h2>
        </div>
      ),
    },
    {
      title: "Tab 2", 
      value: "tab2",
      content: (
        <div className="p-10">
          <h2>Tab 2 Content</h2>
        </div>
      ),
    },
  ];

  return (
    <div className="h-[40rem] max-w-5xl mx-auto">
      <Tabs tabs={tabs} />
    </div>
  );
}
```

### With Custom Styling

```tsx
<Tabs 
  tabs={tabs}
  containerClassName="bg-slate-900"
  activeTabClassName="bg-blue-600"
  tabClassName="text-lg font-semibold"
  contentClassName="mt-20"
/>
```

## 🎨 Props

### Tabs Component Props

| Prop | Type | Description |
|------|------|-------------|
| `tabs` | `Tab[]` | Array of tab objects (required) |
| `containerClassName` | `string` | Custom class for tabs container |
| `activeTabClassName` | `string` | Custom class for active tab background |
| `tabClassName` | `string` | Custom class for tab buttons |
| `contentClassName` | `string` | Custom class for content area |

### Tab Object Structure

```typescript
type Tab = {
  title: string;           // Tab label
  value: string;           // Unique identifier
  content: React.ReactNode; // Tab content
};
```

## 🎭 Features

1. **Animated Transitions**: Smooth spring animations when switching tabs
2. **3D Perspective**: Tabs stack with depth effect on hover
3. **Layout Animation**: Content smoothly morphs between tabs
4. **Responsive**: Works on mobile and desktop
5. **Dark Mode**: Fully styled for dark theme
6. **Keyboard Accessible**: Standard button interactions

## 🖼️ Demo Usage

To see the component in action, import the demo:

```tsx
import TabsDemo from "@/components/tabs-demo";

function App() {
  return (
    <div>
      <TabsDemo />
    </div>
  );
}
```

### Demo Requirements

The demo component references `/linear.webp` image. You'll need to:

1. Add `linear.webp` to your `public/` folder, OR
2. Update the image path in `tabs-demo.tsx` to use your own image, OR
3. Remove the `<DummyContent />` component if you don't need it

## 🔧 Customization Examples

### Example 1: Minimal Tabs

```tsx
const minimalTabs = [
  {
    title: "Overview",
    value: "overview",
    content: <div className="p-8">Overview content</div>,
  },
  {
    title: "Details",
    value: "details",
    content: <div className="p-8">Details content</div>,
  },
];

<Tabs 
  tabs={minimalTabs}
  containerClassName="justify-center"
  activeTabClassName="bg-white/10"
/>
```

### Example 2: Full-Width Tabs

```tsx
<div className="w-full h-screen">
  <Tabs 
    tabs={tabs}
    containerClassName="w-full px-4"
    contentClassName="mt-16"
  />
</div>
```

### Example 3: Custom Colors

```tsx
const coloredTabs = [
  {
    title: "Red",
    value: "red",
    content: (
      <div className="bg-gradient-to-br from-red-500 to-red-700 p-10 rounded-2xl">
        Red content
      </div>
    ),
  },
  {
    title: "Blue",
    value: "blue",
    content: (
      <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-10 rounded-2xl">
        Blue content
      </div>
    ),
  },
];
```

## 🎬 Animation Details

- **Spring Physics**: Natural bounce effect (bounce: 0.3, duration: 0.6)
- **Stacking Effect**: Each tab scales down 10% and moves back
- **Hover Effect**: Tabs fan out by 50px on hover
- **Active Animation**: Gentle Y-axis bounce [0, 40, 0]

## 🐛 Troubleshooting

### Motion Import Error

If you see import errors for `motion/react`:

```bash
npm install motion@latest
```

### Type Errors

If TypeScript complains about types, ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "moduleResolution": "bundler"
  }
}
```

### Styles Not Working

1. Ensure Tailwind is processing your components:
   ```javascript
   // tailwind.config.js
   content: ["./src/**/*.{js,ts,jsx,tsx}"]
   ```

2. Check that `@import "tailwindcss"` is in your `index.css`

### "use client" Directive

This directive is for Next.js. In Vite/React:
- It's harmless and can be kept
- Or remove it if you prefer (not needed for Vite)

## 📝 Integration Checklist

- [✅] TypeScript configured
- [✅] Tailwind CSS v4 installed and configured
- [✅] Component folder structure (`src/components/ui/`)
- [✅] Utils function exists (`src/lib/utils.ts`)
- [✅] Motion library installed
- [✅] `tabs.tsx` component created
- [✅] `tabs-demo.tsx` demo created
- [✅] CSS utilities added for scrollbar hiding
- [ ] (Optional) Add `linear.webp` to `public/` folder for demo
- [ ] Import and use the component in your app

## 🎉 Ready to Use!

The component is fully integrated and ready to use. Import it anywhere in your app:

```tsx
import { Tabs } from "@/components/ui/tabs";
```

For a working example, check out:
```tsx
import TabsDemo from "@/components/tabs-demo";
```
