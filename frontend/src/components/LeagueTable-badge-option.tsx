// Alternative Option 2: Badge/Icon Approach
// Replace the highlighting section with this:

{/* Viktoria team highlighting - small badge approach */}
{isViktoriaTeam && (
  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-viktoria-yellow rounded-full" />
)}

// Or with a star icon:
{isViktoriaTeam && (
  <div className="absolute left-2 top-1/2 -translate-y-1/2">
    <svg className="w-3 h-3 text-viktoria-yellow fill-current" viewBox="0 0 20 20">
      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
    </svg>
  </div>
)}