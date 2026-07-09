import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useBusinessEngine, usePipeline, useProcessingTimeline } from '../../../hooks/useBusinessEngine';
import BusinessEngineSummary from './components/BusinessEngineSummary';
import BusinessEngineFilters from './components/BusinessEngineFilters';
import PipelineBoard from './components/PipelineBoard';
import TimelineTable from './components/TimelineTable';
import InspectorDrawer from './components/InspectorDrawer';
import { BsKanban, BsListUl, BsArrowRepeat } from 'react-icons/bs';

export default function BusinessEngine() {
  const { workbench } = useOutletContext() || {};
  const workbenchId = workbench?.id || 'demo';
  
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' | 'timeline'
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { kpis, loading: kpiLoading } = useBusinessEngine(workbenchId);
  const { 
    cards, 
    loading: pipelineLoading, 
    activeFilters, 
    setFilters, 
    searchQuery, 
    setSearchQuery,
    moveCard 
  } = usePipeline(workbenchId);
  
  const { data: timelineData, loading: timelineLoading } = useProcessingTimeline(workbenchId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#111111] overflow-hidden relative">
      
      {/* Module Header */}
      <div className="px-6 lg:px-10 py-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#181818]/50 z-10">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Business Engine</h1>
          <p className="text-sm text-gray-400 mt-1">Monitor the operational lifecycle of financial evidence</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-[#111111] border border-white/10 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('pipeline')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'pipeline' ? 'bg-white/10 text-teal-400' : 'text-gray-500 hover:text-white'}`}
              title="Pipeline View"
            >
              <BsKanban />
            </button>
            <button 
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'timeline' ? 'bg-white/10 text-teal-400' : 'text-gray-500 hover:text-white'}`}
              title="Timeline View"
            >
              <BsListUl />
            </button>
          </div>
          
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#181818] hover:bg-[#222222] border border-white/10 rounded-lg text-sm font-medium text-white transition-colors">
            <BsArrowRepeat className="text-gray-400" />
            <span>Sync Engine</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto px-6 lg:px-10 py-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          
          <BusinessEngineSummary kpis={kpis} loading={kpiLoading} />
          
          <BusinessEngineFilters 
            activeFilters={activeFilters}
            onFilterChange={(id, val) => setFilters(prev => ({ ...prev, [id]: val }))}
            searchQuery={searchQuery}
            onSearch={setSearchQuery}
          />

          {viewMode === 'pipeline' ? (
            <PipelineBoard 
              cards={cards} 
              loading={pipelineLoading} 
              onMoveCard={moveCard}
              onCardClick={setSelectedDoc}
            />
          ) : (
            <TimelineTable 
              data={timelineData} 
              loading={timelineLoading} 
              onRowClick={setSelectedDoc}
            />
          )}

        </div>
      </div>

      {/* Inspector Slide-out */}
      <InspectorDrawer 
        isOpen={!!selectedDoc} 
        onClose={() => setSelectedDoc(null)} 
        data={selectedDoc} 
      />
      
    </div>
  );
}
