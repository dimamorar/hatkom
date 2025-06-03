"use client";

import React, { useState, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Ship, Calendar, Filter } from "lucide-react";
import {
  calculatePPSCCBaselines,
  getPPFactors,
} from "../utils/calculate-pp-scc-baselines.util";
import emissionsData from "../data/daily-log-emissions.json";
import ppReferenceData from "../data/pp-reference.json";
import vesselsData from "../data/vessels.json";
import Decimal from "decimal.js";

const Chart = () => {
  const [selectedVessel, setSelectedVessel] = useState("all");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  const [viewMode, setViewMode] = useState("deviation");

  const formatQuarter = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `Q${Math.ceil(month / 3)} ${year}`;
  };

  const isQuarterEnd = (toutc: string) => {
    const date = new Date(toutc);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return (
      (month === 3 && day === 31) || // Q1
      (month === 6 && day === 30) || // Q2
      (month === 9 && day === 30) || // Q3
      (month === 12 && day === 31)
    ); // Q4
  };

  // Process data to calculate PP deviations
  const calculatedData = useMemo(() => {
    return vesselsData
      .map((vessel) => {
        const vesselEmissions = emissionsData.filter(
          (e) => e.VesselID === vessel.IMONo
        );

        const ppFactors = getPPFactors(ppReferenceData, vessel);
        if (!ppFactors[0]) return null;

        // Get PP baselines for this vessel
        const baselines = calculatePPSCCBaselines({
          factors: [ppFactors[0].minFactors, ppFactors[0].strFactors],
          year: 2024,
          DWT: new Decimal(vessel.MaxDeadWg),
        });

        const ppMinBaseline = Math.abs(baselines.min.toNumber());

        // Filter for quarter-end dates and calculate deviations
        const quarterlyData = vesselEmissions
          .filter((emission) => isQuarterEnd(emission.TOUTC))
          .map((emission) => {
            const actualEmissions = emission.AERCO2eW2W;
            const deviation =
              ((actualEmissions - ppMinBaseline) / ppMinBaseline) * 100;

            return {
              vessel: vessel.Name,
              vesselId: vessel.IMONo,
              vesselType: vessel.VesselType,
              quarter: formatQuarter(emission.TOUTC),
              quarterEnd: emission.TOUTC,
              emissions: actualEmissions,
              baseline: ppMinBaseline,
              deviation: parseFloat(deviation.toFixed(2)),
              isCompliant: deviation <= 0,
              totalCO2: emission.TotT2WCO2,
              eeoiCO2e: emission.EEOICO2eW2W,
            };
          });

        return {
          vessel,
          quarterlyData,
          avgDeviation:
            quarterlyData.length > 0
              ? parseFloat(
                  (
                    quarterlyData.reduce((sum, q) => sum + q.deviation, 0) /
                    quarterlyData.length
                  ).toFixed(2)
                )
              : 0,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .filter((v) => v.quarterlyData.length > 0);
  }, []);

  // Flatten data for charts
  const flattenedData = calculatedData.flatMap((v) => v.quarterlyData);

  // Filter data based on selections
  const filteredData = flattenedData.filter((d) => {
    const vesselMatch =
      selectedVessel === "all" || d.vesselId.toString() === selectedVessel;
    const quarterMatch =
      selectedQuarter === "all" || d.quarter === selectedQuarter;
    return vesselMatch && quarterMatch;
  });

  // Get unique quarters and vessels for filters
  const quarters = [...new Set(flattenedData.map((d) => d.quarter))].sort();
  const availableVessels = vesselsData.filter((v) =>
    flattenedData.some((d) => d.vesselId === v.IMONo)
  );

  // Prepare Highcharts options based on view mode
  const getChartOptions = (): Highcharts.Options => {
    const commonOptions: Highcharts.Options = {
      chart: {
        type: viewMode === "comparison" ? "scatter" : "line",
        height: 400,
      },
      title: {
        text:
          viewMode === "deviation"
            ? "Poseidon Principles Deviation Trend"
            : viewMode === "emissions"
            ? "AER CO2e vs PP Baseline Comparison"
            : "AER CO2e Scatter Plot",
      },
      credits: {
        enabled: false,
      },
      tooltip: {
        shared: true,
      },
    };

    if (viewMode === "deviation") {
      return {
        ...commonOptions,
        xAxis: {
          categories: [...new Set(filteredData.map((d) => d.quarter))],
          title: { text: "Quarter" },
          crosshair: true,
        },
        yAxis: {
          title: { text: "Deviation (%)" },
          crosshair: true,
          plotLines: [
            {
              value: 0,
              color: "#ef4444",
              dashStyle: "Dash",
              width: 2,
              label: { text: "PP Baseline (0%)" },
            },
          ],
        },
        series: [
          {
            type: "line",
            name: "Deviation",
            data: filteredData.map((d) => d.deviation),
            color: "#3b82f6",
            marker: {
              enabled: true,
              radius: 4,
            },
          },
        ],
      };
    }

    if (viewMode === "emissions") {
      return {
        ...commonOptions,
        chart: {
          type: "column",
          height: 400,
        },
        xAxis: {
          categories: [...new Set(filteredData.map((d) => d.quarter))],
          title: { text: "Quarter" },
          crosshair: true,
        },
        yAxis: {
          title: { text: "AER CO2e (g/t·nm)" },
          crosshair: true,
        },
        series: [
          {
            type: "column",
            name: "Actual AER CO2e",
            data: filteredData.map((d) => d.emissions),
            color: "#10b981",
          },
          {
            type: "column",
            name: "PP Baseline",
            data: filteredData.map((d) => d.baseline),
            color: "#f59e0b",
          },
        ],
      };
    }

    return {
      ...commonOptions,
      xAxis: {
        title: { text: "Actual AER CO2e" },
        crosshair: true,
      },
      yAxis: {
        title: { text: "PP Baseline" },
        crosshair: true,
      },
      series: [
        {
          type: "scatter",
          name: "Vessels",
          data: filteredData.map((d) => [d.emissions, d.baseline]),
          color: "#3b82f6",
          marker: {
            radius: 6,
          },
        },
      ],
    };
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Ship className="w-5 h-5 text-blue-600" />
              <select
                value={selectedVessel}
                onChange={(e) => setSelectedVessel(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Vessels</option>
                {availableVessels.map((vessel) => (
                  <option key={vessel.IMONo} value={vessel.IMONo.toString()}>
                    {vessel.Name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Quarters</option>
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-purple-600" />
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="deviation">Deviation Trend</option>
                <option value="emissions">AER vs Baseline</option>
                <option value="comparison">AER Comparison</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <HighchartsReact
            highcharts={Highcharts}
            options={getChartOptions()}
          />
        </div>
      </div>
    </div>
  );
};

export default Chart;
