import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BsCheck2, BsStars, BsCpu } from "react-icons/bs";

export default function ProcessingLoader({ isOpen, currentStep, onClose }) {
  const steps = [
    {
      id: 1,
      title: "OCR Extraction",
      desc: "Reading document layout, financials, and item metadata",
    },
    {
      id: 2,
      title: "Accounting Intent Engine",
      desc: "Identifying business event, payment status, and counterparties",
    },
    {
      id: 3,
      title: "Journal Generator",
      desc: "Structuring balanced double-entry entries and mapping to labels",
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0a0a0a] border border-white/10 w-full max-w-lg rounded-[32px] p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Background grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

          {/* Sparkles / Stars animation */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <BsCpu className="text-3xl animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center space-x-2">
                <BsStars className="text-teal-400 animate-spin-slow" />
                <span>Dabby AI Processing Pipeline</span>
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Running real-time staging audits and journal mappings
              </p>
            </div>

            {/* Steps Progress List */}
            <div className="space-y-6">
              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const isPending = currentStep < step.id;

                return (
                  <div
                    key={step.id}
                    className={`flex items-start space-x-5 p-4 rounded-2xl border transition-all duration-300 ${
                      isCurrent
                        ? "bg-white/[0.03] border-white/10 shadow-lg"
                        : isCompleted
                        ? "bg-teal-500/5 border-teal-500/10 opacity-70"
                        : "bg-transparent border-transparent opacity-40"
                    }`}
                  >
                    {/* Circle Indicator */}
                    <div className="relative flex-shrink-0 mt-0.5">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-teal-500 text-black flex items-center justify-center text-sm font-black">
                          <BsCheck2 strokeWidth={1.5} />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-6 h-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-white/10 bg-white/5" />
                      )}
                    </div>

                    {/* Step details */}
                    <div className="space-y-1">
                      <h4
                        className={`text-sm font-bold tracking-tight ${
                          isCurrent
                            ? "text-teal-400"
                            : isCompleted
                            ? "text-white"
                            : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
