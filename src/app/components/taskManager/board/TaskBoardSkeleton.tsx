const TaskBoardSkeleton = () => {
  return (
    <div className="flex flex-col h-full mx-auto px-2 py-8">
      {/* Search and filter area */}
      <div className="p-4 space-y-4 md:mx-auto md:w-[768px] lg:w-[896px]">
        {/* Search bar skeleton */}
        <div className="flex gap-2">
          <div className="flex-1 h-10 bg-white/10 rounded-lg" />
          <div className="h-10 w-10 bg-white/10 rounded-lg" />
        </div>

        {/* Status tabs skeleton */}
        <div className="mb-6 flex justify-between items-center">
          <div className="h-10 w-24 bg-white/10 rounded-lg" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 bg-white/10 rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Board skeleton */}
      <div 
        className="flex-1 min-h-0 bg-surface/50 backdrop-blur-lg rounded-xl border border-white/10
                  md:mx-auto md:w-[768px] lg:w-[896px]"
      >
        <div className="flex flex-col h-full p-4">
          {/* Column header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex justify-between items-center">
              <div className="h-8 w-32 bg-white/10 rounded-lg" />
              <div className="h-12 w-12 bg-white/10 rounded-lg" />
            </div>
          </div>

          {/* Task skeletons */}
          <div className="flex-1 overflow-y-auto min-h-[100px] space-y-3 
                         scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                         px-2 w-full
                         md:mx-auto md:max-w-2xl lg:max-w-3xl">
            {[1, 2, 3].map((i) => (
              <div 
                key={i}
                className="bg-surface rounded-lg shadow-lg border border-white/5 p-4 h-[120px]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskBoardSkeleton 