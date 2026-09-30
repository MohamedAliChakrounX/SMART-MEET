import React, { useEffect, useRef, useMemo } from 'react';
import { Download } from 'lucide-react';
import { useMeeting } from '../../context/MeetingContext';

/**
 * DashboardRenderer — renders a Chart.js chart from a JSON config object.
 * Uses dynamic import of chart.js to keep the bundle lean when unused.
 * Dynamically adjusts color scheme based on current dark mode state.
 */
export default function DashboardRenderer({ config }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);
  const { darkMode } = useMeeting();

  // Memoize config to avoid unnecessary re-renders
  const stableConfig = useMemo(() => config, [JSON.stringify(config)]);

  useEffect(() => {
    if (!stableConfig || !canvasRef.current) return;

    let destroyed = false;

    (async () => {
      // Dynamic import to avoid bundling chart.js when ChatBot page isn't loaded
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      if (destroyed) return;

      // Destroy previous chart
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const ctx = canvasRef.current.getContext('2d');

      // Deep-clone config to avoid Chart.js mutation issues
      const chartConfig = JSON.parse(JSON.stringify(stableConfig));

      // Resolve theme colors
      const labelColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.7)';
      const titleColor = darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.9)';
      const ticksColor = darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.5)';
      const gridColor  = darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)';

      const isRadial = ['pie', 'doughnut', 'radar', 'polarArea'].includes(chartConfig.type);
      const isRadarOrPolar = ['radar', 'polarArea'].includes(chartConfig.type);

      // Force dynamic light/dark styling
      chartConfig.options = {
        ...(chartConfig.options || {}),
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...(chartConfig.options?.plugins || {}),
          legend: {
            ...(chartConfig.options?.plugins?.legend || {}),
            labels: {
              ...(chartConfig.options?.plugins?.legend?.labels || {}),
              color: labelColor,
              font: { size: 12 },
            },
          },
          title: {
            ...(chartConfig.options?.plugins?.title || {}),
            color: titleColor,
            font: { size: 14, weight: 600 },
          },
        },
        scales: isRadarOrPolar
          ? {
              r: {
                ticks: { color: ticksColor, backdropColor: 'transparent' },
                grid:  { color: gridColor },
                angleLines: { color: gridColor },
                pointLabels: { color: labelColor },
              },
            }
          : !isRadial
          ? {
              x: {
                ticks: { color: ticksColor },
                grid:  { color: gridColor },
              },
              y: {
                ticks: { color: ticksColor },
                grid:  { color: gridColor },
              },
            }
          : undefined,
      };

      chartRef.current = new Chart(ctx, chartConfig);
    })();

    return () => {
      destroyed = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [stableConfig, darkMode]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dashboard.png';
    a.click();
  };

  if (!config) return null;

  return (
    <div className="relative bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider font-medium">
          Dashboard
        </span>
        <button
          onClick={handleDownload}
          title="Télécharger en PNG"
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 
                     hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
        >
          <Download size={14} />
        </button>
      </div>
      <div className="relative h-64">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
