import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import "highlight.js/styles/github-dark.css";
import ThinkingIndicator from "./ThinkingIndicator";
import { Sparkles, Percent, Lock, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

const DabbyChart = ({ jsonString }) => {
  try {
    const config = JSON.parse(jsonString.trim());
    const { title, type = "line", data, keys = [], colors = [] } = config;
    
    if (!data || !Array.isArray(data)) {
      return <div className="text-xs text-red-400 p-2">Invalid chart data format</div>;
    }

    const defaultColors = ["#81E6D9", "#3182CE", "#D69E2E", "#E53E3E", "#319795"];
    
    const renderChart = () => {
      if (type === "bar") {
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#718096" fontSize={11} />
            <YAxis stroke="#718096" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: "#0E1117", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i] || defaultColors[i % defaultColors.length]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        );
      }
      if (type === "area") {
        return (
          <AreaChart data={data}>
            <defs>
              {keys.map((key, i) => (
                <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors[i] || defaultColors[i % defaultColors.length]} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={colors[i] || defaultColors[i % defaultColors.length]} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" stroke="#718096" fontSize={11} />
            <YAxis stroke="#718096" fontSize={11} />
            <Tooltip contentStyle={{ backgroundColor: "#0E1117", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {keys.map((key, i) => (
              <Area key={key} type="monotone" dataKey={key} stroke={colors[i] || defaultColors[i % defaultColors.length]} fillOpacity={1} fill={`url(#grad-${key})`} strokeWidth={2} />
            ))}
          </AreaChart>
        );
      }
      if (type === "pie") {
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey={keys[0] || "value"}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              fontSize={10}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index] || defaultColors[index % defaultColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "#0E1117", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        );
      }
      // Default to "line"
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="name" stroke="#718096" fontSize={11} />
          <YAxis stroke="#718096" fontSize={11} />
          <Tooltip contentStyle={{ backgroundColor: "#0E1117", borderColor: "rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 11 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {keys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[i] || defaultColors[i % defaultColors.length]} strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 4 }} />
          ))}
        </LineChart>
      );
    };

    return (
      <div className="w-full my-6 bg-white/2 border border-white/5 p-4 rounded-2xl space-y-4">
        {title && <h5 className="text-xs font-bold uppercase tracking-wider text-teal-400/90 pl-1">{title}</h5>}
        <div className="w-full h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Failed to render DabbyChart:", err);
    return <pre className="text-xs text-red-400 p-4 bg-red-900/10 rounded-xl border border-red-500/20">Error parsing chart: {jsonString}</pre>;
  }
};

