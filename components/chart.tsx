"use client";

import React, { useState, useMemo } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Ship } from "lucide-react";
import {
  calculatePPSCCBaselines,
  getPPFactors,
} from "../utils/calculate-pp-scc-baselines.util";
import emissionsData from "../data/daily-log-emissions.json";
import ppReferenceData from "../data/pp-reference.json";
import vesselsData from "../data/vessels.json";
import Decimal from "decimal.js";
import {
  avgDeviation,
  formatQuarter,
  getChartSeries,
  isQuarterEnd,
} from "@/utils";

const Chart = () => {
  const [selectedVessel, setSelectedVessel] = useState("all");

  const calculatedData = useMemo(() => {
    return vesselsData
      .map((vessel) => {
        const vesselEmissions = emissionsData.filter(
          (e) => e.VesselID === vessel.IMONo
        );

        const ppFactors = getPPFactors(ppReferenceData, vessel);

        const baselines = calculatePPSCCBaselines({
          factors: [ppFactors[0].minFactors, ppFactors[0].strFactors],
          year: 2024,
          DWT: new Decimal(vessel.MaxDeadWg),
        });

        const ppMinBaseline = Math.abs(baselines.min.toNumber());

        const quarterlyData = vesselEmissions
          .filter((emission) => isQuarterEnd(emission.TOUTC))
          .map((emission) => {
            const actualEmissions = emission.AERCO2eW2W;
            const deviation =
              ((actualEmissions - ppMinBaseline) / ppMinBaseline) * 100;

            return {
              vesselId: vessel.IMONo,
              quarter: formatQuarter(emission.TOUTC),
              quarterEnd: emission.TOUTC,
              deviation: parseFloat(deviation.toFixed(2)),
            };
          })
          .filter((d): d is NonNullable<typeof d> => d !== null);

        return {
          vessel,
          quarterlyData,
          avgDeviation: avgDeviation(quarterlyData),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null)
      .filter((v) => v.quarterlyData.length > 0);
  }, []);

  const allVesselsData = calculatedData.flatMap((v) => v.quarterlyData);

  const selectedData = allVesselsData.filter((d) => {
    return selectedVessel === "all" || d.vesselId.toString() === selectedVessel;
  });

  const availableVessels = vesselsData.filter((v) =>
    allVesselsData.some((d) => d.vesselId === v.IMONo)
  );

  const chartOptions: Highcharts.Options = {
    chart: {
      type: "line",
      height: 500,
    },
    title: {
      text: "Poseidon Principles Deviation Trend",
    },
    credits: {
      enabled: false,
    },
    legend: {
      enabled: true,
      layout: "horizontal",
      align: "center",
      verticalAlign: "bottom",
    },
    xAxis: {
      categories: [...new Set(selectedData.map((d) => d.quarter))].sort(),
      crosshair: true,
    },
    yAxis: {
      title: { text: "Deviation (%)" },
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
    series: getChartSeries(selectedData, availableVessels, selectedVessel),
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Chart;
