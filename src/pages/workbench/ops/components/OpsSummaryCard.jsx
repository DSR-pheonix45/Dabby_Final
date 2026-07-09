import React from 'react';

export default function OpsSummaryCard({ title, value, subtitle, icon: Icon, trend }) {
  return (
    <div className="bg-[#181818] border border-white/10 rounded-xl p-5 shadow-sm hover:border-white/20 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-2">{value}</h3>
          
          <div className="flex items-center mt-3">
            {trend && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${
                trend.direction === 'up' 
                  ? 'bg-teal-500/10 text-teal-400' 
                  : trend.direction === 'down' 
                    ? 'bg-rose-500/10 text-rose-400' 
                    : 'bg-gray-500/10 text-gray-400'
              }`}>
                {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-xs text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
        
        {Icon && (
          <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-gray-400">
            <Icon className="text-lg" />
          </div>
        )}
      </div>
    </div>
  );
}