const DabbyScenarioTable = ({ jsonString }) => {
  try {
    const config = JSON.parse(jsonString.trim());
    const initRevenue = config.revenue || 192000;
    const initOpex = config.opex || 26100;
    const initCogs = config.cogs || 36000;
    const initCash = config.cashBalance || 150000;

    const [growth, setGrowth] = React.useState(0);
    const [opexSaving, setOpexSaving] = React.useState(0);

    const calculateMetrics = (revMult, opexMult) => {
      const revenue = initRevenue * (1 + growth / 100) * revMult;
      const cogs = initCogs * (1 + growth / 100) * revMult;
      const opex = initOpex * (1 - opexSaving / 100) * opexMult;
      const profit = revenue - cogs - opex;
      const margin = (profit / revenue) * 100;
      
      const monthlyOpex = opex / 12;
      const monthlyCogs = cogs / 12;
      const monthlyRevenue = revenue / 12;
      const monthlyBurn = (monthlyOpex + monthlyCogs) - monthlyRevenue;

      let runway = "Infinity (Positive Flow)";
      if (monthlyBurn > 0) {
        runway = `${(initCash / monthlyBurn).toFixed(1)} Months`;
      }
      
      return {
        revenue: `₹${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        cogs: `₹${cogs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        opex: `₹${opex.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        profit: `₹${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        margin: `${margin.toFixed(1)}%`,
        runway
      };
    };

    const base = calculateMetrics(1.0, 1.0);
    const optimistic = calculateMetrics(1.15, 0.95);
    const pessimistic = calculateMetrics(0.85, 1.05);

    return (
      <div className="w-full my-6 bg-white/2 border border-white/5 p-5 rounded-2xl space-y-5">
        <div className="space-y-1">
          <h5 className="text-xs font-bold uppercase tracking-wider text-teal-400/90">Interactive Scenario Workbench</h5>
          <p className="text-[10px] text-gray-400">Simulate changes in revenue growth and opex spending in real-time.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/25 p-4 rounded-xl border border-white/5">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">Target Revenue Growth</span>
              <span className="font-bold text-teal-400 font-mono">{growth >= 0 ? `+${growth}%` : `${growth}%`}</span>
            </div>
            <input
              type="range"
              min="-30"
              max="50"
              value={growth}
              onChange={(e) => setGrowth(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400">OpEx Spends Reduction</span>
              <span className="font-bold text-teal-400 font-mono">{opexSaving >= 0 ? `+${opexSaving}%` : `${opexSaving}%`}</span>
            </div>
            <input
              type="range"
              min="-20"
              max="40"
              value={opexSaving}
              onChange={(e) => setOpexSaving(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#1C2128] text-gray-200 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-400">Financial Metric</th>
                <th className="px-4 py-3 font-semibold text-amber-400">Pessimistic Case (-15%)</th>
                <th className="px-4 py-3 font-semibold text-teal-400">Expected Base Case</th>
                <th className="px-4 py-3 font-semibold text-emerald-400">Optimistic Case (+15%)</th>
              </tr>
            </thead>
            <tbody className="opacity-90">
              <tr className="border-b border-gray-800/30">
                <td className="px-4 py-2.5 font-medium text-gray-400">Forecasted Revenue</td>
                <td className="px-4 py-2.5 font-mono">{pessimistic.revenue}</td>
                <td className="px-4 py-2.5 font-mono text-white font-bold">{base.revenue}</td>
                <td className="px-4 py-2.5 font-mono">{optimistic.revenue}</td>
              </tr>
              <tr className="border-b border-gray-800/30">
                <td className="px-4 py-2.5 font-medium text-gray-400">Cost of Goods (COGS)</td>
                <td className="px-4 py-2.5 font-mono">{pessimistic.cogs}</td>
                <td className="px-4 py-2.5 font-mono text-white font-bold">{base.cogs}</td>
                <td className="px-4 py-2.5 font-mono">{optimistic.cogs}</td>
              </tr>
              <tr className="border-b border-gray-800/30">
                <td className="px-4 py-2.5 font-medium text-gray-400">Operating Spends (OpEx)</td>
                <td className="px-4 py-2.5 font-mono">{pessimistic.opex}</td>
                <td className="px-4 py-2.5 font-mono text-white font-bold">{base.opex}</td>
                <td className="px-4 py-2.5 font-mono">{optimistic.opex}</td>
              </tr>
              <tr className="border-b border-gray-800/50 bg-white/1">
                <td className="px-4 py-3 font-bold text-gray-300">Forecasted Net Profit</td>
                <td className="px-4 py-3 font-mono font-bold text-amber-500">{pessimistic.profit}</td>
                <td className="px-4 py-3 font-mono font-bold text-teal-400">{base.profit}</td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-400">{optimistic.profit}</td>
              </tr>
              <tr className="border-b border-gray-800/30">
                <td className="px-4 py-2.5 font-medium text-gray-400">Net Margin Efficiency</td>
                <td className="px-4 py-2.5 font-mono">{pessimistic.margin}</td>
                <td className="px-4 py-2.5 font-mono text-white font-bold">{base.margin}</td>
                <td className="px-4 py-2.5 font-mono">{optimistic.margin}</td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-bold text-gray-300">Expected Cash Runway</td>
                <td className="px-4 py-3 font-mono font-bold text-amber-400">{pessimistic.runway}</td>
                <td className="px-4 py-3 font-mono font-bold text-teal-400">{base.runway}</td>
                <td className="px-4 py-3 font-mono font-bold text-emerald-400">{optimistic.runway}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  } catch (err) {
    console.error("Failed to render DabbyScenarioTable:", err);
    return <pre className="text-xs text-red-400 p-4 bg-red-900/10 rounded-xl border border-red-500/20">Error parsing scenario: {jsonString}</pre>;
  }
};

const HighlightedText = ({ text, highlight }) => {
    if (!highlight || !highlight.trim()) return text;

    // Handle nested React elements or arrays of children
    if (typeof text !== 'string') {
        if (Array.isArray(text)) {
            return text.map((child, i) => (
                <HighlightedText key={i} text={child} highlight={highlight} />
            ));
        }
        if (React.isValidElement(text)) {
            // If it's an element with children, try to highlight its children
            if (text.props && text.props.children) {
                return React.cloneElement(text, {
                    children: <HighlightedText text={text.props.children} highlight={highlight} />
                });
            }
            return text;
        }
        return text;
    }

    // Escape regex special characters
    const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-teal-500/30 text-white rounded-sm px-0.5 border-b border-teal-400/50">{part}</mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const Message = ({ message, searchTerm }) => {

    const formattedTime = format(new Date(message.timestamp), "h:mm a");
    const isUser = message.role === "user";
    const isAI = message.role === "assistant";

    // Parse Content for Chips
    const parseContent = (content) => {
        if (!content) return { text: "", chips: [] };

        let text = content;
        const chips = [];

        // 1. Extract Chips
        const chipRegex = /\[SUGGESTION: (.*?)\]/g;
        let match;
        while ((match = chipRegex.exec(content)) !== null) {
            chips.push(match[1].trim());
        }
        text = text.replace(chipRegex, "").trim();

        return { text, chips };
    };

    const { text: displayContent, chips } = isAI && !message.isLoading
        ? parseContent(message.content)
        : { text: message.content, chips: [] };

    return (
        <div
            className={`mb-6 flex ${isUser ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-500 group`}
        >
            <div
                className={`flex gap-3 max-w-[90%] xl:max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"
                    }`}
            >
                {/* Assistant Avatar - Larger & authoritative */}
                {isAI && (
                    <div className="flex-shrink-0 mt-1">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0E1117] to-[#161B22] border border-white/5 flex items-center justify-center shadow-lg group-hover:border-teal-500/30 transition-colors duration-300">
                            <span className="text-teal-400 font-bold text-lg">D</span>
                        </div>
                    </div>
                )}

                <div className={`flex flex-col space-y-1 ${isUser ? "items-end" : "items-start"}`}>
                    {/* Sender Name & Time */}
                    <div
                        className={`flex items-center gap-2 px-1 ${isUser ? "justify-end" : "justify-start"
                            }`}
                    >
                        <span className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                            {isAI ? "Dabby Consultant" : "You"}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono">{formattedTime}</span>
                    </div>

                    {/* Message Bubble struct */}
                    <div
                        className={`
              relative rounded-2xl px-6 py-5 shadow-sm
              ${isUser
                                ? "bg-[#161B22] text-white border border-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.1)]"
                                : "bg-[#0E1117] text-gray-200 border border-white/5"
                            }
              ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}
              backdrop-blur-sm
              transition-all duration-200
            `}
                    >
                        <div className="relative z-10 w-full">
                            {isUser ? (
                                // User Message - Simple text with system font
                                <div>
                                    <div
                                        className="text-base leading-relaxed font-normal break-words font-sans"
                                    >
                                        <HighlightedText text={message.content} highlight={searchTerm} />

                                        {/* Attached Files Display */}
                                        {(message.metadata?.files || message.options?.uploadedFiles) && (message.metadata?.files?.length > 0 || message.options?.uploadedFiles?.length > 0) && (
                                            <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/10">
                                                {(message.metadata?.files || message.options?.uploadedFiles || []).map((file, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-sm hover:border-teal-500/30 transition-colors"
                                                    >
                                                        <div className="w-8 h-8 rounded bg-teal-500/10 flex items-center justify-center text-teal-400">
                                                            {file.name.endsWith('.pdf') ? (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-white text-xs truncate max-w-[150px]">{file.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-mono">
                                                                {file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'File'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : message.isLoading ? (
                                // Loading / Thinking State
                                <ThinkingIndicator context={message.content.toLowerCase()} />
                            ) : (
                                // AI Message with Markdown
                                <div className="w-full">
                                    <div className="prose prose-invert max-w-none break-words prose-p:leading-relaxed prose-pre:bg-[#0D1117] prose-pre:border prose-pre:border-gray-800">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight, rehypeRaw]}
                                            components={{
                                                p: ({ children }) => <p><HighlightedText text={children} highlight={searchTerm} /></p>,
                                                li: ({ children }) => <li><HighlightedText text={children} highlight={searchTerm} /></li>,
                                                code({ node, inline, className, children, ...props }) {
                                                     const matchChart = /language-json-chart/.exec(className || '');
                                                     const matchScenario = /language-scenario-analysis/.exec(className || '');
                                                     if (!inline && matchChart) return <DabbyChart jsonString={String(children)} />;
                                                     if (!inline && matchScenario) return <DabbyScenarioTable jsonString={String(children)} />;
                                                     return inline ? (
                                                         <code className="bg-[#1C2128] text-teal-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                                             <HighlightedText text={children} highlight={searchTerm} />
                                                         </code>
                                                     ) : (
                                                         <code className={`${className} block bg-[#0D1117] p-4 rounded-lg overflow-x-auto text-sm leading-relaxed`} {...props}>{children}</code>
                                                     );
                                                 },
                                                table: ({ children }) => <div className="overflow-x-auto my-4 rounded-xl border border-white/5"><table className="min-w-full text-left">{children}</table></div>,
                                                thead: ({ children }) => <thead className="bg-[#1C2128] text-gray-200 border-b border-gray-700 font-bold">{children}</thead>,
                                                th: ({ children }) => <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-teal-400/90">{children}</th>,
                                                td: ({ children }) => <td className="px-4 py-3 border-b border-gray-800/50 text-sm opacity-90"><HighlightedText text={children} highlight={searchTerm} /></td>,
                                                a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-teal-400 hover:text-teal-300 underline underline-offset-4 decoration-teal-500/30">{children}</a>,
                                                blockquote: ({ children }) => <blockquote className="border-l-4 border-teal-500/50 pl-4 py-1.5 my-4 bg-teal-500/5 rounded-r text-gray-300 italic">{children}</blockquote>
                                            }}
                                        >
                                            {displayContent}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Suggestion Chips Section */}
                                    {chips.length > 0 && (
                                        <div className="mt-6 flex flex-wrap gap-2 animate-in fade-in duration-500 border-t border-white/5 pt-4">
                                            <span className="text-[10px] uppercase tracking-wider text-gray-500 w-full mb-1 ml-1 font-semibold">Suggested Actions:</span>
                                            {chips.map((chip, idx) => (
                                                <button
                                                    key={idx}
                                                    className="px-3.5 py-1.5 bg-teal-500/5 hover:bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 rounded-full text-xs font-medium text-teal-400 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 group/chip"
                                                    onClick={() => {
                                                        // Dispatch event for MainApp or ChatInput to handle
                                                        const event = new CustomEvent('suggestionClicked', { detail: chip });
                                                        window.dispatchEvent(event);
                                                    }}
                                                >
                                                    <span>{chip}</span>
                                                    <svg className="w-3 h-3 opacity-50 group-hover/chip:opacity-100 group-hover/chip:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default Message;
