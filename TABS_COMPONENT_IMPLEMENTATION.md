# Enhanced Tabs Component - Aceternity UI Style

A production-ready React tab component with rich **app-like page transitions** inspired by Aceternity UI. Built for React + Vite with Tailwind CSS and Framer Motion.

## ✨ Features

- 🎯 **Page-Like Transitions**: Content slides, scales, and blurs like navigating between app screens
- 🌊 **Smooth Animations**: Spring physics and cubic-bezier easing for fluid motion
- 📍 **Animated Indicator**: Underline smoothly glides between active tabs
- 🎨 **Fully Styled**: Tailwind CSS with dark mode support
- ♿ **Accessible**: Keyboard navigation and semantic HTML
- 📦 **Self-Contained**: No external dependencies beyond React, Tailwind, and Framer Motion
- 📱 **Responsive**: Works seamlessly on all screen sizes

## 🚀 Quick Start

### Basic Usage

```tsx
import { Tabs } from './components/ui/tabs';

function App() {
  const tabs = [
    {
      label: 'Overview',
      content: <div className="p-8">Your content here</div>,
    },
    {
      label: 'Analytics',
      content: <div className="p-8">Analytics content</div>,
    },
    {
      label: 'Settings',
      content: <div className="p-8">Settings content</div>,
    },
  ];

  return <Tabs tabs={tabs} defaultActive={0} />;
}
```

## 📖 Component API

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tabs` | `TabItem[]` | **required** | Array of tab configurations |
| `defaultActive` | `number` | `0` | Index of the initially active tab |
| `className` | `string` | `''` | Additional CSS classes for the container |

### TabItem Type

```typescript
interface TabItem {
  label: string;        // Tab button text
  content: ReactNode;   // Tab panel content
}
```

## 🎨 Animation Details

The component features three sophisticated animation effects:

### 1. **Slide Animation**
- Content slides horizontally (100% viewport width)
- Direction based on navigation (left/right)

### 2. **Scale & Blur**
- Content scales from 95% to 100%
- Blur transitions from 8px to 0px
- Creates depth and focus effect

### 3. **Spring Physics**
- `stiffness: 300` - Snappy response
- `damping: 30` - Smooth deceleration
- `mass: 0.8` - Light, responsive feel

### Underline Indicator
- Uses Framer Motion's `layoutId` for shared layout animations
- Spring transition with higher stiffness (380) for instant response
- Gradient from blue-500 to purple-500

## 📂 File Structure

```
src/
├── components/
│   ├── ui/
│   │   └── tabs.tsx          # Main Tabs component
│   ├── TabsExample.tsx       # Example usage with demos
│   └── TabsDemo.tsx          # Demo page component
```

## 🎯 Advanced Example

See `TabsExample.tsx` for a comprehensive example with:
- Rich content layouts
- Gradient backgrounds
- Interactive elements
- Dark mode support
- Responsive design patterns

```tsx
import TabsExample from './components/TabsExample';

function App() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 p-8">
      <TabsExample />
    </div>
  );
}
```

## 🔧 Customization

### Custom Transition Timing

Edit the `transition` object in `tabs.tsx`:

```typescript
const transition = {
  type: 'spring',
  stiffness: 300,    // Higher = snappier
  damping: 30,       // Higher = less bounce
  mass: 0.8,         // Lower = lighter feel
};
```

### Alternative Cubic-Bezier Easing

Use the included `smoothTransition` for a different feel:

```typescript
const smoothTransition = {
  duration: 0.5,
  ease: [0.32, 0.72, 0, 1], // Custom cubic-bezier
};
```

Replace `transition={transition}` with `transition={smoothTransition}` in the motion.div.

### Custom Styling

Override classes using the `className` prop:

```tsx
<Tabs 
  tabs={tabs} 
  className="max-w-4xl mx-auto shadow-lg rounded-lg bg-gray-50 p-6"
/>
```

### Dark Mode

The component automatically supports dark mode via Tailwind's `dark:` variants. Ensure your app has dark mode configured:

```tsx
// In your root component or tailwind.config.js
<div className="dark"> {/* or use system preference */}
  <Tabs tabs={tabs} />
</div>
```

## 🎭 Animation Variants Explained

```typescript
slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? '100%' : '-100%',  // Start off-screen
    opacity: 0,                            // Fully transparent
    scale: 0.95,                           // Slightly smaller
    filter: 'blur(8px)',                   // Blurred
  }),
  center: {
    x: 0,                                  // Centered position
    opacity: 1,                            // Fully visible
    scale: 1,                              // Normal size
    filter: 'blur(0px)',                   // Clear
  },
  exit: (direction) => ({
    x: direction > 0 ? '-100%' : '100%',  // Exit opposite direction
    opacity: 0,                            // Fade out
    scale: 0.95,                           // Shrink slightly
    filter: 'blur(8px)',                   // Blur out
  }),
}
```

## ⚡ Performance Tips

1. **Memoize Heavy Content**: Wrap complex tab content in `React.memo()` to prevent unnecessary re-renders
2. **Lazy Load**: Use `React.lazy()` for tab content that loads external data
3. **Optimize Images**: Use appropriate image formats and lazy loading within tab content

```tsx
import { memo } from 'react';

const HeavyContent = memo(() => (
  <div>{/* Complex content */}</div>
));

const tabs = [
  {
    label: 'Heavy Tab',
    content: <HeavyContent />,
  },
];
```

## 🌟 Comparison with Original Tabs

The file now contains **two** tab components:

### `TabsOriginal` (from Aceternity UI)
- Reorders tabs on click (selected moves to front)
- 3D perspective effects
- Rounded pill-style tabs

### `Tabs` (New Enhanced Version)
- Page-like slide transitions
- Direction-aware animations
- Underline indicator
- Better for content-heavy applications

## 🐛 Troubleshooting

### Animations not working?
- Ensure `motion` package is installed: `npm install motion`
- Check that Framer Motion is v10+ (or `motion` v12+)

### Content jumps or flickers?
- Make sure parent container has `overflow-hidden`
- Check for conflicting CSS transitions

### Underline not animating?
- Each tab button must have a unique `key` prop (handled automatically)
- Ensure `layoutId` is unique across your app

## 📝 License

This component is provided as-is for use in your React + Vite projects. Inspired by Aceternity UI.

## 🤝 Contributing

Feel free to customize and extend this component for your needs!

---

**Built with ❤️ using React, Vite, Tailwind CSS, and Framer Motion**
